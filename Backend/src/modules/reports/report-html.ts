/**
 * Reporte HTML de una ejecución, autocontenido.
 *
 * «Reportes HTML con trazas, vídeos y capturas» es una de las nueve capacidades que el §3
 * de `Docs/PROJECT_CONTEXT.md` declaró el 2026-05-25. Existían el vídeo y las capturas;
 * el HTML no: el módulo de reportes solo devolvía JSON.
 *
 * Dos decisiones que lo hacen útil:
 *
 * 1. **Las capturas van embebidas en base64.** Los artefactos se sirven con un token que
 *    caduca (`artifacts.controller.ts`), así que un `<img src>` apuntando allí deja de
 *    verse en cuanto expira la sesión — justo cuando alguien abre el reporte que le
 *    reenviaron. Embebido se ve siempre, también sin conexión. El vídeo y la traza sí van
 *    como enlaces: pesan demasiado para meterlos dentro.
 *
 * 2. **Se lee sin saber programar.** Ni un selector, ni una clase, ni un identificador
 *    interno. Es el mismo criterio del modo SENCILLO, aplicado a lo que sale de la
 *    plataforma y no solo a lo que se ve dentro.
 */

export interface ReportStepView {
  order: number;
  descripcion: string;
  status: string;
  durationMs: number | null;
  /** Data URI de la captura del paso, ya embebida. */
  captura: string | null;
}

export interface ReportTestView {
  nombre: string;
  status: string;
  durationMs: number | null;
  /**
   * El error crudo de Playwright. Lleva dentro el selector que fallo
   * (`TimeoutError: no se encontro el elemento ".alert-danger-v1"`), asi que NO se pinta
   * a la vista: va detras de un desplegable, con una frase en cristiano delante.
   * Escondido, nunca inaccesible — el mismo criterio que el modo sencillo.
   */
  errorMessage: string | null;
  /** Data URI de la captura final, ya embebida. */
  captura: string | null;
  videoUrl: string | null;
  trazaUrl: string | null;
  pasos: ReportStepView[];
}

export interface ReportView {
  proyecto: string;
  baseUrl: string | null;
  status: string;
  /** El NOMBRE de quien la lanzo, ya resuelto. Nunca un identificador. */
  lanzadoPor: string | null;
  inicio: Date | null;
  fin: Date | null;
  total: number;
  pasaron: number;
  fallaron: number;
  duracionTotalMs: number;
  tests: ReportTestView[];
}

/**
 * Escapa texto para meterlo en HTML. Todo lo que venga de la base pasa por aquí.
 *
 * Acepta solo lo que se puede convertir a texto sin sorpresas: con `unknown`, pasarle un
 * objeto por error daba «[object Object]» dentro del informe, en silencio.
 */
