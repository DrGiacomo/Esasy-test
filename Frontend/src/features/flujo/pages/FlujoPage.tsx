import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Video, FileText, Play, Container, Sparkles, RefreshCw } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ROUTES } from '@/router/routes';
import { useResumenDelFlujo, type ResumenDelFlujo } from '../hooks/useResumenDelFlujo';
import { DiagramaFlujo } from '../components/DiagramaFlujo';

/** Quién hace cada cosa. El área es tan informativa como el estado. */
const AREAS = {
  persona: { nombre: 'Lo haces tú', icono: Video, clase: 'border-oro-500' },
  plataforma: { nombre: 'La plataforma', icono: FileText, clase: 'border-ocre-500' },
  cola: { nombre: 'La cola', icono: Play, clase: 'border-espera-500' },
  contenedor: { nombre: 'Un contenedor', icono: Container, clase: 'border-sangre-500' },
  ia: { nombre: 'La IA, con tu visto bueno', icono: Sparkles, clase: 'border-paso-500' },
} as const;

type Area = keyof typeof AREAS;

interface Parada {
  id: string;
  titulo: string;
  explica: string;
  area: Area;
  /** Lo que hay parado aquí ahora mismo. */
  cuentas: { etiqueta: string; valor: number; tono?: 'paso' | 'fallo' | 'espera' }[];
  /** Lo que hace que se pase a la siguiente. */
  transicion?: string;
  enlace?: string;
}

function construirParadas(r: ResumenDelFlujo): Parada[] {
  return [
    {
      id: 'grabar',
      titulo: 'Grabas el recorrido',
      explica: 'Abres el navegador remoto y haces con el ratón lo que quieres probar.',
      area: 'persona',
      cuentas: [{ etiqueta: 'grabaciones', valor: r.grabaciones.total }],
      transicion: 'al convertirla',
      enlace: ROUTES.RECORDER,
    },
    {
      id: 'prueba',
      titulo: 'Se convierte en prueba',
      explica: 'Los clics se vuelven pasos con nombre. Nace en borrador y no se ejecuta hasta que la activas.',
      area: 'plataforma',
      cuentas: [
        { etiqueta: 'en borrador', valor: r.pruebas.borrador, tono: 'espera' },
        { etiqueta: 'activas', valor: r.pruebas.activas, tono: 'paso' },
        { etiqueta: 'archivadas', valor: r.pruebas.archivadas },
      ],
      transicion: 'al darle a ejecutar',
    },
    {
      id: 'cola',
      titulo: 'Entra en la cola',
      explica: 'Ejecutar tarda minutos, así que se encola. Aquí se puede cancelar.',
      area: 'cola',
      cuentas: [
        { etiqueta: 'esperando', valor: r.ejecuciones.enCola, tono: 'espera' },
        { etiqueta: 'preparando', valor: r.ejecuciones.preparando, tono: 'espera' },
      ],
      transicion: 'cuando hay sitio',
    },
    {
      id: 'ejecutar',
      titulo: 'Corre en un contenedor',
      explica: 'Un navegador aislado repite los pasos. Lo de un cliente no ve lo de otro.',
      area: 'contenedor',
      cuentas: [
        { etiqueta: 'ejecutando', valor: r.ejecuciones.ejecutando, tono: 'espera' },
        { etiqueta: 'recogiendo', valor: r.ejecuciones.recogiendo, tono: 'espera' },
      ],
      transicion: 'al terminar',
      enlace: ROUTES.EXECUTIONS,
    },
    {
      id: 'resultado',
      titulo: 'Queda el resultado',
      explica: 'Con vídeo, capturas y traza. Sin evidencia no es un resultado: es una opinión.',
      area: 'plataforma',
      cuentas: [
        { etiqueta: 'terminadas', valor: r.ejecuciones.terminadas, tono: 'paso' },
        { etiqueta: 'fallidas', valor: r.ejecuciones.fallidas, tono: 'fallo' },
        { etiqueta: 'canceladas', valor: r.ejecuciones.canceladas },
      ],
      transicion: 'si falló por un selector',
      enlace: ROUTES.EXECUTIONS,
    },
    {
      id: 'reparar',
      titulo: 'La IA propone el arreglo',
      explica: 'Si un selector dejó de encontrar nada, propone otro. Propone: no lo aplica.',
      area: 'ia',
      cuentas: [
        { etiqueta: 'esperando tu visto bueno', valor: r.reparaciones.pendientes, tono: 'espera' },
        { etiqueta: 'aprobadas', valor: r.reparaciones.aprobadas, tono: 'paso' },
        { etiqueta: 'rechazadas', valor: r.reparaciones.rechazadas },
      ],
      transicion: 'vuelve a la prueba',
    },
  ];
}

const tonoClase: Record<string, string> = {
  paso: 'text-paso-500',
  fallo: 'text-fallo-500',
  espera: 'text-espera-500',
};

/**
 * El diagrama del flujo: el paso a paso del producto, y cuántas cosas hay paradas en cada
 * punto ahora mismo.
 *
 * Sale del diagrama de proceso de Alma, con la lógica de aquí: allí las paradas son estados
 * de un requerimiento y aquí son los seis puntos por los que pasa una prueba. Y con una
 * diferencia que importa: **el de Alma dibuja el proceso; este además lo cuenta**. Un
 * diagrama sin números explica cómo funciona la herramienta una vez; con números, dice qué
 * está pasando hoy, y eso se mira todos los días.
 *
 * El color del borde no decora: dice QUIÉN hace cada paso. Es la otra mitad de la pregunta
 * —qué está en qué estado, y de quién depende que avance—.
 */
