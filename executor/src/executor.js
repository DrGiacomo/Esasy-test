'use strict';

const { chromium } = require('playwright');
const { Client } = require('pg');
const { createClient } = require('redis');
const fs = require('fs');
const path = require('path');

const EXECUTION_ID = process.env.EXECUTION_ID;
const REDIS_URL = process.env.REDIS_URL;
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
      await page.goto(selector, { waitUntil: 'networkidle' });
      break;
    case 'click':
      await page.click(selector);
      break;
    case 'dblclick':
      await page.dblclick(selector);
      break;
    case 'fill':
      await page.fill(selector, value ?? '');
      break;
    case 'press':
      await page.keyboard.press(value ?? 'Enter');
      break;
    case 'hover':
      await page.hover(selector);
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
    case 'screenshot':
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, EXECUTION_ID, `${step.id}.png`) });
      break;
    case 'wait':
      await page.waitForTimeout(parseInt(value ?? '1000', 10));
      break;
    default:
      console.warn(`[executor] Unknown step action: ${action}`);
  }
}

async function main() {
  const db = new Client({ connectionString: DATABASE_URL });
  const redis = createClient({ url: REDIS_URL });

  await db.connect();
  await redis.connect();

  fs.mkdirSync(path.join(ARTIFACTS_DIR, EXECUTION_ID), { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    // Cargar execution y sus resultados con tests y steps
    const { rows: results } = await db.query(
      `SELECT er.id as result_id, er.test_id,
              t.name as test_name, t.generated_code,
              json_agg(ts ORDER BY ts.order) as steps
       FROM "ExecutionResult" er
       JOIN "Test" t ON t.id = er.test_id
       LEFT JOIN "TestStep" ts ON ts.test_id = t.id AND ts.is_disabled = false
       WHERE er.execution_id = $1
       GROUP BY er.id, er.test_id, t.name, t.generated_code
       ORDER BY er.created_at`,
      [EXECUTION_ID],
    );

    for (const row of results) {
      const { result_id, test_id, test_name, steps } = row;
      const activeSteps = (steps ?? []).filter(Boolean);

      await publish(redis, 'result:started', { testId: test_id, testName: test_name });

      const startTime = Date.now();
      let status = 'COMPLETED';
      let errorMessage = null;

      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        for (const step of activeSteps) {
          const stepStart = Date.now();
          await runStep(page, step);
          await db.query(
            `INSERT INTO "StepResult" (execution_result_id, step_id, status, duration_ms, created_at)
             VALUES ($1, $2, 'COMPLETED', $3, NOW())`,
            [result_id, step.id, Date.now() - stepStart],
          );
        }

        // Capturar screenshot final
        const screenshotPath = path.join(ARTIFACTS_DIR, EXECUTION_ID, `${test_id}_final.png`);
        await page.screenshot({ path: screenshotPath });
      } catch (err) {
        status = 'FAILED';
        errorMessage = String(err);
        console.error(`[executor] Test "${test_name}" failed: ${err}`);

        await db.query(
          `INSERT INTO "StepResult" (execution_result_id, status, duration_ms, error_message, created_at)
           VALUES ($1, 'FAILED', 0, $2, NOW())`,
          [result_id, errorMessage],
        ).catch(() => null);
      } finally {
        await context.close();
      }

      const durationMs = Date.now() - startTime;
      await db.query(
        `UPDATE "ExecutionResult" SET status = $1, error_message = $2, duration_ms = $3 WHERE id = $4`,
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
