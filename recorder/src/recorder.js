'use strict';

const { chromium } = require('playwright');
const { io } = require('socket.io-client');

const SESSION_ID = process.env.SESSION_ID;
const TARGET_URL = process.env.TARGET_URL;
const BACKEND_WS_URL = process.env.BACKEND_WS_URL || 'ws://backend:3000';

if (!SESSION_ID || !TARGET_URL) {
  process.stderr.write('Missing required env vars: SESSION_ID, TARGET_URL\n');
  process.exit(1);
}

function log(msg) {
  process.stdout.write(`[recorder] ${msg}\n`);
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
  });

  function captureAction(step) {
    socket.emit('action:captured', { sessionId: SESSION_ID, step });
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
      } else if (type === 'click') {
        if (x !== undefined && y !== undefined) {
          await page.mouse.click(x, y);
          captureAction({ type, x, y });
        } else {
          await page.click(selector);
          captureAction({ type, selector });
        }
      } else if (type === 'dblclick') {
        if (x !== undefined && y !== undefined) {
          await page.mouse.dblclick(x, y);
          captureAction({ type, x, y });
        } else {
          await page.dblclick(selector);
          captureAction({ type, selector });
        }
      } else if (type === 'type') {
        await page.keyboard.type(value ?? '');
        captureAction({ type, value });
      } else if (type === 'fill') {
        await page.fill(selector, value ?? '');
        captureAction({ type, selector, value });
      } else if (type === 'press') {
        await page.keyboard.press(key);
        captureAction({ type, key });
      } else if (type === 'hover') {
        if (x !== undefined && y !== undefined) {
          await page.mouse.move(x, y);
        } else {
          await page.hover(selector);
        }
      } else if (type === 'select') {
        await page.selectOption(selector, value ?? '');
        captureAction({ type, selector, value });
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
