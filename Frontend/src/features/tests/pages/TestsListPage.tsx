import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, FlaskConical } from 'lucide-react';
import { testsApi } from '../tests.api';
import type { Test } from '@/types/models';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { TestCard } from '../components/TestCard';

export default function TestsListPage() {
  const { suiteId } = useParams<{ suiteId: string }>();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [testName, setTestName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!suiteId) return;
    testsApi
      .getBySuite(suiteId)
      .then(setTests)
      .finally(() => setLoading(false));
  }, [suiteId]);

  async function createTest(e: React.FormEvent) {
    e.preventDefault();
    if (!suiteId || !testName) return;
    setCreating(true);
    try {
      const t = await testsApi.create(suiteId, { name: testName });
      setTests((p) => [...p, t]);
      setShowModal(false);
      setTestName('');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-texto">Tests</h1>
        <Button onClick={() => setShowModal(true)}>
          <Plus size={16} />
          Nuevo test
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {!loading && tests.length === 0 && (
        <EmptyState
          icon={<FlaskConical size={48} />}
          title="Sin tests todavía"
          description="Crea tu primer test o usa el grabador para capturar pasos automáticamente."
          action={
            <Button onClick={() => setShowModal(true)}>
              <Plus size={16} />
              Crear test
            </Button>
          }
        />
      )}

      {!loading && tests.length > 0 && (
        <div className="space-y-2">
          {tests.map((t) => (
            <TestCard
              key={t.id}
              test={t}
              onArchive={async (id) => {
                await testsApi.archive(id);
                setTests((prev) => prev.filter((x) => x.id !== id));
              }}
            />
          ))}
        </div>
      )}

      <Modal open={showModal} title="Nuevo test" onClose={() => setShowModal(false)}>
        <form onSubmit={(e) => void createTest(e)} className="space-y-4">
          <input
            required
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            className="w-full rounded-lg border border-linea px-3 py-2 text-sm focus:border-oro-500 focus:outline-none"
            placeholder="Nombre del test"
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={creating}>
              Crear
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
