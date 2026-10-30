import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { saveGraph } from "../_shared/save-graph.ts";
import { MAX_INLINE_BYTES, toBase64 } from "../_shared/base64.ts";
import { callGemini, callGeminiText } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a knowledge graph extraction engine. Given text content extracted from a document or transcribed from audio/video, extract:
1. **Nodes**: concepts, claims, assumptions, evidence, questions, and contradictions.
2. **Edges**: relationships between nodes (supports, contradicts, depends_on, example_of).
3. **Insights**: gaps in reasoning, contradictions, hidden assumptions, and open questions.

Use the tool provided.`;

const GRAPH_TOOL = {
  name: "extract_knowledge_graph",
  description: "Extract a structured knowledge graph from text",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "A short title (max 60 chars)" },
      nodes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            temp_id: { type: "string" },
            type: { type: "string", enum: ["concept", "claim", "assumption", "evidence", "question", "contradiction"] },
            label: { type: "string" },
            description: { type: "string" },
            confidence: { type: "number" },
          },
          required: ["temp_id", "type", "label", "description", "confidence"],
        },
      },
      edges: {
        type: "array",
        items: {
          type: "object",
          properties: {
            source: { type: "string" },
            target: { type: "string" },
            relation: { type: "string", enum: ["supports", "contradicts", "depends_on", "example_of"] },
            confidence: { type: "number" },
          },
          required: ["source", "target", "relation", "confidence"],
        },
      },
      insights: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["gap", "contradiction", "assumption", "question"] },
            severity: { type: "string", enum: ["high", "medium", "low"] },
            description: { type: "string" },
            related_temp_ids: { type: "array", items: { type: "string" } },
          },
          required: ["type", "severity", "description", "related_temp_ids"],
        },
      },
    },
    required: ["title", "nodes", "edges", "insights"],
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storagePath, fileName } = await req.json();

    if (!storagePath) {
      return new Response(
        JSON.stringify({ error: "storagePath is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download file from storage
    const { data: fileData, error: dlErr } = await supabase.storage.from("uploads").download(storagePath);
    if (dlErr) throw new Error("Failed to download file: " + dlErr.message);

    const ext = (fileName || storagePath).split(".").pop()?.toLowerCase() || "";
    const needsInline = ["pdf", "mp3", "wav", "m4a", "ogg", "webm", "mp4"].includes(ext);
    if (needsInline && fileData.size > MAX_INLINE_BYTES) {
      return new Response(
        JSON.stringify({ error: `File is ${(fileData.size / 1048576).toFixed(1)} MB; PDF and media files must be under 14 MB.` }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    let textContent = "";

    if (["txt", "md", "csv"].includes(ext)) {
      textContent = await fileData.text();
    } else if (ext === "pdf") {
      // Use Gemini multimodal for PDF extraction
      const base64 = toBase64(await fileData.arrayBuffer());
      textContent = await callGeminiText({
        multimodalParts: [
          { text: "Extract all text content from this PDF document. Return only the extracted text, no commentary." },
          { inlineData: { mimeType: "application/pdf", data: base64 } },
        ],
      });
    } else if (["mp3", "wav", "m4a", "ogg", "webm", "mp4"].includes(ext)) {
      // Use Gemini multimodal for audio/video transcription
      const base64 = toBase64(await fileData.arrayBuffer());
      const mimeMap: Record<string, string> = {
        mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4",
        ogg: "audio/ogg", webm: "audio/webm", mp4: "video/mp4",
      };
      textContent = await callGeminiText({
        multimodalParts: [
          { text: "Transcribe this audio/video file. Return only the transcript text." },
          { inlineData: { mimeType: mimeMap[ext] || "application/octet-stream", data: base64 } },
        ],
      });
    } else {
      textContent = await fileData.text();
    }

    if (!textContent || textContent.trim().length < 20) {
      return new Response(
        JSON.stringify({ error: "Could not extract enough text from this file. Try a different format." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract knowledge graph
    const graph = await callGemini({
      systemPrompt: SYSTEM_PROMPT,
      userContent: `Analyze this content and extract the knowledge graph:\n\n${textContent.slice(0, 15000)}`,
      tools: [GRAPH_TOOL],
      forceTool: "extract_knowledge_graph",
    }) as any;

    const saved = await saveGraph(
      supabase,
      { title: graph.title || fileName || "File Analysis", input_type: "upload", raw_content: textContent.slice(0, 50000) },
      graph, { totalChars: textContent.length, analyzedChars: Math.min(textContent.length, 15000) },
    );

    return new Response(
      JSON.stringify({
        sessionId: saved.sessionId,
        title: saved.title,
        nodeCount: saved.validation.nodes.saved,
        edgeCount: saved.validation.edges.saved,
        insightCount: saved.validation.insights.saved,
        validation: saved.validation,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("analyze-upload error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
