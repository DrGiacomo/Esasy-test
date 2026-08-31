import { create } from 'zustand';
import type { MemberRole } from '@/types/models';

interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  orgId: string;
  role: MemberRole;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  hydrated: boolean;
  setAuth: (user: AuthUser, accessToken: string) => void;
  setAccessToken: (token: string) => void;
  setHydrated: () => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  hydrated: false,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setHydrated: () => set({ hydrated: true }),
  clear: () => set({ user: null, accessToken: null }),
}));
