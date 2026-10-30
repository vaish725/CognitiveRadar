// Base64-encode binary data of any size.
//
// The previous one-liner, btoa(String.fromCharCode(...bytes)), passed every byte
// as a separate function argument and crashed with "Maximum call stack size
// exceeded" on files of a few hundred KB. This converts in fixed-size chunks.

const CHUNK = 0x8000; // 32 KB per String.fromCharCode call

export function toBase64(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
  }
  return btoa(binary);
}

/** Inline Gemini requests are capped at ~20 MB, and base64 adds ~33%. */
export const MAX_INLINE_BYTES = 14 * 1024 * 1024;
