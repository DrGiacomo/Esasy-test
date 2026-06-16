/**
 * Parsea de forma robusta el JSON devuelto por un LLM: tolera bloques de código
 * markdown (```json ... ```) y lanza un error claro si el contenido no es JSON válido.
 */
export function parseAiJson<T>(content: string): T {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error('AI provider returned malformed JSON');
  }
}
