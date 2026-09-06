'use strict';

const { chromium } = require('playwright');
const { Client } = require('pg');
const { createClient } = require('redis');
const fs = require('fs');
const path = require('path');

const EXECUTION_ID  = process.env.EXECUTION_ID;
const REDIS_URL     = process.env.REDIS_URL;
const DATABASE_URL  = process.env.DATABASE_URL;
const ARTIFACTS_DIR = '/artifacts';
const RECORD_VIDEO  = process.env.RECORD_VIDEO !== 'false'; // default on; set RECORD_VIDEO=false to skip
const MAX_PARALLEL  = parseInt(process.env.MAX_PARALLEL ?? '3', 10);

if (!EXECUTION_ID || !DATABASE_URL || !REDIS_URL) {
  console.error('Missing required env vars: EXECUTION_ID, DATABASE_URL, REDIS_URL');
  process.exit(1);
}

async function publish(redis, event, payload) {
  await redis.publish(
    `execution:${EXECUTION_ID}:events`,
    JSON.stringify({ event, executionId: EXECUTION_ID, ...payload, timestamp: Date.now() }),
  );
}

// Resuelve referencias a secretos `{{NOMBRE}}` contra las variables de entorno
// inyectadas por el worker. Si el nombre no existe, deja el placeholder intacto.
// Se aplica solo al ejecutar el paso, nunca al loguearlo, para no filtrar valores.
function resolveSecrets(input) {
  if (input == null) return input;
  return input.replace(/\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(process.env, name) ? process.env[name] : match,
  );
}

// Guarda HTML y screenshot del momento del fallo en el volumen de artefactos.
// El backend (self-healing automático) los lee como `${stepId}_failure.{html,png}`.
// Devuelve la URL del screenshot, o null si no se pudo capturar.
async function captureFailureContext(page, stepId) {
  const dir = path.join(ARTIFACTS_DIR, EXECUTION_ID);
  fs.mkdirSync(dir, { recursive: true });
  const withTimeout = (p) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))]);

  await withTimeout(
    page.content().then((html) => fs.writeFileSync(path.join(dir, `${stepId}_failure.html`), html)),
  ).catch((e) => console.error(`[executor] capture HTML failed: ${e}`));

  let screenshotUrl = null;
  await withTimeout(
    page.screenshot({ path: path.join(dir, `${stepId}_failure.png`) }).then(() => {
      screenshotUrl = `/artifacts/${EXECUTION_ID}/${stepId}_failure.png`;
    }),
  ).catch((e) => console.error(`[executor] capture screenshot failed: ${e}`));

  return screenshotUrl;
}

/**
 * Resuelve a donde hay que ir.
 *
 * Acepta las DOS formas a proposito:
 *   - absoluta  ("https://otra-cosa.com/pago")  -> se respeta tal cual. Son los pasos
 *     grabados antes de este cambio y los que salen de la aplicacion adrede.
 *   - relativa  ("/login")                      -> se une a la baseUrl del proyecto, que
 *     es lo que permite mover la aplicacion de entorno sin editar los tests uno a uno.
 *
 * Si no hay baseUrl o la union falla, se devuelve lo que habia: un paso que antes
 * funcionaba no puede empezar a fallar por esto.
 */
function resolverDestino(destino, baseUrl) {
  if (!destino) return destino;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(destino)) return destino;
  if (!baseUrl) return destino;
  try {
    return new URL(destino, baseUrl).toString();
  } catch {
    return destino;
  }
}

/**
 * Cuanto se espera a que un elemento aparezca, en milisegundos.
 *
 * Estaba clavado a 30000 en cada `page.goto`. Una ejecucion que falla por un elemento que
 * no esta se lleva medio minuto entero esperandolo, y con varios pasos asi la espera se
 * multiplica: la primera grabacion real que fallo tardo 36 s, de los cuales 30 eran esto.
 * Treinta segundos es sensato para una web lenta y demasiado para saber que algo no esta;
 * ahora al menos se puede ajustar sin tocar el codigo.
 */
const ESPERA_MS = Number(process.env.STEP_TIMEOUT_MS) || 30000;

/** Las comprobaciones esperan menos: si algo tiene que estar visible, o esta o no esta. */
const ESPERA_ASERCION_MS = Number(process.env.ASSERT_TIMEOUT_MS) || 10000;

