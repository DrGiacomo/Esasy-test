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

async function runStep(page, step) {
  const { action, selector, value } = step;

  switch (action) {
    case 'navigate':
      await page.goto(value || selector, { waitUntil: 'domcontentloaded', timeout: 30000 });
      break;

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

async function runTest(browser, db, redis, row) {
  const { result_id, test_id, test_name, steps } = row;
  const activeSteps = (steps ?? []).filter(Boolean);

  console.log(`[executor] Test "${test_name}" — ${activeSteps.length} step(s)`);
  await publish(redis, 'result:started', { testId: test_id, testName: test_name });

  const startTime = Date.now();
  let status = 'COMPLETED';
  let errorMessage = null;
  let failedStepId = null;

  const contextOptions = RECORD_VIDEO
    ? { recordVideo: { dir: path.join(ARTIFACTS_DIR, EXECUTION_ID), size: { width: 1280, height: 720 } } }
    : {};

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  const stepResults = []; // collect results in-memory, bulk-insert at the end

  try {
    for (const step of activeSteps) {
      console.log(`[executor]   step [${step.action}] ${step.selector ?? step.value ?? ''}`);
      const stepStart = Date.now();
      failedStepId = step.id;

      await runStep(page, step);

      stepResults.push({ stepId: step.id, status: 'PASSED', durationMs: Date.now() - stepStart, errorDetails: null });
    }

    // Final screenshot only when video is off (video already captures everything)
    if (!RECORD_VIDEO) {
      const screenshotPath = path.join(ARTIFACTS_DIR, EXECUTION_ID, `${test_id}_final.png`);
      await page.screenshot({ path: screenshotPath });
    }

    console.log(`[executor] Test "${test_name}" PASSED`);

  } catch (err) {
    status = 'FAILED';
    errorMessage = String(err);
    console.error(`[executor] Test "${test_name}" FAILED: ${err}`);

    if (failedStepId) {
      stepResults.push({ stepId: failedStepId, status: 'FAILED', durationMs: 0, errorDetails: errorMessage });
    }
  } finally {
    if (RECORD_VIDEO) {
      const videoPath = path.join(ARTIFACTS_DIR, EXECUTION_ID, `${test_id}.webm`);
      const timeout = new Promise(r => setTimeout(r, 15000)); // max 15s to save video
      await Promise.race([page.video()?.saveAs(videoPath).catch(() => null), timeout]);
    }
    await Promise.race([context.close(), new Promise(r => setTimeout(r, 10000))]);
  }

  // Bulk-insert all step results in one query
  if (stepResults.length > 0) {
    const values = stepResults.map((_, i) => {
      const base = i * 5;
      return `(gen_random_uuid(), $${base+1}, $${base+2}, $${base+3}, $${base+4}, $${base+5}, NOW())`;
    }).join(', ');

    const params = stepResults.flatMap(r => [result_id, r.stepId, r.status, r.durationMs, r.errorDetails]);
    await db.query(
      `INSERT INTO step_results (id, "executionResultId", "stepId", status, "durationMs", "errorDetails", "createdAt") VALUES ${values}`,
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

async function main() {
  const db    = new Client({ connectionString: DATABASE_URL });
  const redis = createClient({ url: REDIS_URL });

  fs.mkdirSync(path.join(ARTIFACTS_DIR, EXECUTION_ID), { recursive: true });

  // Initialize all three in parallel
  const [browser] = await Promise.all([
    chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] }),
    db.connect(),
    redis.connect(),
  ]);

  try {
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

    console.log(`[executor] Running ${results.length} test(s) for execution ${EXECUTION_ID} (max ${MAX_PARALLEL} parallel)`);

    // Run tests in parallel batches of MAX_PARALLEL
    for (let i = 0; i < results.length; i += MAX_PARALLEL) {
      const batch = results.slice(i, i + MAX_PARALLEL);
      await Promise.allSettled(batch.map(row => runTest(browser, db, redis, row)));
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
