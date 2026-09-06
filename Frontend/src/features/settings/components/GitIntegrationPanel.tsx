import { useEffect, useState } from 'react';
import { api } from '@/lib/api/axios.client';
import type { GitIntegration } from '@/types/models';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Plus, Trash2, GitBranch } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function GitIntegrationPanel() {
  const [integrations, setIntegrations] = useState<GitIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ provider: 'GITHUB', repoUrl: '', branch: 'main', token: '' });
  const [creating, setCreating] = useState(false);

  function fetchIntegrations() {
    api
      .get<GitIntegration[]>('/git/integrations')
      .then((r) => setIntegrations(r.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchIntegrations();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/git/integrations', form);
      setShowCreate(false);
      fetchIntegrations();
    } finally {
      setCreating(false);
    }
  }

  async function remove(id: string) {
    await api.delete(`/git/integrations/${id}`);
    setIntegrations((p) => p.filter((i) => i.id !== id));
  }

  if (loading)
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus size={14} />
          Conectar repositorio
        </Button>
      </div>

      {integrations.length === 0 ? (
        <p className="rounded-xl border border-dashed border-linea p-8 text-center text-sm text-texto-tenue">
          No hay integraciones Git. Conecta un repositorio para sincronizar tus tests.
        </p>
      ) : (
        <div className="rounded-xl border border-linea bg-superficie overflow-hidden">
          {integrations.map((g, i) => (
            <div
              key={g.id}
              className={`flex items-center gap-4 px-4 py-3 ${i > 0 ? 'border-t border-linea' : ''}`}
            >
              <GitBranch size={16} className="text-texto-tenue" />
              <div className="flex-1">
                <p className="text-sm font-medium text-texto">{g.repoUrl}</p>
                <p className="text-xs text-texto-tenue">branch: {g.branch}</p>
              </div>
              <Badge label={g.provider} color="indigo" />
              <button
                onClick={() => void remove(g.id)}
                className="rounded p-1 text-texto-tenue hover:text-fallo-500 hover:bg-fallo-100"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate} title="Conectar repositorio" onClose={() => setShowCreate(false)}>
        <form onSubmit={(e) => void create(e)} className="space-y-4">
          {[
            {
              key: 'repoUrl',
              label: 'URL del repositorio',
              placeholder: 'https://github.com/org/repo',
            },
            { key: 'branch', label: 'Branch', placeholder: 'main' },
            {
              key: 'token',
              label: 'Token de acceso',
              placeholder: 'ghp_xxxxxxxxxx',
              type: 'password',
            },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label className="mb-1 block text-sm font-medium text-texto">{label}</label>
              <input
                required
                type={type ?? 'text'}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                className="w-full rounded-lg border border-linea px-3 py-2 text-sm focus:border-oro-500 focus:outline-none"
                placeholder={placeholder}
              />
            </div>
          ))}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={creating}>
              Conectar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
