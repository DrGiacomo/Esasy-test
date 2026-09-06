import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Edit3, Play } from 'lucide-react';
import { testsApi } from '../tests.api';
import { executionsApi } from '@/features/executions/executions.api';
import { api } from '@/lib/api/axios.client';
import type { Test, TestStep } from '@/types/models';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { StepList } from '../components/StepList';
import { ROUTES } from '@/router/routes';
import { useUiMode } from '@/hooks/useUiMode';

export default function TestDetailPage() {
  const { sencillo } = useUiMode();
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<
    (Test & { steps: TestStep[]; suite?: { projectId: string } }) | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!testId) return;
    testsApi
      .getOne(testId)
      .then(setTest)
      .finally(() => setLoading(false));
  }, [testId]);

  async function handleRun() {
    if (!test) return;
    setRunning(true);
    try {
      // Get projectId from suite (included in response), or fetch from suite endpoint as fallback
      let projectId = test.suite?.projectId;
      if (!projectId) {
        const suite = await api
          .get<{ projectId: string }>(`/suites/${test.suiteId}`)
          .then((r) => r.data);
        projectId = suite.projectId;
      }
      if (test.status !== 'ACTIVE') {
        const updated = await testsApi.update(test.id, { status: 'ACTIVE' });
        setTest((prev) => (prev ? { ...prev, status: updated.status } : prev));
      }
      const execution = await executionsApi.trigger({
        projectId,
        suiteId: test.suiteId,
        testId: test.id,
      });
      navigate(`/executions/${execution.id}`);
    } catch (err) {
      alert(`Error al ejecutar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunning(false);
    }
  }

  /**
   * Cambia el estado de la prueba. El `onChange` de antes era `async` sin `catch`: si la
   * llamada fallaba, el desplegable se quedaba mostrando el valor nuevo y la prueba seguia
   * como estaba. El usuario creia haberla activado y no lo habia hecho.
   */
  async function cambiarEstado(nuevo: string) {
    if (!test) return;
    const anterior = test.status;
    setTest((prev) => (prev ? { ...prev, status: nuevo as typeof prev.status } : prev));
    try {
      const actualizado = await testsApi.update(test.id, { status: nuevo });
      setTest((prev) => (prev ? { ...prev, status: actualizado.status } : prev));
    } catch (err) {
      setTest((prev) => (prev ? { ...prev, status: anterior } : prev));
      alert(`No se pudo cambiar el estado: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  if (!test) return <p className="text-texto-tenue">Test no encontrado</p>;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-texto">{test.name}</h1>
          <p className="mt-1 text-sm text-texto-tenue">{test.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {/*
            En cristiano y no en ingles: «DRAFT» no le dice nada a quien no programa, y el
            estado decide si la prueba se ejecuta o no. ARCHIVED entra en la lista porque
            existe en la base: sin el, una prueba archivada no se podia recuperar desde aqui.
          */}
          <select
            value={test.status}
            onChange={(e) => void cambiarEstado(e.target.value)}
            className="rounded-md border border-linea px-2 py-1 text-xs font-medium focus:outline-none focus:border-oro-500"
          >
            <option value="DRAFT">Borrador</option>
            <option value="ACTIVE">Activa</option>
            <option value="ARCHIVED">Archivada</option>
          </select>
          <Link to={ROUTES.FLOW_EDITOR(test.id)}>
            <Button variant="secondary" size="sm">
              <Edit3 size={14} />
              Editor visual
            </Button>
          </Link>
          <Button size="sm" onClick={() => void handleRun()} loading={running}>
            <Play size={14} />
            Ejecutar
          </Button>
        </div>
      </div>

      {/*
        Una prueba recien convertida desde una grabacion nace en borrador, y las pruebas en
        borrador NO se ejecutan. Sin este aviso, el usuario le daba a Ejecutar y no pasaba
        nada que el pudiera entender. El boton de activar va aqui mismo: decirle que le falta
        un paso sin darselo hecho es la mitad del trabajo.
      */}
      {test.status === 'DRAFT' && (
        <div className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-espera-500 bg-espera-100 p-4">
          <div className="text-sm text-espera-500">
            <p className="font-semibold">Esta prueba está en borrador y no se ejecutará.</p>
            <p className="mt-1 text-espera-500">
              Las pruebas en borrador se quedan fuera de las ejecuciones para que algo a medio
              hacer no dé falsas alarmas. Actívala cuando la des por buena.
            </p>
          </div>
          <Button size="sm" onClick={() => void cambiarEstado('ACTIVE')}>
            Activar
          </Button>
        </div>
      )}

      {test.status === 'ARCHIVED' && (
        <div className="mb-4 rounded-xl border border-linea bg-superficie p-4 text-sm text-texto">
          <p className="font-semibold">Esta prueba está archivada y no se ejecutará.</p>
          <p className="mt-1">
            Se conserva por si hace falta, pero queda fuera de las ejecuciones. Cámbiala a
            «Activa» arriba para volver a usarla.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-linea bg-superficie p-5">
        <h2 className="mb-4 text-sm font-semibold text-texto">Pasos ({test.steps.length})</h2>
        <StepList
          steps={test.steps}
          testId={test.id}
          onUpdate={() => {
            if (testId) testsApi.getOne(testId).then(setTest);
          }}
        />
      </div>

      {/*
        La documentacion en lenguaje llano va ANTES que el codigo y se ve en los dos
        modos: es el artefacto pensado para quien no programa (§3, «IA Contextual»).
      */}
      {test.documentation && (
        <div className="mt-4 rounded-xl border border-linea bg-superficie p-5">
          <h2 className="mb-3 text-sm font-semibold text-texto">Qué hace esta prueba</h2>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-texto">
            {test.documentation}
          </div>
          {test.documentedAt && (
            <p className="mt-3 text-xs text-texto-tenue">
              Generado por IA el {new Date(test.documentedAt).toLocaleString('es-ES')}. Si los pasos
              cambiaron después, vuelve a generarla.
            </p>
          )}
        </div>
      )}

      {/* El codigo TypeScript es lo primero que el §2.1 dice no ensenar en modo sencillo. */}
      {!sencillo && test.generatedCode && (
        <div className="mt-4 rounded-xl border border-linea bg-tinta-900 p-5">
          <h2 className="mb-3 text-sm font-semibold text-tinta-300">Código generado (TypeScript)</h2>
          <pre className="overflow-x-auto text-xs text-tinta-200">{test.generatedCode}</pre>
        </div>
      )}
    </div>
  );
}
