import { useState } from 'react';
import type { ResumenDelFlujo } from '../hooks/useResumenDelFlujo';

/**
 * El diagrama del flujo: nodos, flechas y transiciones etiquetadas.
 *
 * Sale del diagrama de proceso de Alma. Lo que se copia de allí es la forma de contar un
 * proceso —cajas con su estado, flechas con lo que hace que se avance, y las vueltas atrás
 * dibujadas igual que las idas—. Lo que cambia es que este **lee la base**: cada caja dice
 * cuántas cosas hay paradas ahí ahora mismo.
 *
 * Es SVG a mano y sin librería. Una de diagramas pesa entre 90 y 300 KB y trae un motor de
 * colocación automática que aquí no hace falta: son seis nodos y sus posiciones no cambian.
 *
 * ─── Qué se puede hacer con él ───
 *   · Pulsar un nodo lo selecciona: se resalta con sus flechas y el resto se apaga.
 *   · Se recorre con Tab y se activa con Enter o Espacio — son botones de verdad.
 *   · Pulsar fuera, o Escape, deselecciona.
 */

interface Props {
  resumen: ResumenDelFlujo;
  /** El nodo seleccionado, para que la página pueda enseñar su detalle. */
  seleccionado: string | null;
  onSeleccionar: (id: string | null) => void;
}

interface Nodo {
  id: string;
  titulo: string;
  x: number;
  y: number;
  area: 'persona' | 'plataforma' | 'cola' | 'contenedor' | 'ia';
  /** La cifra grande: lo que hay parado aquí. */
  cifra: number;
  /** Qué significa esa cifra. */
  pie: string;
  /** Si la cifra pide atención (cosas esperando a alguien). */
  alerta?: boolean;
}

interface Flecha {
  de: string;
  a: string;
  etiqueta: string;
  /** Camino de vuelta: se dibuja por debajo y a trazos. */
  vuelta?: boolean;
}

const ANCHO = 200;
const ALTO = 96;

const COLOR_AREA: Record<Nodo['area'], string> = {
  persona: 'var(--color-oro-500)',
  plataforma: 'var(--color-ocre-500)',
  cola: 'var(--color-espera-500)',
  contenedor: 'var(--color-sangre-500)',
  ia: 'var(--color-paso-500)',
};

function construir(r: ResumenDelFlujo): { nodos: Nodo[]; flechas: Flecha[] } {
  const nodos: Nodo[] = [
    { id: 'grabar', titulo: 'Grabas', x: 20, y: 40, area: 'persona', cifra: r.grabaciones.total, pie: 'grabaciones' },
    { id: 'prueba', titulo: 'Prueba', x: 340, y: 40, area: 'plataforma', cifra: r.pruebas.activas, pie: `activas · ${r.pruebas.borrador} en borrador`, alerta: r.pruebas.borrador > 0 },
    { id: 'cola', titulo: 'En cola', x: 660, y: 40, area: 'cola', cifra: r.ejecuciones.enCola + r.ejecuciones.preparando, pie: 'esperando turno' },
    { id: 'contenedor', titulo: 'Ejecutando', x: 980, y: 40, area: 'contenedor', cifra: r.ejecuciones.ejecutando + r.ejecuciones.recogiendo, pie: 'en marcha ahora' },
    { id: 'resultado', titulo: 'Resultado', x: 980, y: 230, area: 'plataforma', cifra: r.ejecuciones.terminadas, pie: `terminadas · ${r.ejecuciones.fallidas} fallidas`, alerta: r.ejecuciones.fallidas > 0 },
    { id: 'reparar', titulo: 'Reparación', x: 520, y: 230, area: 'ia', cifra: r.reparaciones.pendientes, pie: 'esperan tu visto bueno', alerta: r.reparaciones.pendientes > 0 },
  ];

  const flechas: Flecha[] = [
    { de: 'grabar', a: 'prueba', etiqueta: 'convertir' },
    { de: 'prueba', a: 'cola', etiqueta: 'ejecutar' },
    { de: 'cola', a: 'contenedor', etiqueta: 'hay sitio' },
    { de: 'contenedor', a: 'resultado', etiqueta: 'al terminar' },
    { de: 'resultado', a: 'reparar', etiqueta: 'si falló' },
    { de: 'reparar', a: 'prueba', etiqueta: 'aprobada', vuelta: true },
  ];

  return { nodos, flechas };
}

/** El camino entre dos nodos, saliendo y entrando por el lado que toca. */
function camino(a: Nodo, b: Nodo): string {
  const mismaFila = a.y === b.y;

  if (mismaFila) {
    const x1 = a.x + ANCHO;
    const x2 = b.x;
    const y = a.y + ALTO / 2;
    return `M ${x1} ${y} L ${x2 - 8} ${y}`;
  }

  // Bajada por la derecha (ejecutando → resultado)
  if (a.x === b.x) {
    const x = a.x + ANCHO / 2;
    return `M ${x} ${a.y + ALTO} L ${x} ${b.y - 8}`;
  }

  // Camino de vuelta: sale por abajo, cruza a la izquierda y sube
  if (b.x < a.x) {
    const x1 = a.x;
    const y1 = a.y + ALTO / 2;
    const x2 = b.x + ANCHO / 2;
    const y2 = b.y + ALTO;
    return `M ${x1} ${y1} L ${x2 + 60} ${y1} Q ${x2} ${y1} ${x2} ${y1 - 40} L ${x2} ${y2 + 8}`;
  }

  // Derecha y arriba/abajo
  const x1 = a.x + ANCHO;
  const y1 = a.y + ALTO / 2;
  const x2 = b.x + ANCHO / 2;
  return `M ${x1} ${y1} L ${x2} ${y1} L ${x2} ${b.y - 8}`;
}

