// Shared utility for calling Google Gemini API directly
// Used by all edge functions in CognitiveRadar

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
// Override with the GEMINI_MODEL secret when Google retires a model.
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";

export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }
  | { fileData: { fileUri: string; mimeType?: string } };

function toParts(content: string | GeminiPart[]): GeminiPart[] {
  return typeof content === "string" ? [{ text: content }] : content;
}

async function postGemini(body: unknown) {
  const apiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY");
  if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY is not configured");

  // Key goes in a header, not the URL, so it never shows up in request logs.
  const response = await fetch(`${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Gemini API error:", response.status, errText);
    if (response.status === 429) throw new Error("Rate limit exceeded, please try again later.");
    if (response.status === 403) throw new Error("Gemini API key is invalid or quota exceeded.");
    if (response.status === 404) throw new Error(`Gemini model "${GEMINI_MODEL}" not found. Set the GEMINI_MODEL secret.`);
    throw new Error(`Gemini API error: ${response.status}`);
  }
  return await response.json();
}

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
  userContent: string | GeminiPart[];
  tools: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
  forceTool?: string;
}): Promise<Record<string, unknown>> {
  const contents = [{ role: "user", parts: toParts(userContent) }];

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

  const data = await postGemini(body);
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
  multimodalParts?: GeminiPart[];
}): Promise<string> {
  const parts = multimodalParts ?? [{ text: prompt || "" }];

  const body: any = {
    contents: [{ role: "user", parts }],
  };

  if (systemPrompt) {
    body.system_instruction = { parts: [{ text: systemPrompt }] };
  }

  const data = await postGemini(body);
  // Join every text part (skipping model "thought" parts) instead of only the first.
  const out = (data.candidates?.[0]?.content?.parts || [])
    .filter((p: { text?: string; thought?: boolean }) => p.text && !p.thought)
    .map((p: { text: string }) => p.text)
    .join("");
  return out;
}
