// Prueba ligera del flujo de GRABACIÓN: provisiona el contenedor recorder,
// detiene la sesión (persiste la grabación) y la convierte en test.
// No simula interacción real del usuario (CDP), así que la grabación puede salir
// con pocos/cero pasos; el objetivo es validar el cableado infra + persistencia + convert.
const BASE = 'http://localhost:3000/api/v1';
let token;
async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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
  const auth = await call('POST', '/auth/register', {
    email: `rec_${stamp}@example.com`, password: 'Sup3rSecret!', displayName: 'Rec Tester', organizationName: `RecOrg ${stamp}`,
  });
  token = auth.accessToken;
  const project = await call('POST', '/projects', { name: 'Rec Project', baseUrl: 'https://example.com' });
  const suite = await call('POST', `/projects/${project.id}/suites`, { name: 'Rec Suite' });

  console.log('start recorder session...');
  const session = await call('POST', '/recorder/sessions', { projectId: project.id, targetUrl: 'https://example.com' });
  console.log('   sessionId:', session.sessionId, 'container:', session.containerId?.slice(0, 12));

  await sleep(4000); // dar tiempo a que el contenedor arranque y navegue

  console.log('stop recorder session (persist)...');
  await call('DELETE', `/recorder/sessions/${session.sessionId}`);

  const recs = await call('GET', `/recorder/recordings?projectId=${project.id}`);
  console.log('   recordings:', recs.length, 'steps capturados:', recs[0]?.steps?.length ?? 'n/a');

  if (recs[0]) {
    console.log('convert recording -> test...');
    const test = await call('POST', `/recorder/recordings/${recs[0].id}/convert`, { suiteId: suite.id, testName: 'From Recording' });
    console.log('   testId:', test.id, 'name:', test.name);
  }
  console.log('RECORDER OK');
})().catch((e) => { console.error('RECORDER ERROR:', e.message); process.exit(1); });
