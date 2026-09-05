'use strict';

const { chromium } = require('playwright');
const { io } = require('socket.io-client');

const SESSION_ID = process.env.SESSION_ID;
const TARGET_URL = process.env.TARGET_URL;
const BACKEND_WS_URL = process.env.BACKEND_WS_URL || 'ws://backend:3000';
const RECORDER_TOKEN = process.env.RECORDER_TOKEN;

if (!SESSION_ID || !TARGET_URL) {
  process.stderr.write('Missing required env vars: SESSION_ID, TARGET_URL\n');
  process.exit(1);
}

function log(msg) {
  process.stdout.write(`[recorder] ${msg}\n`);
}

// Se ejecuta DENTRO de la página. Computa un selector robusto para un elemento,
// priorizando estrategias estables sobre rutas CSS frágiles:
//   data-testid > id estable > aria-label > [name] > texto (botones/links) > css acotado.
// Devuelve { selector, selectorType } o null. Compatible con los selector engines de
// Playwright (text=, role no se usa aquí para evitar ambigüedad de nombre accesible).
function buildSelectorInPage(el) {
  if (!el || el.nodeType !== 1) return null;
  const esc = (s) => (window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&'));
  const stableId = (v) => v && !/[:.]/.test(v) && !/\d{4,}/.test(v);

  // Como LLAMA UNA PERSONA a este elemento. Va aparte del selector a proposito: el modo
  // sencillo ensena esto («Pulsar «Entrar»») y el selector queda detras del desplegable.
  // Sin esto, la descripcion del paso acababa siendo «Click en #btn-login», que es un
  // selector con una frase delante — justo lo que el perfil No-Code no debe ver.
  const humanLabel = (function () {
    const clean = (v) => {
      if (!v) return null;
      const t = String(v).trim().replace(/\s+/g, ' ');
      return t && t.length <= 60 ? t : null;
    };
    return (
      clean(el.getAttribute('aria-label')) ||
      clean(el.getAttribute('placeholder')) ||
      clean(el.getAttribute('title')) ||
      clean(el.getAttribute('alt')) ||
      clean(el.textContent) ||
      clean(el.getAttribute('name')) ||
      clean(el.value) ||
      null
    );
  })();
  const withLabel = (r) => Object.assign({ label: humanLabel }, r);

  for (const attr of ['data-testid', 'data-test-id', 'data-test', 'data-cy', 'data-qa']) {
    const v = el.getAttribute(attr);
    if (v) return withLabel({ selector: `[${attr}="${v}"]`, selectorType: 'testId' });
  }

  const id = el.getAttribute('id');
  if (stableId(id)) return withLabel({ selector: `#${esc(id)}`, selectorType: 'css' });

  const aria = el.getAttribute('aria-label');
  if (aria) return withLabel({ selector: `[aria-label="${aria}"]`, selectorType: 'css' });

  const tag = el.tagName.toLowerCase();
  const name = el.getAttribute('name');
  if (name) return withLabel({ selector: `${tag}[name="${name}"]`, selectorType: 'css' });

  const role = el.getAttribute('role');
  const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
  const isClickable = tag === 'button' || tag === 'a' || role === 'button' || el.type === 'submit';
  if (isClickable && text && text.length <= 50) {
    return withLabel({ selector: `text="${text}"`, selectorType: 'text' });
  }

  let css = tag;
  if (el.classList && el.classList.length) css += '.' + esc(el.classList[0]);
  try {
    if (document.querySelectorAll(css).length > 1 && el.parentElement) {
      const parent = el.parentElement;
      const sameTag = Array.prototype.filter.call(parent.children, (c) => c.tagName === el.tagName);
      const idx = sameTag.indexOf(el) + 1;
      css = `${tag}:nth-of-type(${idx})`;
      const pid = parent.getAttribute('id');
      if (stableId(pid)) css = `#${esc(pid)} > ${css}`;
    }
  } catch (_) {}
  return withLabel({ selector: css, selectorType: 'css' });
}

async function main() {
  log(`Starting — session=${SESSION_ID} target=${TARGET_URL} ws=${BACKEND_WS_URL}`);

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1280,720',
    ],
  });

  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  // Navigate immediately — don't wait for WS
  log(`Navigating to ${TARGET_URL}`);
  try {
    await page.goto(TARGET_URL, { timeout: 30000, waitUntil: 'domcontentloaded' });
    log(`Navigation complete: ${page.url()}`);
  } catch (err) {
    log(`Navigation warning (continuing): ${err.message}`);
  }

  const socket = io(`${BACKEND_WS_URL}/recorder`, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
    auth: { token: RECORDER_TOKEN },
  });

  function captureAction(step) {
    socket.emit('action:captured', { sessionId: SESSION_ID, step });
  }

  // Computa un selector robusto para el elemento en (x, y). Best-effort.
  async function robustSelectorAt(x, y) {
    try {
      const handle = await page.evaluateHandle(({ x, y }) => document.elementFromPoint(x, y), { x, y });
      const result = await page.evaluate(buildSelectorInPage, handle);
      await handle.dispose();
      return result;
    } catch (_) {
      return null;
    }
  }

  // Reescribe un selector CSS crudo del frontend por uno más estable, si se puede resolver.
  async function refineSelector(selector) {
    try {
      const handle = await page.$(selector);
      if (!handle) return null;
      const result = await handle.evaluate(buildSelectorInPage);
      await handle.dispose();
      return result;
    } catch (_) {
      return null;
    }
  }

  // Capture automatic navigations
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      captureAction({ type: 'navigate', url: frame.url() });
    }
  });

  let frameInterval = null;

  function startFrameStream() {
    if (frameInterval) return;
    log('Starting frame stream at ~5fps');
    frameInterval = setInterval(async () => {
      try {
        const screenshot = await page.screenshot({ type: 'jpeg', quality: 60 });
        socket.emit('frame', {
          sessionId: SESSION_ID,
          timestamp: Date.now(),
          data: screenshot.toString('base64'),
        });
      } catch (_) {}
    }, 200);
  }

  socket.on('connect', async () => {
    log(`Connected to backend WS`);
    socket.emit('session:join', { sessionId: SESSION_ID });
    startFrameStream();
  });

  socket.on('connect_error', (err) => {
    log(`WS connection error: ${err.message}`);
  });

  // Receive and execute actions from frontend
  socket.on('container:action', async (data) => {
    const { type, selector, value, url, key, x, y } = data;
    log(`Action received: ${type} ${selector || url || key || (x !== undefined ? `(${x},${y})` : '')}`);
    try {
      if (type === 'navigate') {
        await page.goto(url);
        captureAction({ type, url });
      } else if (type === 'click' || type === 'dblclick') {
        if (x !== undefined && y !== undefined) {
          // Resolver el selector ANTES de actuar: el click puede navegar y perder el DOM.
          const robust = await robustSelectorAt(x, y);
          await page.mouse[type](x, y);
          captureAction(robust ? { type, ...robust } : { type, x, y });
        } else {
          const robust = await refineSelector(selector);
          await page[type](selector);
          captureAction(robust ? { type, ...robust } : { type, selector });
        }
      } else if (type === 'type') {
        await page.keyboard.type(value ?? '');
        captureAction({ type, value });
      } else if (type === 'fill') {
        const robust = await refineSelector(selector);
        await page.fill(selector, value ?? '');
        captureAction(robust ? { type, ...robust, value } : { type, selector, value });
      } else if (type === 'press') {
        await page.keyboard.press(key);
        captureAction({ type, key });
      } else if (type === 'hover') {
        if (x !== undefined && y !== undefined) {
          const robust = await robustSelectorAt(x, y);
          await page.mouse.move(x, y);
          if (robust) captureAction({ type, ...robust });
        } else {
          const robust = await refineSelector(selector);
          await page.hover(selector);
          captureAction(robust ? { type, ...robust } : { type, selector });
        }
      } else if (type === 'select') {
        const robust = await refineSelector(selector);
        await page.selectOption(selector, value ?? '');
        captureAction(robust ? { type, ...robust, value } : { type, selector, value });
      }
    } catch (err) {
      log(`Action error: ${err.message}`);
      socket.emit('action:error', { sessionId: SESSION_ID, message: String(err) });
    }
  });

  async function cleanup() {
    if (frameInterval) clearInterval(frameInterval);
    socket.disconnect();
    await context.close().catch(() => null);
    await browser.close().catch(() => null);
  }

  // Auto-expire: 30 minutes
  setTimeout(async () => {
    log('Session timeout — shutting down');
    await cleanup();
    process.exit(0);
  }, 30 * 60 * 1000);

  process.on('SIGTERM', async () => {
    log('SIGTERM received');
    await cleanup();
    process.exit(0);
  });
}

main().catch((err) => {
  process.stderr.write(`[recorder] Fatal error: ${err}\n`);
  process.exit(1);
});
