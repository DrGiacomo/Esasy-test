'use strict';

const { chromium } = require('playwright');
const { Client } = require('pg');
const { createClient } = require('redis');
const fs = require('fs');
const path = require('path');

const EXECUTION_ID = process.env.EXECUTION_ID;
const REDIS_URL    = process.env.REDIS_URL;
const DATABASE_URL = process.env.DATABASE_URL;
const ARTIFACTS_DIR = '/artifacts';

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

async function runStep(page, step) {
  const { action, selector, value } = step;

  switch (action) {
    case 'navigate':
      // URL is in `value`; selector is a legacy fallback
      await page.goto(value || selector, { waitUntil: 'domcontentloaded', timeout: 30000 });
      break;

    case 'click':
      if (selector) {
        await page.click(selector);
      } else if (value) {
        // Coordinate-based click: value = '{"x":640,"y":360}'
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
        // No selector — type into currently focused element
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
      await page.waitForSelector(selector, { state: 'visible', timeout: 10000 });
      break;

    case 'assert_text':
      await page.waitForSelector(selector, { state: 'visible', timeout: 10000 });
      break;

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
      console.warn(`[executor] Unknown action: ${action}`);
  }
}

async function main() {
  const db    = new Client({ connectionString: DATABASE_URL });
  const redis = createClient({ url: REDIS_URL });

  await db.connect();
  await redis.connect();

  fs.mkdirSync(path.join(ARTIFACTS_DIR, EXECUTION_ID), { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    // Load execution_results (pre-created by the processor) with their tests and steps
    const { rows: results } = await db.query(
      `SELECT er.id             AS result_id,
              er."testId"       AS test_id,
              t.name            AS test_name,
              json_agg(ts ORDER BY ts."order") FILTER (WHERE ts.id IS NOT NULL) AS steps
       FROM   execution_results er
       JOIN   tests      t  ON t.id  = er."testId"
       LEFT JOIN test_steps ts ON ts."testId" = t.id AND ts."isDisabled" = false
       WHERE  er."executionId" = $1
       GROUP  BY er.id, er."testId", t.name
       ORDER  BY er."createdAt"`,
      [EXECUTION_ID],
    );

    console.log(`[executor] Running ${results.length} test(s) for execution ${EXECUTION_ID}`);

    for (const row of results) {
      const { result_id, test_id, test_name, steps } = row;
      const activeSteps = (steps ?? []).filter(Boolean);

      console.log(`[executor] Test "${test_name}" — ${activeSteps.length} step(s)`);
      await publish(redis, 'result:started', { testId: test_id, testName: test_name });

      const startTime = Date.now();
      let status = 'COMPLETED';
      let errorMessage = null;
      let failedStepId = null;

      const videoPath = path.join(ARTIFACTS_DIR, EXECUTION_ID, `${test_id}.webm`);
      const context = await browser.newContext({
        recordVideo: {
          dir: path.join(ARTIFACTS_DIR, EXECUTION_ID),
          size: { width: 1280, height: 720 },
        },
      });
      const page = await context.newPage();

      try {
        for (const step of activeSteps) {
          console.log(`[executor]   step [${step.action}] ${step.selector ?? step.value ?? ''}`);
          const stepStart = Date.now();
          failedStepId = step.id;

          await runStep(page, step);

          await db.query(
            `INSERT INTO step_results (id, "executionResultId", "stepId", status, "durationMs", "createdAt")
             VALUES (gen_random_uuid(), $1, $2, 'PASSED', $3, NOW())`,
            [result_id, step.id, Date.now() - stepStart],
          );
        }

        // Screenshot final como thumbnail
        const screenshotPath = path.join(ARTIFACTS_DIR, EXECUTION_ID, `${test_id}_final.png`);
        await page.screenshot({ path: screenshotPath });
        console.log(`[executor] Test "${test_name}" PASSED`);

      } catch (err) {
        status = 'FAILED';
        errorMessage = String(err);
        console.error(`[executor] Test "${test_name}" FAILED: ${err}`);

        if (failedStepId) {
          await db.query(
            `INSERT INTO step_results (id, "executionResultId", "stepId", status, "durationMs", "errorDetails", "createdAt")
             VALUES (gen_random_uuid(), $1, $2, 'FAILED', 0, $3, NOW())`,
            [result_id, failedStepId, errorMessage],
          ).catch(() => null);
        }
      } finally {
        // Guardar video antes de cerrar el contexto
        await page.video()?.saveAs(videoPath).catch(() => null);
        await context.close();
      }

      const durationMs = Date.now() - startTime;
      await db.query(
        `UPDATE execution_results SET status = $1, "errorMessage" = $2, "durationMs" = $3 WHERE id = $4`,
        [status, errorMessage, durationMs, result_id],
      );

      await publish(redis, 'result:completed', { testId: test_id, status, durationMs });
    }

    await browser.close();
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
