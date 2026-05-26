import { api } from '@/lib/api/axios.client';

export interface LoginDto { email: string; password: string; orgId?: string }
export interface RegisterDto { email: string; password: string; displayName: string; organizationName: string }
export interface AuthTokens { accessToken: string; refreshToken: string; expiresIn: number }

export const authApi = {
  login: (dto: LoginDto) => api.post<AuthTokens>('/auth/login', dto).then((r) => r.data),
  register: (dto: RegisterDto) => api.post<AuthTokens>('/auth/register', dto).then((r) => r.data),
  refresh: (refreshToken: string) =>
    api.post<AuthTokens>('/auth/refresh', { refreshToken }).then((r) => r.data),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
};