export default function FlujoPage() {
  const { datos: resumen, error, cargando, recargar } = useResumenDelFlujo();
  const [seleccionado, setSeleccionado] = useState<string | null>(null);

  if (cargando && !resumen) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !resumen) {
    return (
      <p className="rounded-lg border border-fallo-500/40 bg-fallo-100 px-4 py-3 text-sm text-fallo-500">
        No se pudo leer el estado del flujo: {error}
      </p>
    );
  }

  const paradas = resumen ? construirParadas(resumen) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-texto">Flujo</h1>
          <p className="mt-1 max-w-2xl text-sm text-texto-tenue">
            El recorrido de una prueba, de punta a punta, con lo que hay parado en cada punto
            ahora mismo. El color del borde dice <strong className="text-texto">quién</strong>{' '}
            hace que avance.
          </p>
        </div>
        <button
          onClick={recargar}
          className="inline-flex items-center gap-2 rounded-lg border border-linea bg-superficie px-3 py-1.5 text-sm text-texto-tenue transition-colors duration-[180ms] hover:bg-superficie-2 hover:text-texto"
        >
          <RefreshCw size={14} className={cargando ? 'animate-spin' : undefined} />
          Actualizar
        </button>
      </div>

      {/* Leyenda de áreas: sin ella, los colores del borde son adorno */}
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {Object.entries(AREAS).map(([clave, { nombre, icono: Icono, clase }]) => (
          <span key={clave} className="flex items-center gap-2 text-xs text-texto-tenue">
            <span className={`h-3 w-0.5 rounded-full border-l-2 ${clase}`} />
            <Icono size={13} />
            {nombre}
          </span>
        ))}
      </div>

      {resumen && (
        <DiagramaFlujo
          resumen={resumen}
          seleccionado={seleccionado}
          onSeleccionar={setSeleccionado}
        />
      )}

      {/*
        Las fichas de abajo son el detalle. Al elegir un nodo del diagrama se queda solo el
        suyo: el diagrama dice DÓNDE está la cosa y la ficha dice QUÉ pasa ahí. Enseñar las
        seis a la vez debajo del diagrama era contar lo mismo dos veces.
      */}
      {seleccionado && (
        <p className="text-xs text-texto-tenue">
          Mostrando el paso seleccionado.{' '}
          <button
            onClick={() => setSeleccionado(null)}
            className="font-medium text-ocre-500 underline-offset-2 hover:underline"
          >
            Ver los seis
          </button>
        </p>
      )}

      {/*
        Fichas compactas. El diagrama de arriba ya cuenta el recorrido y las transiciones,
        así que aquí sobraba repetirlo: se quedan el título, las cuentas y poco más. La
        explicación larga solo aparece en la ficha que elijas, que es cuando la quieres.
      */}
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {paradas
          .filter((p) => !seleccionado || p.id === seleccionado)
          .map((parada, i) => {
            const area = AREAS[parada.area];
            const Icono = area.icono;
            const elegida = seleccionado === parada.id;
            return (
              <li key={parada.id}>
                <article
                  className={`flex h-full flex-col gap-1.5 rounded-lg border border-linea border-l-[3px] ${area.clase} bg-superficie px-3 py-2`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-texto-tenue">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h2 className="flex-1 truncate text-xs font-semibold text-texto">
                      {parada.titulo}
                    </h2>
                    <Icono size={12} className="shrink-0 text-texto-tenue" />
                  </div>

                  <dl className="grid gap-0.5">
                    {parada.cuentas.map((c) => (
                      <div key={c.etiqueta} className="flex items-baseline justify-between gap-2">
                        <dt className="truncate text-[11px] text-texto-tenue">{c.etiqueta}</dt>
                        <dd
                          className={`font-mono text-xs tabular-nums ${
                            c.valor === 0
                              ? 'text-texto-tenue/50'
                              : (tonoClase[c.tono ?? ''] ?? 'text-texto')
                          }`}
                        >
                          {c.valor}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  {elegida && (
                    <p className="border-t border-linea pt-1.5 text-[11px] leading-relaxed text-texto-tenue">
                      {parada.explica}
                      {parada.enlace && (
                        <>
                          {' '}
                          <Link
                            to={parada.enlace}
                            className="font-medium text-ocre-500 hover:text-sangre-500"
                          >
                            Ir →
                          </Link>
                        </>
                      )}
                    </p>
                  )}
                </article>
              </li>
            );
          })}
      </ol>

      {resumen && (
        <div className="grid gap-2 rounded-xl border border-linea bg-superficie p-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <p className="text-xs text-texto-tenue">
            De todos los pasos ejecutados hasta ahora:{' '}
            <strong className="font-mono text-paso-500">{resumen.resultados.pasaron}</strong>{' '}
            pasaron,{' '}
            <strong className="font-mono text-fallo-500">{resumen.resultados.fallaron}</strong>{' '}
            fallaron y{' '}
            <strong className="font-mono text-texto">{resumen.resultados.omitidos}</strong> se
            omitieron.
          </p>
          {/* La hora del dato al lado del dato: un número sin su hora empieza a caducar
              sin avisar a nadie. */}
          <p className="font-mono text-[10px] text-texto-tenue/70 sm:text-right">
            medido {new Date(resumen.medidoEn).toLocaleTimeString('es-ES')}
          </p>
        </div>
      )}
    </div>
  );
}
