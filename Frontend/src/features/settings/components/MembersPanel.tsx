import { useEffect, useState } from 'react';
import { api } from '@/lib/api/axios.client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import type { Membership } from '@/types/models';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { UserPlus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function MembersPanel() {
  const user = useCurrentUser();
  const [members, setMembers] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!user) return;
    api
      .get<{ members: Membership[] }>(`/organizations/${user.orgId}`)
      .then((r) => setMembers(r.data.members ?? []))
      .finally(() => setLoading(false));
  }, [user]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !inviteEmail) return;
    setInviting(true);
    try {
      await api.post(`/organizations/${user.orgId}/members`, { email: inviteEmail });
      setShowInvite(false);
      setInviteEmail('');
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
          Invitar miembro
        </Button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {members.map((m, i) => (
          <div
            key={m.id}
            className={`flex items-center gap-4 px-4 py-3 ${i > 0 ? 'border-t border-gray-100' : ''}`}
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">
                {m.user?.displayName ?? m.user?.email}
              </p>
              <p className="text-xs text-gray-500">{m.user?.email}</p>
            </div>
            <Badge label={m.role} color={roleColor[m.role] ?? 'gray'} />
          </div>
        ))}
      </div>

      <Modal open={showInvite} title="Invitar miembro" onClose={() => setShowInvite(false)}>
        <form onSubmit={(e) => void invite(e)} className="space-y-4">
          <input
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="email@ejemplo.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setShowInvite(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={inviting}>
              Invitar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