/**
 * Traduce el error de Playwright a algo que una persona entienda.
 *
 * Lo que veia el usuario hasta el 2026-09-06, tal cual y en ingles:
 *
 *   TimeoutError: page.click: Timeout 30000ms exceeded.
 *   Call log: - waiting for locator('#flashObject')
 *
 * Delante de un QA que no programa, eso no es un diagnostico: es ruido. El texto tecnico NO
 * se pierde — sigue guardandose en `errorDetails` del paso, que la pantalla ensena en «ver
 * detalle tecnico». Aqui solo se decide QUE se lee primero.
 */
function explicarError(err, step) {
  const texto = String(err);
  const segundos = Math.round(ESPERA_MS / 1000);
  // La descripcion se CITA, no se mete como sujeto de la frase: ya trae su verbo dentro
  // («Pulsar el elemento...»), y encajarla dentro producia «No se encontro Pulsar el
  // elemento...». Se cita entre comillas y la frase se construye alrededor.
  const elPaso = step?.description ? `El paso «${step.description}»` : 'El paso';

  if (/Timeout.*exceeded|TimeoutError/i.test(texto)) {
    if (/goto|navigat/i.test(texto)) {
      return (
        `La pagina tardo mas de ${segundos} segundos en cargar y se dejo de esperar. ` +
        `Puede que la direccion no responda o que la red vaya lenta.`
      );
    }
    return (
      `${elPaso} no se pudo hacer: el elemento no aparecio en la pagina despues de ` +
      `${segundos} segundos. Puede que haya cambiado, que tarde mas en aparecer, o que la ` +
      `pagina anterior no llegara a cargar.`
    );
  }

  if (/net::ERR_NAME_NOT_RESOLVED|ENOTFOUND/i.test(texto)) {
    return 'No se pudo resolver la direccion. Comprueba que la URL esta bien escrita.';
  }
  if (/net::ERR_CONNECTION_REFUSED|ECONNREFUSED/i.test(texto)) {
    return 'La direccion existe pero nadie contesta. Puede que el servidor este apagado.';
  }
  if (/net::ERR_CERT|SSL/i.test(texto)) {
    return 'El certificado de seguridad del sitio no es valido.';
  }
  if (/assert_text failed: expected "([^"]*)" but got "([^"]*)"/i.test(texto)) {
    const m = /expected "([^"]*)" but got "([^"]*)"/i.exec(texto);
    return `Se esperaba encontrar «${m[1]}» y en su lugar habia «${m[2]}».`;
  }
  if (/is not visible|not visible/i.test(texto)) {
    return `${elPaso} no se pudo hacer: el elemento existe en la pagina pero no se ve.`;
  }

  // Lo que no se sabe traducir se devuelve tal cual: inventar una explicacion seria peor
  // que ensenar la tecnica (`P5` — ante la duda, no adornar).
  return texto;
}

async function runStep(page, step, baseUrl) {
  const action = step.action;
  const selector = resolveSecrets(step.selector);
  const value = resolveSecrets(step.value);

  switch (action) {
    case 'navigate': {
      const destino = resolverDestino(value || selector, baseUrl);
      await page.goto(destino, { waitUntil: 'domcontentloaded', timeout: ESPERA_MS });
      break;
    }

    case 'click':
      if (selector) {
        await page.click(selector);
      } else if (value) {
        try {
          const { x, y } = JSON.parse(value);
          await page.mouse.click(x, y);
        } catch {
          await page.click(value);
        }
      }
      break;

    case 'dblclick':
      if (selector) {
        await page.dblclick(selector);
      } else if (value) {
        try {
          const { x, y } = JSON.parse(value);
          await page.mouse.dblclick(x, y);
        } catch {
          await page.dblclick(value);
        }
      }
      break;

    case 'fill':
      if (selector) {
        await page.fill(selector, value ?? '');
      } else {
        await page.keyboard.type(value ?? '');
      }
      break;

    case 'press':
      await page.keyboard.press(value ?? 'Enter');
      break;

    case 'hover':
      if (selector) await page.hover(selector);
      break;

    case 'select':
      await page.selectOption(selector, value ?? '');
      break;

    case 'assert_visible':
      await page.waitForSelector(selector, { state: 'visible', timeout: ESPERA_ASERCION_MS });
      break;

    // `assert` genérico (lo emite la IA nl-to-flow): si hay `value` compara texto,
    // si no equivale a assert_visible. Comparte la lógica con assert_text.
    case 'assert':
    case 'assert_text': {
      await page.waitForSelector(selector, { state: 'visible', timeout: ESPERA_ASERCION_MS });
      const actual = (await page.textContent(selector)) ?? '';
      if (value != null && value !== '' && !actual.includes(value)) {
        throw new Error(
          `assert_text failed: expected "${value}" but got "${actual.trim().slice(0, 200)}"`,
        );
      }
      break;
    }

    case 'screenshot': {
      const dir = path.join(ARTIFACTS_DIR, EXECUTION_ID);
      fs.mkdirSync(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, `${step.id}.png`) });
      break;
    }

    case 'wait':
      await page.waitForTimeout(parseInt(value ?? '1000', 10));
      break;

    default:
      // Acción no soportada: fallar explícitamente en vez de marcar el paso como PASSED.
      throw new Error(`Unknown action: ${action}`);
  }
}

