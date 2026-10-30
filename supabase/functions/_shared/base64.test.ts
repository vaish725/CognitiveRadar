// Run: deno test supabase/functions/_shared/base64.test.ts
import { toBase64 } from "./base64.ts";

Deno.test("encodes a 5 MB buffer without overflowing the call stack", () => {
  const bytes = new Uint8Array(5 * 1024 * 1024).map((_, i) => i % 256);
  const encoded = toBase64(bytes);
  const decoded = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  if (decoded.length !== bytes.length || decoded[123457] !== bytes[123457]) {
    throw new Error("round trip failed");
  }
});

Deno.test("matches btoa on small input", () => {
  const text = "CognitiveRadar";
  if (toBase64(new TextEncoder().encode(text)) !== btoa(text)) throw new Error("mismatch");
});