export function DiagramaFlujo({ resumen, seleccionado, onSeleccionar }: Props) {
  const [encima, setEncima] = useState<string | null>(null);
  const { nodos, flechas } = construir(resumen);
  const activo = seleccionado ?? encima;

  const porId = Object.fromEntries(nodos.map((n) => [n.id, n]));
  const tocado = (id: string) =>
    !activo || activo === id || flechas.some((f) => (f.de === activo && f.a === id) || (f.a === activo && f.de === id));

  return (
    <div className="overflow-x-auto rounded-xl border border-linea bg-superficie p-4">
      <svg
        viewBox="0 0 1210 360"
        className="h-auto w-full min-w-[900px]"
        role="img"
        aria-label="Diagrama del recorrido de una prueba"
        onClick={(e) => {
          // Pulsar el fondo deselecciona: si no, la única forma de salir es acertar otra vez
          // en el mismo nodo, y eso nadie lo adivina.
          if (e.target === e.currentTarget) onSeleccionar(null);
        }}
      >
        <defs>
          <marker id="punta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-texto-tenue)" />
          </marker>
          <marker id="punta-viva" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-oro-500)" />
          </marker>
        </defs>

        {flechas.map((f) => {
          const a = porId[f.de];
          const b = porId[f.a];
          const viva = activo === f.de || activo === f.a;
          const apagada = activo && !viva;
          const d = camino(a, b);
          // La etiqueta va en el punto medio del tramo recto
          const mx = a.y === b.y ? (a.x + ANCHO + b.x) / 2 : a.x === b.x ? a.x + ANCHO / 2 + 6 : (a.x + b.x) / 2;
          const my = a.y === b.y ? a.y + ALTO / 2 - 8 : a.x === b.x ? (a.y + ALTO + b.y) / 2 : a.y + ALTO / 2 - 8;
          return (
            <g key={`${f.de}-${f.a}`} opacity={apagada ? 0.22 : 1} style={{ transition: 'opacity 180ms' }}>
              <path
                d={d}
                fill="none"
                stroke={viva ? 'var(--color-oro-500)' : 'var(--color-texto-tenue)'}
                strokeWidth={viva ? 2 : 1.2}
                strokeDasharray={f.vuelta ? '5 4' : undefined}
                markerEnd={`url(#${viva ? 'punta-viva' : 'punta'})`}
                style={{ transition: 'stroke 180ms, stroke-width 180ms' }}
              />
              {/* La línea pasa por detrás del texto: sin este fondo, el trazo lo cruza
                  por la mitad y no se lee ninguna de las dos cosas. */}
              <rect
                x={mx - f.etiqueta.length * 3.1 - 5}
                y={my - 9}
                width={f.etiqueta.length * 6.2 + 10}
                height={13}
                rx={3}
                fill="var(--color-superficie)"
              />
              <text
                x={mx}
                y={my}
                textAnchor="middle"
                className="fill-[var(--color-texto-tenue)] font-mono"
                fontSize="10"
                letterSpacing="0.06em"
              >
                {f.etiqueta}
              </text>
            </g>
          );
        })}

        {nodos.map((n) => {
          const esActivo = activo === n.id;
          const apagado = activo && !tocado(n.id);
          return (
            <g
              key={n.id}
              opacity={apagado ? 0.3 : 1}
              style={{ transition: 'opacity 180ms' }}
              onMouseEnter={() => setEncima(n.id)}
              onMouseLeave={() => setEncima(null)}
            >
              <foreignObject x={n.x} y={n.y} width={ANCHO} height={ALTO}>
                <button
                  type="button"
                  aria-pressed={seleccionado === n.id}
                  onClick={() => onSeleccionar(seleccionado === n.id ? null : n.id)}
                  className="flex h-full w-full flex-col justify-between rounded-lg border border-l-4 bg-superficie px-3 py-2 text-left transition-transform duration-[120ms] hover:-translate-y-px"
                  style={{
                    borderColor: 'var(--color-linea)',
                    borderLeftColor: COLOR_AREA[n.area],
                    boxShadow: esActivo ? `0 0 0 2px ${COLOR_AREA[n.area]}` : undefined,
                  }}
                >
                  <span className="text-xs font-semibold text-texto">{n.titulo}</span>
                  <span className="flex items-baseline gap-1.5">
                    <span
                      className="font-mono text-xl tabular-nums"
                      style={{ color: n.alerta ? 'var(--color-espera-500)' : 'var(--color-texto)' }}
                    >
                      {n.cifra}
                    </span>
                    <span className="text-[10px] leading-tight text-texto-tenue">{n.pie}</span>
                  </span>
                </button>
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
