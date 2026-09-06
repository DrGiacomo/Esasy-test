import { useEffect, useState } from 'react';
import { api } from '@/lib/api/axios.client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import type { Membership, MemberRole } from '@/types/models';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { UserPlus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/**
 * Traduce el error del servidor a algo accionable. Los tres que se dan de verdad aquí
 * tienen solución distinta, y decir «error 404» no ayuda a ninguna.
 */
function mensajeDeError(err: unknown): string {
  const respuesta = (err as { response?: { status?: number; data?: { message?: unknown } } })
    ?.response;
  if (respuesta?.status === 404) {
    return 'No hay ninguna cuenta con ese correo. La persona tiene que registrarse primero: esto añade a alguien que ya existe, no manda invitaciones.';
  }
  if (respuesta?.status === 409) return 'Esa persona ya está en la organización.';
  if (respuesta?.status === 403) return 'No tienes permiso para añadir miembros.';
  const detalle = respuesta?.data?.message;
  if (typeof detalle === 'string') return detalle;
  if (Array.isArray(detalle)) return detalle.join('. ');
  return err instanceof Error ? err.message : 'No se pudo añadir a esa persona.';
}

export function MembersPanel() {
  const user = useCurrentUser();
  const [members, setMembers] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MemberRole>('EDITOR');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api
      .get<{ members: Membership[] }>(`/organizations/${user.orgId}`)
      .then((r) => setMembers(r.data.members ?? []))
      .finally(() => setLoading(false));
  }, [user]);

  /**
   * Añade a alguien a la organización.
   *
   * Tres cosas que fallaban antes del 2026-09-06 y por las que «no servía»:
   *
   *   1. No se mandaba el ROL, y el servidor lo exige. Respondía 400 siempre.
   *   2. No había `catch`, así que el 400 se tragaba en silencio: el modal se quedaba
   *      abierto, sin mensaje, y parecía que el botón no hacía nada. Un error que no se
   *      enseña es peor que un error.
   *   3. La lista no se refrescaba, así que aunque hubiera funcionado, no se veía.
   */
  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !inviteEmail) return;
    setInviting(true);
    setInviteError(null);
    try {
      await api.post(`/organizations/${user.orgId}/members`, {
        email: inviteEmail,
        role: inviteRole,
      });
      const r = await api.get<{ members: Membership[] }>(`/organizations/${user.orgId}`);
      setMembers(r.data.members ?? []);
      setShowInvite(false);
      setInviteEmail('');
    } catch (err) {
      setInviteError(mensajeDeError(err));
    } finally {
      setInviting(false);
    }
  }

  const roleColor: Record<string, 'indigo' | 'gray' | 'emerald'> = {
    ADMIN: 'indigo',
    EDITOR: 'emerald',
    VIEWER: 'gray',
  };

  if (loading)
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setShowInvite(true)}>
          <UserPlus size={14} />
          Añadir miembro
        </Button>
      </div>

      <div className="rounded-xl border border-linea bg-superficie overflow-hidden">
        {members.map((m, i) => (
          <div
            key={m.id}
            className={`flex items-center gap-4 px-4 py-3 ${i > 0 ? 'border-t border-linea' : ''}`}
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-texto">
                {m.user?.displayName ?? m.user?.email}
              </p>
              <p className="text-xs text-texto-tenue">{m.user?.email}</p>
            </div>
            <Badge label={m.role} color={roleColor[m.role] ?? 'gray'} />
          </div>
        ))}
      </div>

      <Modal
        open={showInvite}
        title="Añadir miembro"
        onClose={() => {
          setShowInvite(false);
          setInviteError(null);
        }}
      >
        <form onSubmit={(e) => void invite(e)} className="space-y-4">
          {/* Se dice de entrada, no cuando falla: esto NO manda invitaciones por correo. */}
          <p className="text-xs text-texto-tenue">
            La persona tiene que haberse registrado ya en la plataforma. Aquí se le da acceso a
            esta organización.
          </p>

          <div className="space-y-1">
            <label htmlFor="miembro-email" className="block text-sm font-medium text-texto">
              Correo
            </label>
            <input
              id="miembro-email"
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@ejemplo.com"
              className="w-full rounded-lg border border-linea bg-superficie px-3 py-2 text-sm text-texto focus:border-oro-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="miembro-rol" className="block text-sm font-medium text-texto">
              Qué podrá hacer
            </label>
            <select
              id="miembro-rol"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as MemberRole)}
              className="w-full rounded-lg border border-linea bg-superficie px-3 py-2 text-sm text-texto focus:border-oro-500 focus:outline-none"
            >
              <option value="VIEWER">Solo mirar — ve las pruebas y los informes</option>
              <option value="EDITOR">Trabajar — además crea, edita y ejecuta pruebas</option>
              <option value="ADMIN">Administrar — además gestiona la organización</option>
            </select>
          </div>

          {inviteError && (
            <p
              role="alert"
              className="rounded-lg border border-fallo-500/40 bg-fallo-100 px-3 py-2 text-sm text-fallo-500"
            >
              {inviteError}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setShowInvite(false);
                setInviteError(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={inviting}>
              Añadir
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