function esc(v: string | number | null | undefined): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** «2 min 14 s», «1,4 s», «—». Nada de milisegundos crudos en la cara del lector. */
function duracion(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1).replace('.', ',')} s`;
  const min = Math.floor(s / 60);
  const resto = Math.round(s % 60);
  return `${min} min ${resto} s`;
}

function fecha(d: Date | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });
}

/** Cómo se llama cada estado para alguien que no vive dentro del sistema. */
const ETIQUETA: Record<string, string> = {
  COMPLETED: 'Correcto',
  PASSED: 'Correcto',
  FAILED: 'Falló',
  SKIPPED: 'No se llegó a ejecutar',
  CANCELLED: 'Cancelada',
  QUEUED: 'En cola',
  RUNNING: 'En curso',
  PROVISIONING: 'Preparando',
  COLLECTING: 'Recogiendo resultados',
};

function etiqueta(status: string): string {
  return ETIQUETA[status] ?? status;
}

function clase(status: string): string {
  if (status === 'COMPLETED' || status === 'PASSED') return 'ok';
  if (status === 'FAILED') return 'mal';
  return 'neutro';
}

const ESTILOS = `
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 2rem 1.25rem; background: #f6f7f9; color: #1a1d21;
    font: 15px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  main { max-width: 900px; margin: 0 auto; }
  h1 { font-size: 1.6rem; margin: 0 0 .25rem; }
  h2 { font-size: 1.15rem; margin: 2rem 0 .75rem; }
  .sub { color: #5c6470; margin: 0 0 1.5rem; }
  .tarjeta { background: #fff; border: 1px solid #e3e6ea; border-radius: 10px; padding: 1.1rem 1.25rem; margin-bottom: 1rem; }
  .resumen { display: flex; flex-wrap: wrap; gap: .75rem; margin-bottom: 1.5rem; }
  .dato { background: #fff; border: 1px solid #e3e6ea; border-radius: 10px; padding: .8rem 1.1rem; min-width: 130px; }
  .dato .n { font-size: 1.5rem; font-weight: 600; display: block; }
  .dato .t { color: #5c6470; font-size: .85rem; }
  .marca { display: inline-block; padding: .12rem .55rem; border-radius: 99px; font-size: .8rem; font-weight: 600; }
  .ok { background: #e6f5ec; color: #17663a; }
  .mal { background: #fdeaea; color: #8f1d1d; }
  .neutro { background: #eef0f3; color: #4a515b; }
  ol.pasos { margin: .75rem 0 0; padding-left: 1.3rem; }
  ol.pasos li { margin-bottom: .35rem; }
  ol.pasos .t { color: #5c6470; font-size: .85rem; }
  .error { background: #fdf3f3; border-left: 3px solid #d24b4b; padding: .7rem .9rem; margin-top: .8rem; border-radius: 0 6px 6px 0; font-size: .9rem; }
  .error summary { cursor: pointer; color: #8f1d1d; font-size: .85rem; margin-top: .5rem; }
  .error pre { white-space: pre-wrap; word-break: break-word; font-size: .82rem; margin: .5rem 0 0; }
  figure { margin: 1rem 0 0; }
  figure img { width: 100%; border: 1px solid #e3e6ea; border-radius: 8px; display: block; }
  figcaption { color: #5c6470; font-size: .85rem; margin-top: .4rem; }
  .enlaces { margin-top: .9rem; font-size: .9rem; }
  .enlaces a { color: #1f5fbf; margin-right: 1rem; }
  footer { color: #77808c; font-size: .85rem; margin-top: 2.5rem; text-align: center; }
  @media (prefers-color-scheme: dark) {
    body { background: #14171a; color: #e6e8eb; }
    .tarjeta, .dato { background: #1c2024; border-color: #2c3238; }
    .sub, .dato .t, ol.pasos .t, figcaption, footer { color: #98a1ac; }
    .ok { background: #16341f; color: #7fd6a0; }
    .mal { background: #3a1c1c; color: #f0a0a0; }
    .neutro { background: #262b31; color: #b0b8c2; }
    .error { background: #2a1a1a; }
    .enlaces a { color: #7fb0f5; }
  }
  @media print { body { background: #fff; padding: 0; } .tarjeta, .dato { break-inside: avoid; } }
`;

export function renderExecutionReportHtml(r: ReportView): string {
  const tests = r.tests
    .map((t) => {
      const pasos = t.pasos
        .map(
          (p) => `<li>
            <span class="marca ${clase(p.status)}">${esc(etiqueta(p.status))}</span>
            ${esc(p.descripcion)}
            <span class="t">· ${esc(duracion(p.durationMs))}</span>
            ${p.captura ? `<figure><img src="${p.captura}" alt="Captura del paso ${p.order + 1}"><figcaption>Cómo se veía la pantalla en este paso</figcaption></figure>` : ''}
          </li>`,
        )
        .join('\n');

      const enlaces = [
        t.videoUrl ? `<a href="${esc(t.videoUrl)}">Ver el vídeo de la ejecución</a>` : '',
        t.trazaUrl ? `<a href="${esc(t.trazaUrl)}">Descargar la traza técnica</a>` : '',
      ]
        .filter(Boolean)
        .join('');

      return `<section class="tarjeta">
        <h2>${esc(t.nombre)} <span class="marca ${clase(t.status)}">${esc(etiqueta(t.status))}</span></h2>
        <p class="sub" style="margin:0">Tardó ${esc(duracion(t.durationMs))}${t.pasos.length ? ` · ${t.pasos.length} paso${t.pasos.length === 1 ? '' : 's'}` : ''}</p>
        ${
          t.errorMessage
            ? `<div class="error">
                 <strong>Qué falló:</strong> la prueba no encontró en la pantalla algo que esperaba encontrar.
                 <details><summary>ver el mensaje técnico</summary><pre>${esc(t.errorMessage)}</pre></details>
               </div>`
            : ''
        }
        ${pasos ? `<ol class="pasos">${pasos}</ol>` : '<p class="sub">Esta prueba no llegó a ejecutar ningún paso.</p>'}
        ${t.captura ? `<figure><img src="${t.captura}" alt="Pantalla al terminar"><figcaption>Cómo quedó la pantalla al terminar</figcaption></figure>` : ''}
        ${enlaces ? `<p class="enlaces">${enlaces}</p>` : ''}
      </section>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Informe de pruebas — ${esc(r.proyecto)}</title>
<style>${ESTILOS}</style>
</head>
<body>
<main>
  <h1>Informe de pruebas — ${esc(r.proyecto)}</h1>
  <p class="sub">
    ${r.baseUrl ? `Aplicación probada: ${esc(r.baseUrl)}<br>` : ''}
    Lanzada el ${esc(fecha(r.inicio))}${r.lanzadoPor ? ` por ${esc(r.lanzadoPor)}` : ''}
    · Terminó el ${esc(fecha(r.fin))}
  </p>

  <div class="resumen">
    <div class="dato"><span class="n">${r.total}</span><span class="t">prueba${r.total === 1 ? '' : 's'} en total</span></div>
    <div class="dato"><span class="n">${r.pasaron}</span><span class="t">correctas</span></div>
    <div class="dato"><span class="n">${r.fallaron}</span><span class="t">fallaron</span></div>
    <div class="dato"><span class="n">${esc(duracion(r.duracionTotalMs))}</span><span class="t">de duración total</span></div>
  </div>

  ${r.total === 0 ? '<p class="tarjeta">Esta ejecución no produjo ningún resultado.</p>' : tests}

  <footer>
    Generado por Easy Test el ${esc(fecha(new Date()))}.<br>
    Las capturas van dentro de este archivo: se ven aunque lo abras sin conexión o mucho después.
  </footer>
</main>
</body>
</html>`;
}
