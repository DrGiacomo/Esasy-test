import axios from 'axios';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, type LoginDto, type RegisterDto } from '../auth.api';
import { useAuthStore } from '@/store/auth.store';
import { tokenStorage } from '@/lib/auth/token.storage';
import { ROUTES } from '@/router/routes';
import type { MemberRole } from '@/types/models';

interface JwtPayload { sub: string; orgId: string; role: MemberRole; email: string }

function parseJwt(token: string): JwtPayload | null {
  try { return JSON.parse(atob(token.split('.')[1])) as JwtPayload; }
  catch { return null; }
}

function extractError(e: unknown, fallback: string): string {
  if (axios.isAxiosError(e)) {
    const msg = (e.response?.data as { message?: { message?: string | string[]; error?: string } | string } | undefined)?.message;
    if (msg) {
      if (typeof msg === 'object') {
        if (Array.isArray(msg.message)) return msg.message.join(', ');
        if (typeof msg.message === 'string') return msg.message;
        if (typeof msg.error === 'string') return msg.error;
      }
      if (typeof msg === 'string') return msg;
    }
  }
  return e instanceof Error ? e.message : fallback;
}

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  async function login(dto: LoginDto) {
    setLoading(true); setError(null);
    try {
      const tokens = await authApi.login(dto);
      const payload = parseJwt(tokens.accessToken);
      if (!payload) throw new Error('Token inválido');
      tokenStorage.setRefreshToken(tokens.refreshToken);
      setAuth({ id: payload.sub, email: dto.email, displayName: null, orgId: payload.orgId, role: payload.role }, tokens.accessToken);
      void navigate(ROUTES.PROJECTS);
    } catch (e) {
      setError(extractError(e, 'Error al iniciar sesión'));
    } finally { setLoading(false); }
  }

  async function register(dto: RegisterDto) {
    setLoading(true); setError(null);
    try {
      const tokens = await authApi.register(dto);
      const payload = parseJwt(tokens.accessToken);
      if (!payload) throw new Error('Token inválido');
      tokenStorage.setRefreshToken(tokens.refreshToken);
      setAuth({ id: payload.sub, email: dto.email, displayName: dto.displayName, orgId: payload.orgId, role: payload.role }, tokens.accessToken);
      void navigate(ROUTES.PROJECTS);
    } catch (e) {
      setError(extractError(e, 'Error al registrarse'));
    } finally { setLoading(false); }
  }

  return { login, register, loading, error };
}
