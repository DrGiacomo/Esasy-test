/**
 * Datos de demostración de Easy Test.
 *
 * Existe porque con el flujo core funcionando al 95 % lo que faltaba para poder enseñar la
 * plataforma no era producto: era que al abrirla hubiera algo dentro en vez de una pantalla
 * vacía. Entregable `4.4` de la Fase 4 (`Docs/PROJECT_CONTEXT.md` §6).
 *
 * Salvaguardas, copiadas del patrón de `Inducción S.A.A.I`:
 *
 * - **Idempotente.** Correrlo dos veces deja la base igual que correrlo una.
 * - **Marca todo con `[demo]`** y `--borrar` retira solo lo suyo, nunca datos de nadie.
 * - **Se niega a sembrar si ya hay datos reales**, salvo `--forzar`.
 * - **Crea su PROPIA organización.** Nunca siembra dentro de una existente: en una
 *   plataforma multi-tenant, meter datos de mentira en la organización de alguien es
 *   contaminarle la suya.
 * - **Cuenta una historia.** Un test que pasa, uno que falla por un selector roto con su
 *   propuesta de reparación esperando aprobación, y uno a medias. Sin eso, el seed llena
 *   tablas pero no enseña nada.
 *
 * Uso:
 *   npm run db:seed              siembra
 *   npm run db:seed -- --borrar  retira lo sembrado
 *   npm run db:seed -- --forzar  siembra aunque haya datos reales
 */

