import { api } from '@/lib/api/axios.client';
import type { MemberRole, UiMode } from '@/types/models';

export interface LoginDto { email: string; password: string; orgId?: string }
export interface RegisterDto { email: string; password: string; displayName: string; organizationName: string }
export interface AuthTokens { accessToken: string; refreshToken: string; expiresIn: number }

/**
 * Quien soy. Antes esto se sacaba descodificando el JWT, y de ahi venia el
 * `displayName: null` que se veia al entrar. El modo NO puede vivir en el token:
 * cambiarlo no puede exigir volver a entrar.
 */
export interface Me {
  id: string;
  email: string;
  displayName: string;
  orgId: string;
  role: MemberRole;
  uiMode: UiMode;
}

export const authApi = {
  login: (dto: LoginDto) => api.post<AuthTokens>('/auth/login', dto).then((r) => r.data),
  register: (dto: RegisterDto) => api.post<AuthTokens>('/auth/register', dto).then((r) => r.data),
  refresh: (refreshToken: string) =>
    api.post<AuthTokens>('/auth/refresh', { refreshToken }).then((r) => r.data),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
  me: () => api.get<Me>('/auth/me').then((r) => r.data),
  setUiMode: (uiMode: UiMode) =>
    api.patch<Me>('/auth/me/preferences', { uiMode }).then((r) => r.data),
};
