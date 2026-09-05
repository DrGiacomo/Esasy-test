import { useAuthStore } from '@/store/auth.store';
import type { UiMode } from '@/types/models';

/**
 * El modo de interfaz del usuario actual.
 *
 * `sencillo` es lo que preguntan los componentes. Se devuelve así, y no `modo === 'X'`
 * repartido por todas partes, para que la condición viva en un sitio: el día que haya que
 * cambiar qué cuenta como sencillo, se cambia aquí y no en catorce componentes.
 *
 * Sin sesión, sencillo. Errar hacia sencillo es errar de menos.
 */
export function useUiMode(): { modo: UiMode; sencillo: boolean; complejo: boolean } {
  const modo = useAuthStore((s) => s.user?.uiMode ?? 'SENCILLO');
  return { modo, sencillo: modo === 'SENCILLO', complejo: modo === 'COMPLEJO' };
}
