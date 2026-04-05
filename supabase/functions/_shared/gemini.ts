// Shared utility for calling Google Gemini API directly
// Used by all edge functions in CognitiveRadar

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MODEL = "gemini-2.5-flash";

export interface GeminiToolCall {
  name: string;
  args: Record<string, unknown>;
}

/**
 * Call Google Gemini API with function calling (tool use).
 * Returns the parsed arguments from the first function call.
 */
export async function callGemini({
  systemPrompt,
  userContent,
  tools,
  forceTool,
}: {
  systemPrompt: string;
  userContent: string | Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
  tools: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
  forceTool?: string;
}): Promise<Record<string, unknown>> {
  const apiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY");
  if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY is not configured");

  // Build contents
  const contents: any[] = [];
  
  if (typeof userContent === "string") {
    contents.push({ role: "user", parts: [{ text: userContent }] });
  } else {
    contents.push({ role: "user", parts: userContent.map(p => {
      if (p.text) return { text: p.text };
      if (p.inlineData) return { inlineData: p.inlineData };
      return p;
    })});
  }

  const body: any = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    tools: [{
      functionDeclarations: tools.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      })),
    }],
  };

  if (forceTool) {
    body.tool_config = {
      function_calling_config: {
        mode: "ANY",
        allowed_function_names: [forceTool],
      },
    };
  }

  const url = `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Gemini API error:", response.status, errText);
    if (response.status === 429) throw new Error("Rate limit exceeded, please try again later.");
    if (response.status === 403) throw new Error("Gemini API key is invalid or quota exceeded.");
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  if (!candidate) throw new Error("No response from Gemini");

  // Extract function call
  const parts = candidate.content?.parts || [];
  const fnCall = parts.find((p: any) => p.functionCall);
  if (!fnCall?.functionCall) {
    // If no function call, try to extract from text
    const textPart = parts.find((p: any) => p.text);
    if (textPart) {
      try {
        return JSON.parse(textPart.text);
      } catch {
        throw new Error("Gemini did not return a function call or valid JSON");
      }
    }
    throw new Error("No function call in Gemini response");
  }

  return fnCall.functionCall.args;
}

/**
 * Simple text completion without function calling.
 */
export async function callGeminiText({
  prompt,
  systemPrompt,
  multimodalParts,
}: {
  prompt?: string;
  systemPrompt?: string;
  multimodalParts?: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
}): Promise<string> {
  const apiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY");
  if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY is not configured");

  const parts = multimodalParts
    ? multimodalParts.map(p => {
        if (p.text) return { text: p.text };
        if (p.inlineData) return { inlineData: p.inlineData };
        return p;
      })
    : [{ text: prompt || "" }];

  const body: any = {
    contents: [{ role: "user", parts }],
  };

  if (systemPrompt) {
    body.system_instruction = { parts: [{ text: systemPrompt }] };
  }

  const url = `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Gemini API error:", response.status, errText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}
