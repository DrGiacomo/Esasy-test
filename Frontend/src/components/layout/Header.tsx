import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { tokenStorage } from '@/lib/auth/token.storage';
import { api } from '@/lib/api/axios.client';
import { ROUTES } from '@/router/routes';

export function Header() {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const navigate = useNavigate();

  async function handleLogout() {
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken }).catch(() => null);
    }
    clear();
    tokenStorage.clearRefreshToken();
    void navigate(ROUTES.LOGIN);
  }

  return (
    <header className="flex h-16 items-center justify-end gap-4 border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <User size={16} />
        <span>{user?.email}</span>
      </div>
      <button
        onClick={() => void handleLogout()}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      >
        <LogOut size={16} />
        Salir
      </button>
    </header>
  );
}
