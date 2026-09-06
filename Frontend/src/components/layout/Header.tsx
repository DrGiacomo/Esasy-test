import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { tokenStorage } from '@/lib/auth/token.storage';
import { api } from '@/lib/api/axios.client';
import { ROUTES } from '@/router/routes';
import { SelectorTema } from './SelectorTema';

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
    // Oscura, igual que la barra lateral: entre las dos forman una L que enmarca el
    // contenido. Antes era blanca —y despues casi blanca, que era lo mismo— asi que
    // partia la pantalla en dos mitades sin relacion.
    <header className="flex h-16 items-center justify-end gap-4 border-b border-oro-500/20 bg-sangre-900 px-6">
      <SelectorTema />

      <div className="flex items-center gap-2 text-sm text-tinta-300">
        <User size={16} className="text-oro-500" />
        <span>{user?.email}</span>
      </div>
      <button
        onClick={() => void handleLogout()}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-tinta-400 transition-colors duration-[180ms] hover:bg-sangre-700/60 hover:text-oro-200"
      >
        <LogOut size={16} />
        Salir
      </button>
    </header>
  );
}