async function runTest(browser, db, redis, row) {
  const { result_id, test_id, test_name, base_url, steps } = row;
  const activeSteps = (steps ?? []).filter(Boolean);

  console.log(`[executor] Test "${test_name}" — ${activeSteps.length} step(s)`);
  await publish(redis, 'result:started', { testId: test_id, testName: test_name });

  const startTime = Date.now();
  let status = 'COMPLETED';
  let errorMessage = null;
  let errorTecnico = null;
  let failedStepId = null;

  const contextOptions = RECORD_VIDEO
    ? { recordVideo: { dir: path.join(ARTIFACTS_DIR, EXECUTION_ID), size: { width: 1280, height: 720 } } }
    : {};

  let context;
  let page;
  let tracing = false;           // si la traza llego a arrancar, hay que pararla en el finally
  let failedIndex = -1;          // índice del paso que falló (-1 = fallo de setup)
  let failedStepStart = null;    // instante en que arranco el paso que falla, para su duracion real
  const stepResults = [];        // collect results in-memory, bulk-insert at the end

  try {
    // Dentro del try: si newContext/newPage fallan, el test se marca FAILED en vez de
    // quedar atascado en RUNNING (la excepción ya no escapa de runTest).
    const tCtx = Date.now();
    context = await browser.newContext(contextOptions);
    console.log(`[executor][tiempo] contexto creado: ${Date.now() - tCtx} ms`);

    // Traza de Playwright. El colector ya la buscaba como `${test_id}.zip` y la columna
    // `traceUrl` existe desde el diseno: el unico extremo que faltaba era este, el que la
    // produce. Best-effort — una traza que no arranca no puede tumbar la ejecucion.
    tracing = await context.tracing.start({ screenshots: true, snapshots: true })
      .then(() => true)
      .catch((err) => { console.warn(`[executor] tracing no disponible: ${err}`); return false; });

    // El tiempo de espera por defecto de TODAS las acciones (click, fill, press...). Sin
    // esta linea, Playwright usa su propio valor de 30 s y no habia forma de cambiarlo: el
    // «Timeout 30000ms exceeded» que veia el usuario no salia de ninguna linea del codigo,
    // por eso no se encontraba buscando "30000".
    context.setDefaultTimeout(ESPERA_MS);

    const tPagina = Date.now();
    page = await context.newPage();
    console.log(`[executor][tiempo] pagina abierta: ${Date.now() - tPagina} ms`);
    const tPasos = Date.now();

    for (let i = 0; i < activeSteps.length; i++) {
      const step = activeSteps[i];
      console.log(`[executor]   step [${step.action}] ${step.selector ?? step.value ?? ''}`);
      const stepStart = Date.now();
      failedStepStart = stepStart;
      failedStepId = step.id;
      failedIndex = i;

      await runStep(page, step, base_url);

      stepResults.push({ stepId: step.id, status: 'PASSED', durationMs: Date.now() - stepStart, errorDetails: null, screenshotUrl: null });
    }

    console.log(`[executor][tiempo] TODOS LOS PASOS: ${Date.now() - tPasos} ms`);
    console.log(`[executor] Test "${test_name}" PASSED`);

  } catch (err) {
    status = 'FAILED';
    // Dos mensajes a proposito: el humano es el que se lee primero, el tecnico se guarda
    // entero en el paso para quien lo necesite.
    errorTecnico = String(err);
    errorMessage = explicarError(err, activeSteps[failedIndex]);
    console.error(`[executor] Test "${test_name}" FAILED: ${errorTecnico}`);

    // Capturar el contexto del fallo (HTML + screenshot) para alimentar el self-healing
    // automático del backend. Best-effort y con timeout: nunca debe colgar el test.
    let failureScreenshotUrl = null;
    if (page && failedStepId) {
      failureScreenshotUrl = await captureFailureContext(page, failedStepId).catch(() => null);
    }

    if (failedStepId) {
      // Antes iba con `durationMs: 0` y el paso fallido salia en el reporte como
      // instantaneo — justo el que interesa cronometrar. Hallazgo BAJO del audit
      // 2026-07-12, cerrado el 2026-09-04.
      const failedDuration = failedStepStart !== null ? Date.now() - failedStepStart : 0;
      stepResults.push({ stepId: failedStepId, status: 'FAILED', durationMs: failedDuration, errorDetails: errorTecnico, screenshotUrl: failureScreenshotUrl });
    }

    await publish(redis, 'result:step-failed', { testId: test_id, stepId: failedStepId }).catch(() => null);

    // Los pasos posteriores al fallo (o todos, si falló el setup) se marcan SKIPPED
    // para que el resultado quede completo y la UI pueda distinguir "saltado" de "fallido".
    const skipFrom = failedIndex >= 0 ? failedIndex + 1 : 0;
    for (const step of activeSteps.slice(skipFrom)) {
      stepResults.push({ stepId: step.id, status: 'SKIPPED', durationMs: 0, errorDetails: null, screenshotUrl: null });
    }
  } finally {
    // Screenshot final SIEMPRE (con o sin video): el artifact-collector lo expone como
    // screenshotUrl del ExecutionResult. Antes solo se generaba sin video → screenshotUrl null.
    if (page) {
      const finalPath = path.join(ARTIFACTS_DIR, EXECUTION_ID, `${test_id}_final.png`);
      await Promise.race([
        page.screenshot({ path: finalPath }).catch(() => null),
        new Promise(r => setTimeout(r, 8000)),
      ]);
    }
    // El ORDEN de estas tres cosas no es de estilo: es la diferencia entre una ejecucion de
    // 4 segundos y una de 19.
    //
    //   1. La traza se para ANTES de cerrar: despues del cierre ya no se puede sacar.
    //   2. Se cierra el contexto. Playwright TERMINA DE ESCRIBIR EL VIDEO justo aqui.
    //   3. Y solo entonces se pide el video.
    //
    // Antes, el paso 3 iba primero. `video.saveAs()` no puede resolver mientras el contexto
    // sigue abierto, asi que esperaba su temporizador ENTERO -15 segundos- en cada ejecucion
    // que grabase video. Medido el 2026-09-05: de 19.064 ms totales, 482 ms eran los pasos.
    // Nadie lo noto porque no fallaba nada: el video acababa apareciendo y el test salia
    // COMPLETED. Solo tardaba quince segundos de mas, siempre.
    if (tracing && context) {
      const tracePath = path.join(ARTIFACTS_DIR, EXECUTION_ID, `${test_id}.zip`);
      const tTraza = Date.now();
      await Promise.race([
        context.tracing.stop({ path: tracePath }).catch(() => null),
        new Promise(r => setTimeout(r, 15000)),
      ]);
      console.log(`[executor][tiempo] guardar traza: ${Date.now() - tTraza} ms`);
    }

    // El video hay que pedirlo ANTES de cerrar (el objeto cuelga de la pagina), pero la
    // promesa no se resuelve hasta que el cierre termina de escribirlo. Por eso se guarda
    // la referencia aqui y se espera despues.
    const video = RECORD_VIDEO && page ? page.video() : null;

    if (context) {
      const tCierre = Date.now();
      await Promise.race([context.close(), new Promise(r => setTimeout(r, 10000))]);
      console.log(`[executor][tiempo] cerrar contexto: ${Date.now() - tCierre} ms`);
    }

    if (video) {
      const videoPath = path.join(ARTIFACTS_DIR, EXECUTION_ID, `${test_id}.webm`);
      const tVideo = Date.now();
      await Promise.race([
        video.saveAs(videoPath).catch((e) => console.warn(`[executor] video: ${e}`)),
        new Promise(r => setTimeout(r, 15000)),
      ]);
      console.log(`[executor][tiempo] guardar video: ${Date.now() - tVideo} ms`);
      // Playwright escribe el video con un nombre de hash y `saveAs` hace una COPIA con el
      // nombre del test. Sin esto quedaban los dos, ocupando lo mismo, y solo se usa uno.
      await video.delete().catch(() => null);
    }
  }

  // Bulk-insert all step results in one query
  if (stepResults.length > 0) {
    const values = stepResults.map((_, i) => {
      const base = i * 6;
      return `(gen_random_uuid(), $${base+1}, $${base+2}, $${base+3}, $${base+4}, $${base+5}, $${base+6}, NOW())`;
    }).join(', ');

    const params = stepResults.flatMap(r => [result_id, r.stepId, r.status, r.durationMs, r.errorDetails, r.screenshotUrl ?? null]);
    await db.query(
      `INSERT INTO step_results (id, "executionResultId", "stepId", status, "durationMs", "errorDetails", "screenshotUrl", "createdAt") VALUES ${values}`,
      params,
    ).catch(e => console.error('[executor] step_results insert failed:', e));
  }

  const durationMs = Date.now() - startTime;
  await db.query(
    `UPDATE execution_results SET status = $1, "errorMessage" = $2, "durationMs" = $3 WHERE id = $4`,
    [status, errorMessage, durationMs, result_id],
  );

  await publish(redis, 'result:completed', { testId: test_id, status, durationMs });
}

