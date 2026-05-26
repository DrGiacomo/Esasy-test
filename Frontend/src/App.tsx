import { useEffect } from 'react';
import { AppRouter } from '@/router';
import { tokenStorage } from '@/lib/auth/token.storage';
import { api } from '@/lib/api/axios.client';
import { useAuthStore } from '@/store/auth.store';
import type { MemberRole } from '@/types/models';

interface TokenPayload {
  sub: string;
  orgId: string;
  role: MemberRole;
  email: string;
}

function parseJwt(token: string): TokenPayload | null {
  try {
    return JSON.parse(atob(token.split('.')[1])) as TokenPayload;
  } catch {
    return null;
  }
}

export default function App() {
  const setAuth = useAuthStore((s) => s.setAuth);

  // Auto-refresh al cargar la app si hay refresh token en storage
  useEffect(() => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) return;

    api
      .post<{ accessToken: string; refreshToken: string; expiresIn: number }>(
        '/auth/refresh',
        { refreshToken },
      )
      .then((res) => {
        const { accessToken, refreshToken: newRefresh } = res.data;
        tokenStorage.setRefreshToken(newRefresh);
        const payload = parseJwt(accessToken);
        if (payload) {
          setAuth(
            {
              id: payload.sub,
              email: payload.email ?? '',
              displayName: null,
              orgId: payload.orgId,
              role: payload.role,
            },
            accessToken,
          );
        }
      })
      .catch(() => {
        tokenStorage.clearRefreshToken();
      });
  }, [setAuth]);

  return <AppRouter />;
}
