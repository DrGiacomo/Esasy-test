import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { projectsApi, type CreateProjectDto } from '../projects.api';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateProjectModal({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState<CreateProjectDto>({ name: '', baseUrl: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await projectsApi.create(form);
      onCreated();
      onClose();
      setForm({ name: '', baseUrl: '', description: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear proyecto');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} title="Nuevo proyecto" onClose={onClose}>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-tinta-700">Nombre</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className="w-full rounded-lg border border-tinta-300 px-3 py-2 text-sm focus:border-oro-500 focus:outline-none focus:ring-1 focus:ring-oro-500"
            placeholder="Mi proyecto"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-tinta-700">URL base</label>
          <input
            required
            type="url"
            value={form.baseUrl}
            onChange={(e) => setForm((p) => ({ ...p, baseUrl: e.target.value }))}
            className="w-full rounded-lg border border-tinta-300 px-3 py-2 text-sm focus:border-oro-500 focus:outline-none focus:ring-1 focus:ring-oro-500"
            placeholder="https://mi-app.com"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-tinta-700">
            Descripción (opcional)
          </label>
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            className="w-full rounded-lg border border-tinta-300 px-3 py-2 text-sm focus:border-oro-500 focus:outline-none focus:ring-1 focus:ring-oro-500"
          />
        </div>
        {error && <p className="text-sm text-fallo-500">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            Crear proyecto
          </Button>
        </div>
      </form>
    </Modal>
  );
}