import {
  PrismaClient,
  MemberRole,
  TestStatus,
  ExecutionStatus,
  StepResultStatus,
  HealingStatus,
  UiMode,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/** Todo lo sembrado lleva esta marca en su nombre. Es lo que hace posible `--borrar`. */
const MARCA = '[demo]';
const SLUG_ORG = 'demostracion-easy-test';

/**
 * Contraseña de los usuarios de demostración.
 *
 * Va en claro aquí a propósito y no es un descuido: son cuentas de una organización de
 * mentira, en una base de datos de pruebas, y el guion final las imprime porque sin ellas
 * el seed no sirve para nada. Si esto se siembra en un entorno real, el problema no es la
 * contraseña: es que se sembró.
 */
const CLAVE_DEMO = 'demo1234';

const USUARIOS = [
  {
    email: 'ana@demo.local',
    displayName: `Ana Ruiz ${MARCA}`,
    role: MemberRole.ADMIN,
    uiMode: UiMode.SENCILLO,
    quien: 'QA manual — no programa. Ve la plataforma en modo SENCILLO.',
  },
  {
    email: 'dani@demo.local',
    displayName: `Dani Soto ${MARCA}`,
    role: MemberRole.EDITOR,
    uiMode: UiMode.COMPLEJO,
    quien: 'QA automation — audita el código. Ve la plataforma en modo COMPLEJO.',
  },
];

function log(msg: string) {
  console.log(msg);
}

/** ¿Hay algo que no sea de demostración en esta base? */
async function hayDatosReales(): Promise<boolean> {
  const orgsAjenas = await prisma.organization.count({ where: { slug: { not: SLUG_ORG } } });
  return orgsAjenas > 0;
}

async function borrar(): Promise<void> {
  const org = await prisma.organization.findUnique({ where: { slug: SLUG_ORG } });
  if (!org) {
    log(`No hay nada que borrar: no existe la organización ${MARCA}.`);
    return;
  }

  // El borrado en cascada de Organization arrastra proyectos, suites, tests, pasos,
  // ejecuciones y resultados. Los usuarios NO cuelgan de la organización, así que van
  // aparte — y solo los de demostración, por email.
  await prisma.organization.delete({ where: { id: org.id } });
  const { count } = await prisma.user.deleteMany({
    where: { email: { in: USUARIOS.map((u) => u.email) } },
  });

  log(`Borrada la organización ${MARCA} y ${count} usuario(s) de demostración.`);
}

async function sembrar(forzar: boolean): Promise<void> {
  if (!forzar && (await hayDatosReales())) {
    log('');
    log('  ABORTADO: esta base de datos ya tiene organizaciones que no son de demostración.');
    log('');
    log('  El seed no siembra sobre datos reales. Si de verdad quieres hacerlo:');
    log('      npm run db:seed -- --forzar');
    log('');
    process.exitCode = 1;
    return;
  }

  // Idempotencia por la vía barata y segura: si ya está sembrado, se retira y se rehace.
  // Es más honesto que un upsert campo a campo, que va dejando restos de versiones viejas.
  const yaEstaba = await prisma.organization.findUnique({ where: { slug: SLUG_ORG } });
  if (yaEstaba) {
    log('Ya había datos de demostración: se rehacen desde cero.');
    await borrar();
  }

  const passwordHash = await bcrypt.hash(CLAVE_DEMO, 12);

  const org = await prisma.organization.create({
    data: { name: `Organización de demostración ${MARCA}`, slug: SLUG_ORG },
  });

  const usuarios = [];
  for (const u of USUARIOS) {
    const user = await prisma.user.create({
      data: { email: u.email, displayName: u.displayName, passwordHash, uiMode: u.uiMode },
    });
    await prisma.membership.create({
      data: { userId: user.id, organizationId: org.id, role: u.role },
    });
    usuarios.push(user);
  }
  const [ana, dani] = usuarios;

  const project = await prisma.project.create({
    data: {
      organizationId: org.id,
      name: `Tienda de ejemplo ${MARCA}`,
      description: 'Aplicación de mentira para ver cómo funciona la plataforma.',
      baseUrl: 'https://example.com',
    },
  });

  const suite = await prisma.testSuite.create({
    data: {
      projectId: project.id,
      name: `Acceso de usuarios ${MARCA}`,
      description: 'Las pruebas del inicio de sesión.',
    },
  });

  // ─── Test 1: pasa ───────────────────────────────────────────────────────────────
  // Las descripciones son las que ve el modo SENCILLO: ni un selector dentro.
  const testOk = await prisma.test.create({
    data: {
      suiteId: suite.id,
      name: `Entrar con usuario y contraseña correctos ${MARCA}`,
      description: 'Comprueba que alguien con sus datos bien puestos consigue entrar.',
      status: TestStatus.ACTIVE,
      flowModel: [],
      steps: {
        create: [
          {
            order: 0,
            action: 'navigate',
            value: 'https://example.com/entrar',
            description: 'Ir a la página de acceso',
          },
          {
            order: 1,
            action: 'fill',
            selector: '[name="email"]',
            selectorType: 'css',
            value: 'ana@demo.local',
            description: 'Escribir "ana@demo.local" en «Correo electrónico»',
          },
          {
            order: 2,
            action: 'fill',
            selector: '[name="password"]',
            selectorType: 'css',
            value: 'demo1234',
            description: 'Escribir la contraseña en «Contraseña»',
          },
          {
            order: 3,
            action: 'click',
            selector: 'text="Entrar"',
            selectorType: 'text',
            description: 'Pulsar «Entrar»',
          },
          {
            order: 4,
            action: 'assert_text',
            selector: '[data-testid="saludo"]',
            selectorType: 'testId',
            value: 'Hola, Ana',
            description: 'Comprobar que aparece el saludo «Hola, Ana»',
          },
        ],
      },
    },
    include: { steps: { orderBy: { order: 'asc' } } },
  });

  // ─── Test 2: falla por un selector roto ─────────────────────────────────────────
  const testRoto = await prisma.test.create({
    data: {
      suiteId: suite.id,
      name: `Avisar cuando la contraseña es incorrecta ${MARCA}`,
      description: 'Comprueba que se avisa al usuario si se equivoca de contraseña.',
      status: TestStatus.ACTIVE,
      flowModel: [],
      steps: {
        create: [
          {
            order: 0,
            action: 'navigate',
            value: 'https://example.com/entrar',
            description: 'Ir a la página de acceso',
          },
          {
            order: 1,
            action: 'fill',
            selector: '[name="email"]',
            selectorType: 'css',
            value: 'ana@demo.local',
            description: 'Escribir "ana@demo.local" en «Correo electrónico»',
          },
          {
            order: 2,
            action: 'fill',
            selector: '[name="password"]',
            selectorType: 'css',
            value: 'clave-mala',
            description: 'Escribir una contraseña equivocada',
          },
          {
            order: 3,
            action: 'click',
            selector: 'text="Entrar"',
            selectorType: 'text',
            description: 'Pulsar «Entrar»',
          },
          // Este es el que se rompe: la página cambió y la clase ya no existe.
          {
            order: 4,
            action: 'assert_visible',
            selector: '.alert-danger-v1',
            selectorType: 'css',
            confidenceScore: 0.21,
            description: 'Comprobar que aparece el aviso de error',
          },
        ],
      },
    },
    include: { steps: { orderBy: { order: 'asc' } } },
  });

  // ─── Test 3: a medias, sin pasos ────────────────────────────────────────────────
  await prisma.test.create({
    data: {
      suiteId: suite.id,
      name: `Recuperar la contraseña olvidada ${MARCA}`,
      description: 'Empezada y sin terminar: aparece como borrador.',
      status: TestStatus.DRAFT,
      flowModel: [],
    },
  });

  // ─── Una ejecución pasada, para que los informes no salgan vacíos ───────────────
  const hace2h = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const hace2hMenos = new Date(hace2h.getTime() + 47_000);

  const execution = await prisma.execution.create({
    data: {
      projectId: project.id,
      triggeredBy: dani.id,
      status: ExecutionStatus.FAILED, // una de las dos falló
      startedAt: hace2h,
      completedAt: hace2hMenos,
    },
  });

  const resultOk = await prisma.executionResult.create({
    data: {
      executionId: execution.id,
      testId: testOk.id,
      status: ExecutionStatus.COMPLETED,
      durationMs: 18_420,
    },
  });
  await prisma.stepResult.createMany({
    data: testOk.steps.map((s, i) => ({
      executionResultId: resultOk.id,
      stepId: s.id,
      status: StepResultStatus.PASSED,
      durationMs: [1200, 3100, 2800, 4300, 7020][i] ?? 1000,
    })),
  });

  const resultMal = await prisma.executionResult.create({
    data: {
      executionId: execution.id,
      testId: testRoto.id,
      status: ExecutionStatus.FAILED,
      durationMs: 29_180,
      errorMessage:
        'TimeoutError: no se encontró el elemento ".alert-danger-v1" tras esperar 15 s.\n' +
        'La página respondió correctamente, pero ese elemento ya no existe.',
    },
  });
  await prisma.stepResult.createMany({
    data: testRoto.steps.map((s, i) => {
      const roto = i === 4;
      return {
        executionResultId: resultMal.id,
        stepId: s.id,
        status: roto ? StepResultStatus.FAILED : StepResultStatus.PASSED,
        durationMs: roto ? 15_040 : ([1100, 2900, 2700, 4200][i] ?? 1000),
        errorDetails: roto ? 'No se encontró el elemento tras esperar 15 s.' : null,
      };
    }),
  });

  // ─── La propuesta de reparación, esperando a que una persona decida ─────────────
  const pasoRoto = testRoto.steps[4];
  await prisma.selectorHealingLog.create({
    data: {
      testId: testRoto.id,
      stepId: pasoRoto.id,
      brokenSelector: '.alert-danger-v1',
      proposedSelector: '[role="alert"]',
      confidenceBefore: 0.21,
      confidenceAfter: 0.88,
      reasoning:
        'El elemento con clase "alert-danger-v1" ya no aparece en la página. En su lugar hay ' +
        'un elemento con role="alert" que contiene el mismo texto de aviso y ocupa la misma ' +
        'posición. Los roles de accesibilidad cambian mucho menos que las clases de estilo.',
      status: HealingStatus.PENDING_APPROVAL,
    },
  });

  // ─── El guion: sin esto, el seed llena tablas y nadie sabe qué mirar ───────────
  log('');
  log('  ════════════════════════════════════════════════════════════════');
  log('   Datos de demostración sembrados');
  log('  ════════════════════════════════════════════════════════════════');
  log('');
  log('  Entra con cualquiera de estas dos cuentas — la contraseña es la misma:');
  log('');
  for (const u of USUARIOS) {
    log(`      ${u.email.padEnd(18)} / ${CLAVE_DEMO}`);
    log(`      ${' '.repeat(18)}   ${u.quien}`);
    log('');
  }
  log('  Qué mirar, en este orden:');
  log('');
  log('   1. Entra como ana@demo.local. Abre la prueba «Entrar con usuario y');
  log('      contraseña correctos». Los pasos se leen como frases:');
  log('      «Pulsar «Entrar»», no «click text="Entrar"».');
  log('      No debería aparecer NINGÚN selector CSS en la pantalla.');
  log('');
  log('   2. Despliega «ver detalle técnico» en un paso: ahí sí está el selector.');
  log('      Escondido, nunca inaccesible.');
  log('');
  log('   3. Abre la prueba «Avisar cuando la contraseña es incorrecta»:');
  log('      falló, y hay una propuesta de reparación esperando aprobación.');
  log('      La IA cambia una clase de estilo por un rol de accesibilidad.');
  log('      Nadie la aplica hasta que una persona diga que sí.');
  log('');
  log('   4. Abre el informe de la ejecución de hace dos horas. Y el mismo');
  log('      informe en HTML: /reports/<id>/html');
  log('');
  log('   5. Ahora sal y entra como dani@demo.local. Es la misma plataforma');
  log('      en modo COMPLEJO: selectores, código y Git a la vista.');
  log('');
  log('  Para retirar todo esto:  npm run db:seed -- --borrar');
  log('');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--borrar')) {
    await borrar();
    return;
  }
  await sembrar(args.includes('--forzar'));
}

main()
  .catch((err) => {
    console.error('El seed falló:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
