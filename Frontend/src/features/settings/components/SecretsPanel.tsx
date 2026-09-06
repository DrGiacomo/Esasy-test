import { useEffect, useState } from 'react';
import { api } from '@/lib/api/axios.client';
import type { Secret } from '@/types/models';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Plus, Trash2 } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function SecretsPanel() {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'ENV_VAR', value: '' });
  const [creating, setCreating] = useState(false);

  function fetchSecrets() {
    api
      .get<Secret[]>('/secrets')
      .then((r) => setSecrets(r.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchSecrets();
  }, []);

  async function createSecret(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/secrets', form);
      setShowCreate(false);
      setForm({ name: '', type: 'ENV_VAR', value: '' });
      fetchSecrets();
    } finally {
      setCreating(false);
    }
  }

  async function deleteSecret(id: string) {
    await api.delete(`/secrets/${id}`);
    setSecrets((p) => p.filter((s) => s.id !== id));
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
          Nuevo secreto
        </Button>
      </div>

      <div className="rounded-xl border border-linea bg-superficie overflow-hidden">
        {secrets.length === 0 && (
          <p className="p-6 text-center text-sm text-texto-tenue">
            Sin secretos. Los valores nunca se muestran una vez guardados.
          </p>
        )}
        {secrets.map((s, i) => (
          <div
            key={s.id}
            className={`flex items-center gap-4 px-4 py-3 ${i > 0 ? 'border-t border-linea' : ''}`}
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-texto font-mono">{s.name}</p>
              {s.description && <p className="text-xs text-texto-tenue">{s.description}</p>}
            </div>
            <Badge label={s.type} color="gray" />
            <button
              onClick={() => void deleteSecret(s.id)}
              className="rounded p-1 text-texto-tenue hover:text-fallo-500 hover:bg-fallo-100"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <Modal open={showCreate} title="Nuevo secreto" onClose={() => setShowCreate(false)}>
        <form onSubmit={(e) => void createSecret(e)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-texto">Nombre</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-lg border border-linea px-3 py-2 text-sm font-mono focus:border-oro-500 focus:outline-none"
              placeholder="API_KEY"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-texto">Tipo</label>
            <select
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
              className="w-full rounded-lg border border-linea px-3 py-2 text-sm focus:border-oro-500 focus:outline-none"
            >
              <option value="ENV_VAR">Variable de entorno</option>
              <option value="GIT_TOKEN">Token Git</option>
              <option value="WEBHOOK_SECRET">Webhook Secret</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-texto">Valor</label>
            <input
              type="password"
              required
              value={form.value}
              onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
              className="w-full rounded-lg border border-linea px-3 py-2 text-sm focus:border-oro-500 focus:outline-none"
              placeholder="••••••••••••"
            />
            <p className="mt-1 text-xs text-texto-tenue">
              El valor se cifra y nunca se vuelve a mostrar.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={creating}>
              Guardar secreto
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
