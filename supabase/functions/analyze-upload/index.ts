import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
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
    let textContent = "";

    if (["txt", "md", "csv"].includes(ext)) {
      textContent = await fileData.text();
    } else if (ext === "pdf") {
      // Use Gemini multimodal for PDF extraction
      const base64 = btoa(String.fromCharCode(...new Uint8Array(await fileData.arrayBuffer())));
      textContent = await callGeminiText({
        multimodalParts: [
          { text: "Extract all text content from this PDF document. Return only the extracted text, no commentary." },
          { inlineData: { mimeType: "application/pdf", data: base64 } },
        ],
      });
    } else if (["mp3", "wav", "m4a", "ogg", "webm", "mp4"].includes(ext)) {
      // Use Gemini multimodal for audio/video transcription
      const base64 = btoa(String.fromCharCode(...new Uint8Array(await fileData.arrayBuffer())));
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

    // Create session
    const { data: session, error: sessionErr } = await supabase
      .from("sessions")
      .insert({ title: graph.title || fileName || "File Analysis", input_type: "upload", raw_content: textContent.slice(0, 50000) })
      .select("id")
      .single();
    if (sessionErr) throw sessionErr;
    const sid = session.id;

    // Insert nodes
    const tempToReal: Record<string, string> = {};
    if (graph.nodes?.length) {
      const { data: insertedNodes, error: nodesErr } = await supabase
        .from("nodes")
        .insert(graph.nodes.map((n: any) => ({
          session_id: sid, type: n.type, label: n.label, description: n.description, confidence: n.confidence,
        })))
        .select("id");
      if (nodesErr) throw nodesErr;
      graph.nodes.forEach((n: any, i: number) => { tempToReal[n.temp_id] = insertedNodes[i].id; });
    }

    if (graph.edges?.length) {
      const valid = graph.edges.filter((e: any) => tempToReal[e.source] && tempToReal[e.target]);
      if (valid.length) {
        await supabase.from("edges").insert(valid.map((e: any) => ({
          session_id: sid, source_node_id: tempToReal[e.source], target_node_id: tempToReal[e.target],
          relation: e.relation, confidence: e.confidence,
        })));
      }
    }

    if (graph.insights?.length) {
      await supabase.from("insights").insert(graph.insights.map((i: any) => ({
        session_id: sid, type: i.type, severity: i.severity, description: i.description,
        related_node_ids: (i.related_temp_ids || []).map((t: string) => tempToReal[t]).filter(Boolean),
      })));
    }

    return new Response(
      JSON.stringify({
        sessionId: sid, title: graph.title || fileName,
        nodeCount: graph.nodes?.length || 0, edgeCount: graph.edges?.length || 0,
        insightCount: graph.insights?.length || 0,
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
