import { create } from 'zustand';
import type { MemberRole, UiMode } from '@/types/models';

interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  orgId: string;
  role: MemberRole;
  /**
   * Modo de interfaz. Viene de GET /auth/me, NO del JWT: si viviera en el token,
   * cambiarlo no haria nada hasta el siguiente login.
   *
   * Arranca en SENCILLO mientras /auth/me esta en vuelo. Es el defecto correcto para
   * equivocarse: si la respuesta tarda, se ve de menos un instante en vez de ensenar
   * selectores a quien pidio no verlos.
   */
  uiMode: UiMode;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  hydrated: boolean;
  setAuth: (user: AuthUser, accessToken: string) => void;
  setAccessToken: (token: string) => void;
  setUiMode: (uiMode: UiMode) => void;
  patchUser: (patch: Partial<AuthUser>) => void;
  setHydrated: () => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  hydrated: false,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setUiMode: (uiMode) => set((s) => (s.user ? { user: { ...s.user, uiMode } } : {})),
  patchUser: (patch) => set((s) => (s.user ? { user: { ...s.user, ...patch } } : {})),
  setHydrated: () => set({ hydrated: true }),
  clear: () => set({ user: null, accessToken: null }),
}));
