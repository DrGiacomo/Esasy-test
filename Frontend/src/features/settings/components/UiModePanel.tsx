import { useState } from 'react';
import { authApi } from '@/features/auth/auth.api';
import { useUiMode } from '@/hooks/useUiMode';
import { useAuthStore } from '@/store/auth.store';
import type { UiMode } from '@/types/models';

/**
 * El interruptor entre los dos modos.
 *
 * Vive en los ajustes de la cuenta y no en una preferencia del navegador porque es del
 * usuario, no del equipo desde el que entra: quien lo pone en complejo lo quiere en
 * complejo también mañana y desde su portátil.
 *
 * Nadie puede cambiárselo a otro. El endpoint solo toca el usuario del token.
 */

const OPCIONES: { valor: UiMode; titulo: string; texto: string }[] = [
  {
    valor: 'SENCILLO',
    titulo: 'Sencillo',
    texto:
      'Las pruebas se leen como frases: «Pulsar «Entrar»». Sin selectores, sin código generado, sin Git. El detalle técnico de cada paso sigue estando a un clic.',
  },
  {
    valor: 'COMPLEJO',
    titulo: 'Complejo',
    texto:
      'Todo a la vista: selectores y su tipo, el código TypeScript generado, la sincronización con Git y las trazas de cada ejecución.',
  },
];

export function UiModePanel() {
  const { modo } = useUiMode();
  const setUiMode = useAuthStore((s) => s.setUiMode);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cambiar(valor: UiMode) {
    if (valor === modo || guardando) return;
    const anterior = modo;

    // Optimista: el cambio se ve al instante y se revierte si el servidor dice que no.
    // Esperar a la respuesta para pintar un interruptor lo hace sentir roto.
    setUiMode(valor);
    setGuardando(true);
    setError(null);
    try {
      const yo = await authApi.setUiMode(valor);
      setUiMode(yo.uiMode);
    } catch {
      setUiMode(anterior);
      setError('No se pudo guardar el cambio. Inténtalo otra vez.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h2 className="mb-1 text-sm font-semibold text-tinta-900">Cómo quieres ver la plataforma</h2>
      <p className="mb-4 text-sm text-tinta-500">
        Solo afecta a tu cuenta. Puedes cambiarlo cuando quieras y no se pierde nada al hacerlo.
      </p>

      <div className="space-y-3">
        {OPCIONES.map((o) => {
          const activo = modo === o.valor;
          return (
            <button
              key={o.valor}
              type="button"
              onClick={() => void cambiar(o.valor)}
              disabled={guardando}
              aria-pressed={activo}
              className={`w-full rounded-lg border p-4 text-left transition-colors disabled:opacity-60 ${
                activo
                  ? 'border-oro-500 bg-sangre-50 ring-2 ring-sangre-200'
                  : 'border-tinta-300 bg-tinta-50 hover:border-tinta-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`h-4 w-4 shrink-0 rounded-full border-4 ${
                    activo ? 'border-sangre-600 bg-tinta-50' : 'border-tinta-300 bg-tinta-50'
                  }`}
                />
                <span className="text-sm font-medium text-tinta-900">{o.titulo}</span>
                {activo && <span className="text-xs text-sangre-600">· activo</span>}
              </div>
              <p className="ml-6 mt-1 text-sm text-tinta-600">{o.texto}</p>
            </button>
          );
        })}
      </div>

      {error && <p className="mt-3 text-sm text-fallo-500">{error}</p>}
    </div>
  );
}
