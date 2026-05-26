'use strict';

const { chromium } = require('playwright');
const { io } = require('socket.io-client');

const SESSION_ID = process.env.SESSION_ID;
const TARGET_URL = process.env.TARGET_URL;
const BACKEND_WS_URL = process.env.BACKEND_WS_URL || 'ws://backend:3000';

if (!SESSION_ID || !TARGET_URL) {
  console.error('Missing required env vars: SESSION_ID, TARGET_URL');
  process.exit(1);
}

async function main() {
  const socket = io(`${BACKEND_WS_URL}/recorder`, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  });

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  function captureAction(step) {
    socket.emit('action:captured', { sessionId: SESSION_ID, step });
  }

  // Capturar navegaciones automáticas
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      captureAction({ type: 'navigate', url: frame.url() });
    }
  });

  // Enviar frames al frontend a ~5fps
  const frameInterval = setInterval(async () => {
    try {
      const screenshot = await page.screenshot({ type: 'jpeg', quality: 60 });
      socket.emit('frame', {
        sessionId: SESSION_ID,
        timestamp: Date.now(),
        data: screenshot.toString('base64'),
      });
    } catch (_) {}
  }, 200);

  // Recibir y ejecutar acciones desde el frontend (via gateway)
  socket.on('container:action', async (data) => {
    const { type, selector, value, url, key } = data;
    try {
      if (type === 'navigate') {
        await page.goto(url);
        captureAction({ type, url });
      } else if (type === 'click') {
        await page.click(selector);
        captureAction({ type, selector });
      } else if (type === 'dblclick') {
        await page.dblclick(selector);
        captureAction({ type, selector });
      } else if (type === 'fill') {
        await page.fill(selector, value ?? '');
        captureAction({ type, selector, value });
      } else if (type === 'press') {
        await page.keyboard.press(key);
        captureAction({ type, key });
      } else if (type === 'hover') {
        await page.hover(selector);
      } else if (type === 'select') {
        await page.selectOption(selector, value ?? '');
        captureAction({ type, selector, value });
      }
    } catch (err) {
      socket.emit('action:error', { sessionId: SESSION_ID, message: String(err) });
    }
  });

  socket.on('connect', async () => {
    console.log(`[recorder] Connected to backend WS (session ${SESSION_ID})`);
    socket.emit('session:join', { sessionId: SESSION_ID });
    try {
      await page.goto(TARGET_URL);
      console.log(`[recorder] Navigated to ${TARGET_URL}`);
    } catch (err) {
      console.error(`[recorder] Failed to navigate: ${err}`);
    }
  });

  socket.on('connect_error', (err) => {
    console.error(`[recorder] WS connection error: ${err.message}`);
  });

  async function cleanup() {
    clearInterval(frameInterval);
    socket.disconnect();
    await context.close().catch(() => null);
    await browser.close().catch(() => null);
  }

  // Auto-expiración: 30 minutos
  setTimeout(async () => {
    console.log('[recorder] Session timeout — shutting down');
    await cleanup();
    process.exit(0);
  }, 30 * 60 * 1000);

  process.on('SIGTERM', async () => {
    console.log('[recorder] SIGTERM received');
    await cleanup();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('[recorder] Fatal error:', err);
  process.exit(1);
});
