import { NotFoundException } from '@nestjs/common';
import { RecorderService } from './recorder.service';

function build() {
  const prisma = {
    recording: { findUnique: jest.fn(), delete: jest.fn() },
    testSuite: { findFirst: jest.fn() },
    project: { findFirst: jest.fn() },
    test: { create: jest.fn() },
    testStep: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const config = { get: jest.fn() };
  const jwt = { sign: jest.fn() };
  const service = new RecorderService(config as never, prisma as never, jwt as never);
  return { prisma, service };
}

describe('RecorderService.start — multi-tenant', () => {
  const user = { sub: 'u1', orgId: 'org-1', role: 'ADMIN' } as never;

  it('rechaza un projectId de otra org sin provisionar el contenedor', async () => {
    const { prisma, service } = build();
    prisma.project.findFirst.mockResolvedValue(null);

    await expect(service.start('proj-ajeno', 'http://x', user)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.project.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'proj-ajeno', organizationId: 'org-1' },
      }),
    );
  });
});

describe('RecorderService.getRecording', () => {
  it('lanza si la grabación no existe o es de otra org', async () => {
    const { prisma, service } = build();
    prisma.recording.findUnique.mockResolvedValue(null);
    await expect(service.getRecording('r1', 'org-1')).rejects.toBeInstanceOf(NotFoundException);

    prisma.recording.findUnique.mockResolvedValue({ id: 'r1', orgId: 'org-2' });
    await expect(service.getRecording('r1', 'org-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('devuelve la grabación de la org correcta', async () => {
    const { prisma, service } = build();
    prisma.recording.findUnique.mockResolvedValue({ id: 'r1', orgId: 'org-1' });
    await expect(service.getRecording('r1', 'org-1')).resolves.toEqual({
      id: 'r1',
      orgId: 'org-1',
    });
  });
});

describe('RecorderService.convertToTest', () => {
  it('lanza si la suite no pertenece a la org', async () => {
    const { prisma, service } = build();
    prisma.recording.findUnique.mockResolvedValue({
      id: 'r1',
      orgId: 'org-1',
      targetUrl: 'http://x',
      steps: [],
    });
    prisma.testSuite.findFirst.mockResolvedValue(null);
    await expect(service.convertToTest('r1', 'suite-1', 'My Test', 'org-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('colapsa typing consecutivo, deduplica navigates y conserva selectorType', async () => {
    const { prisma, service } = build();
    prisma.recording.findUnique.mockResolvedValue({
      id: 'r1',
      orgId: 'org-1',
      targetUrl: 'http://x',
      steps: [
        { type: 'navigate', url: 'http://x' },
        { type: 'navigate', url: 'http://x' }, // duplicado → se descarta
        { type: 'click', selector: '[data-testid="login"]', selectorType: 'testId' },
        { type: 'type', value: 'he' },
        { type: 'type', value: 'llo' }, // se fusiona con el anterior
      ],
    });
    prisma.testSuite.findFirst.mockResolvedValue({
      id: 'suite-1',
      project: { baseUrl: 'http://x' },
    });
    prisma.test.create.mockResolvedValue({ id: 'test-1' });

    const tx = {
      test: { create: prisma.test.create },
      testStep: { create: prisma.testStep.create },
    };
    prisma.$transaction.mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx));

    await service.convertToTest('r1', 'suite-1', 'My Test', 'org-1');

    // navigate (1) + click (1) + type fusionado (1) = 3 steps
    expect(prisma.testStep.create).toHaveBeenCalledTimes(3);

    const created = prisma.testStep.create.mock.calls.map((c) => c[0].data);
    // Mismo origen que la baseUrl del proyecto -> se guarda la parte relativa
    expect(created[0]).toMatchObject({ order: 0, action: 'navigate', value: '/' });
    expect(created[1]).toMatchObject({
      order: 1,
      action: 'click',
      selector: '[data-testid="login"]',
      selectorType: 'testId',
    });
    expect(created[2]).toMatchObject({ order: 2, action: 'fill', value: 'hello' });
  });

  /**
   * Guardar la direccion relativa al proyecto es lo que permite mover la aplicacion de
   * entorno sin editar los tests uno a uno. Pero solo vale DENTRO del proyecto: un paso
   * que sale a otro dominio -una pasarela de pago, un correo- tiene que seguir yendo
   * donde iba aunque el proyecto se mueva. Los tres casos, por separado.
   */
  describe('la direccion de los pasos navigate', () => {
    async function convertirCon(baseUrl: string | null, urls: string[]): Promise<string[]> {
      const { prisma, service } = build();
      prisma.recording.findUnique.mockResolvedValue({
        id: 'r1',
        orgId: 'org-1',
        targetUrl: urls[0],
        steps: urls.map((url) => ({ type: 'navigate', url })),
      });
      prisma.testSuite.findFirst.mockResolvedValue({ id: 'suite-1', project: { baseUrl } });
      prisma.test.create.mockResolvedValue({ id: 'test-1' });
      const tx = {
        test: { create: prisma.test.create },
        testStep: { create: prisma.testStep.create },
      };
      prisma.$transaction.mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx));
      await service.convertToTest('r1', 'suite-1', 'T', 'org-1');
      const llamadas = prisma.testStep.create.mock.calls as Array<[{ data: { value: string } }]>;
      return llamadas.map((c) => c[0].data.value);
    }

    it('dentro del proyecto: se guarda relativa', async () => {
      const valores = await convertirCon('https://app.ejemplo.com', [
        'https://app.ejemplo.com/login?next=/panel',
      ]);
      expect(valores[0]).toBe('/login?next=/panel');
    });

    it('otro dominio: se guarda entera', async () => {
      const valores = await convertirCon('https://app.ejemplo.com', [
        'https://pasarela-de-pago.com/checkout',
      ]);
      expect(valores[0]).toBe('https://pasarela-de-pago.com/checkout');
    });

    it('sin baseUrl: no se toca nada', async () => {
      const valores = await convertirCon(null, ['https://app.ejemplo.com/login']);
      expect(valores[0]).toBe('https://app.ejemplo.com/login');
    });
  });
});