/**
 * Marcas de tiempo del arranque.
 *
 * Por que existen: el 2026-09-05 se midio una ejecucion real de 19.506 ms cuyos pasos
 * sumaban 489 ms. El 97,5 % del tiempo NO era ejecutar, y no habia forma de saber en que
 * se iba: si en descargar la imagen, en arrancar Chromium o en conectar a la base.
 *
 * Esto no optimiza nada. Mide, que es el paso que va antes: dar un tiempo sin calcularlo
 * es el error que este equipo lleva seis veces cometido (`LECCIONES.md` §1).
 */
const T0 = Date.now();
function marca(nombre) {
  console.log(`[executor][tiempo] ${nombre}: ${Date.now() - T0} ms desde que arranco el proceso`);
}

async function main() {
  marca('proceso vivo');

  const db    = new Client({ connectionString: DATABASE_URL });
  const redis = createClient({ url: REDIS_URL });

  fs.mkdirSync(path.join(ARTIFACTS_DIR, EXECUTION_ID), { recursive: true });

  // Initialize all three in parallel
  const tArranque = Date.now();
  const [browser] = await Promise.all([
    chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] }),
    db.connect(),
    redis.connect(),
  ]);
  console.log(`[executor][tiempo] chromium + base + redis: ${Date.now() - tArranque} ms (en paralelo)`);
  marca('listo para leer los tests');

  try {
    const { rows: results } = await db.query(
      // La baseUrl del proyecto viaja con cada test: los pasos `navigate` pueden estar
      // guardados en relativo ("/login") y aqui es donde se resuelven contra ella.
      `SELECT er.id             AS result_id,
              er."testId"       AS test_id,
              t.name            AS test_name,
              p."baseUrl"       AS base_url,
              json_agg(ts ORDER BY ts."order") FILTER (WHERE ts.id IS NOT NULL) AS steps
       FROM   execution_results er
       JOIN   tests       t  ON t.id  = er."testId"
       JOIN   test_suites s  ON s.id  = t."suiteId"
       JOIN   projects    p  ON p.id  = s."projectId"
       LEFT JOIN test_steps ts ON ts."testId" = t.id AND ts."isDisabled" = false
       WHERE  er."executionId" = $1
       GROUP  BY er.id, er."testId", t.name, p."baseUrl"
       ORDER  BY er."createdAt"`,
      [EXECUTION_ID],
    );

    marca('tests leidos de la base');
    console.log(`[executor] Running ${results.length} test(s) for execution ${EXECUTION_ID} (max ${MAX_PARALLEL} parallel)`);

    // Run tests in parallel batches of MAX_PARALLEL
    for (let i = 0; i < results.length; i += MAX_PARALLEL) {
      const batch = results.slice(i, i + MAX_PARALLEL);
      await Promise.allSettled(batch.map(row => runTest(browser, db, redis, row)));
    }

    marca('todos los tests terminados');
    await browser.close();
    marca('navegador cerrado - fin');
    process.exit(0);

  } catch (err) {
    console.error('[executor] Fatal error:', err);
    await publish(redis, 'executor:error', { message: String(err) }).catch(() => null);
    process.exit(1);
  } finally {
    await db.end().catch(() => null);
    await redis.disconnect().catch(() => null);
  }
}

main();
