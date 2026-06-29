import axios from 'axios';

export interface RetryOptions {
  /** Reintentos adicionales tras el primer intento (total = retries + 1). */
  retries?: number;
  /** Base del backoff exponencial en ms. */
  baseDelayMs?: number;
}

/** ¿Merece la pena reintentar este error HTTP? 429, 5xx y errores de red/timeout. */
export function isRetryableHttpError(err: unknown): boolean {
  if (axios.isAxiosError(err)) {
    if (!err.response) return true; // sin respuesta: timeout/ECONNRESET/DNS, etc.
    const status = err.response.status;
    return status === 429 || status >= 500;
  }
  return false;
}

/**
 * Ejecuta `fn` con reintentos y backoff exponencial + jitter. Solo reintenta si
 * `shouldRetry(err)` es true. Propaga el último error al agotar los intentos.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  shouldRetry: (err: unknown) => boolean,
  opts: RetryOptions = {},
): Promise<T> {
  const retries = opts.retries ?? 2;
  const base = opts.baseDelayMs ?? 500;

  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries || !shouldRetry(err)) throw err;
      const delay = base * 2 ** attempt + Math.random() * base;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