/**
 * El fallo que delató la primera grabación real (`www.frivclassic.com`, 2026-09-06): la
 * prueba no incluía ir a la página donde se grabó, así que al reproducirla el navegador
 * arrancaba en blanco y el primer clic esperaba 30 segundos a un elemento inexistente.
 * Ninguna prueba grabada podía funcionar.
 */
describe('convertToTest — la prueba empieza yendo a donde se grabó', () => {
  function convertirDesde(targetUrl: string | null, steps: unknown[], baseUrl: string | null) {
    const { prisma, service } = build();
    prisma.recording.findUnique.mockResolvedValue({ id: 'r1', orgId: 'org-1', targetUrl, steps });
    prisma.testSuite.findFirst.mockResolvedValue({ id: 'suite-1', project: { baseUrl } });
    prisma.test.create.mockResolvedValue({ id: 'test-1' });
    const tx = {
      test: { create: prisma.test.create },
      testStep: { create: prisma.testStep.create },
    };
    prisma.$transaction.mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx));
    return { prisma, service, tx };
  }

  it('antepone la navegación a la URL grabada cuando la grabación empieza con un clic', async () => {
    const { prisma, service } = convertirDesde(
      'https://www.ejemplo.com/',
      [{ type: 'click', selector: '#boton' }],
      null,
    );
    await service.convertToTest('r1', 'suite-1', 'T', 'org-1');

    const creados = prisma.testStep.create.mock.calls as Array<
      [{ data: { order: number; action: string; value: string | null } }]
    >;
    expect(creados).toHaveLength(2);
    expect(creados[0][0].data).toMatchObject({
      order: 0,
      action: 'navigate',
      value: 'https://www.ejemplo.com/',
    });
    expect(creados[1][0].data).toMatchObject({ order: 1, action: 'click' });
  });

  it('NO la duplica si la grabación ya empieza navegando', async () => {
    const { prisma, service } = convertirDesde(
      'https://www.ejemplo.com/',
      [{ type: 'navigate', url: 'https://www.ejemplo.com/otra' }],
      null,
    );
    await service.convertToTest('r1', 'suite-1', 'T', 'org-1');
    const creados = prisma.testStep.create.mock.calls as Array<
      [{ data: { value: string | null } }]
    >;
    expect(creados).toHaveLength(1);
    expect(creados[0][0].data.value).toBe('https://www.ejemplo.com/otra');
  });

  it('la navegación añadida también se guarda relativa al proyecto', async () => {
    const { prisma, service } = convertirDesde(
      'https://app.ejemplo.com/panel',
      [{ type: 'click', selector: '#boton' }],
      'https://app.ejemplo.com',
    );
    await service.convertToTest('r1', 'suite-1', 'T', 'org-1');
    const creados = prisma.testStep.create.mock.calls as Array<
      [{ data: { value: string | null } }]
    >;
    expect(creados[0][0].data.value).toBe('/panel');
  });
});

/**
 * Una descripción de paso no puede enseñar un selector: quien la lee no programa (`P3`). La
 * grabación real de `www.frivclassic.com` produjo «Pulsar #flashObject», y eso contradecía
 * lo que la Fase 4 dio por verificado midiéndolo con datos sembrados por nosotros.
 */
describe('cómo se nombra un elemento en la descripción', () => {
  function nombrarDesde(step: Record<string, unknown>): string {
    const { service } = build();
    const privado = service as unknown as {
      toTestStep(s: unknown): { description: string };
    };
    return privado.toTestStep({ type: 'click', ...step }).description;
  }

  it('usa la etiqueta del elemento cuando la hay', () => {
    expect(nombrarDesde({ label: 'Entrar', selector: '#btn' })).toBe('Pulsar «Entrar»');
  });

  it('traduce un id a lenguaje llano en vez de escupirlo', () => {
    const d = nombrarDesde({ selector: '#flashObject' });
    expect(d).not.toContain('#');
    expect(d).toBe('Pulsar el elemento «flash object»');
  });

  it('traduce los atributos más comunes', () => {
    expect(nombrarDesde({ selector: '[name="email"]' })).toBe('Pulsar el campo «email»');
    expect(nombrarDesde({ selector: '[aria-label="Cerrar"]' })).toBe('Pulsar «Cerrar»');
    expect(nombrarDesde({ selector: '[data-testid="guardar"]' })).toBe('Pulsar «guardar»');
  });

  it('reconoce el tipo de elemento cuando no hay nada mejor', () => {
    expect(nombrarDesde({ selector: 'button.primario' })).toBe('Pulsar el boton');
    expect(nombrarDesde({ selector: 'a' })).toBe('Pulsar el enlace');
  });

  it('nunca deja pasar un selector crudo, aunque no sepa traducirlo', () => {
    const d = nombrarDesde({ selector: 'div > .x:nth-child(3)' });
    expect(d).not.toContain('nth-child');
    expect(d).toBe('Pulsar el elemento');
  });
});
