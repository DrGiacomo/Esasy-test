// Orquesta el flujo de EJECUCIÓN por la API REST para probar la inyección de
// secretos end-to-end. No cubre la grabación (CDP/browser), que se prueba aparte.
const BASE = 'http://localhost:3000/api/v1';
const log = (...a) => console.log(...a);

let token;
async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
  return json;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const stamp = Date.now();
  const email = `flowtest_${stamp}@example.com`;

  log('1) register');
  const auth = await call('POST', '/auth/register', {
    email, password: 'Sup3rSecret!', displayName: 'Flow Tester', organizationName: `Org ${stamp}`,
  });
  token = auth.accessToken;
  log('   token len:', token?.length);

  log('2) create project');
  const project = await call('POST', '/projects', { name: 'Flow Project', baseUrl: 'https://example.com' });
  log('   projectId:', project.id);

  log('3) create suite');
  const suite = await call('POST', `/projects/${project.id}/suites`, { name: 'Flow Suite' });
  log('   suiteId:', suite.id);

  log('4) create test');
  const test = await call('POST', `/suites/${suite.id}/tests`, { name: 'Secret Resolution Test' });
  log('   testId:', test.id);

  log('5) add steps (navigate {{TARGET_URL}} + wait)');
  await call('POST', `/tests/${test.id}/steps`, { order: 0, action: 'navigate', value: '{{TARGET_URL}}' });
  await call('POST', `/tests/${test.id}/steps`, { order: 1, action: 'wait', value: '500' });

  log('6) create secret TARGET_URL (ENV_VAR)');
  await call('POST', '/secrets', { name: 'TARGET_URL', value: 'https://example.com', type: 'ENV_VAR' });

  log('7) activate test');
  await call('PATCH', `/tests/${test.id}`, { status: 'ACTIVE' });

  log('8) trigger execution');
  const exec = await call('POST', '/executions', { projectId: project.id, testId: test.id });
  log('   executionId:', exec.id);

  log('9) poll execution status...');
  let final;
  for (let i = 0; i < 60; i++) {
    await sleep(2000);
    const e = await call('GET', `/executions/${exec.id}`);
    log(`   [${i}] status=${e.status}`);
    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(e.status)) { final = e; break; }
  }

  const results = await call('GET', `/executions/${exec.id}/results`);
  log('\n=== FINAL EXECUTION ===');
  log(JSON.stringify(final, null, 2));
  log('=== RESULTS ===');
  log(JSON.stringify(results, null, 2));
  log('\nEXEC_ID=' + exec.id);
})().catch((e) => { console.error('FLOW ERROR:', e.message); process.exit(1); });
