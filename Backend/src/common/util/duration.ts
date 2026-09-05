/**
 * Duraciones en el formato de `@nestjs/jwt` / `ms`: `900`, `'30s'`, `'15m'`, `'24h'`, `'7d'`.
 *
 * Existe porque había dos lecturas distintas del mismo formato y ninguna lo entendía:
 * `expiresIn: 900` estaba quemado en la respuesta de login (ignoraba `JWT_EXPIRES_IN`)
 * y `refreshExpiry()` hacía `parseInt(expiry.replace('d', ''))`, con lo que `'24h'`
 * se convertía en 24 DÍAS. Un solo parser, usado por los dos.
 */

const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
  w: 604800,
};

/**
 * Convierte una duración a segundos. Devuelve `fallbackSeconds` si el valor
 * falta o no se entiende — nunca lanza: esto se usa en el camino de login.
 */
export function parseDurationToSeconds(
  value: string | number | undefined | null,
  fallbackSeconds: number,
): number {
  if (value === undefined || value === null || value === '') return fallbackSeconds;

  // Un número suelto (o una cadena de solo dígitos) ya son segundos: es lo que hace `ms`.
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallbackSeconds;
  }

  const match = /^(\d+(?:\.\d+)?)\s*(s|m|h|d|w)?$/i.exec(value.trim());
  if (!match) return fallbackSeconds;

  const amount = parseFloat(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return fallbackSeconds;

  const unit = (match[2] ?? 's').toLowerCase();
  return Math.floor(amount * UNIT_SECONDS[unit]);
}

/** Igual que `parseDurationToSeconds`, en milisegundos. */
export function parseDurationToMs(
  value: string | number | undefined | null,
  fallbackSeconds: number,
): number {
  return parseDurationToSeconds(value, fallbackSeconds) * 1000;
}
