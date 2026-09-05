import { useEffect } from 'react';
import { AppRouter } from '@/router';
import { tokenStorage } from '@/lib/auth/token.storage';
import { api } from '@/lib/api/axios.client';
import { authApi } from '@/features/auth/auth.api';
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
  const setHydrated = useAuthStore((s) => s.setHydrated);

  // Auto-refresh al cargar la app si hay refresh token en storage
  useEffect(() => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      setHydrated();
      return;
    }

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
              // Provisional hasta que responda /auth/me. SENCILLO es el defecto correcto
              // mientras tanto: si la peticion tarda o falla, se ve de menos un instante
              // en lugar de ensenar selectores a quien pidio no verlos.
              uiMode: 'SENCILLO',
            },
            accessToken,
          );
          void authApi
            .me()
            .then((yo) =>
              useAuthStore.getState().patchUser({
                displayName: yo.displayName,
                email: yo.email,
                role: yo.role,
                uiMode: yo.uiMode,
              }),
            )
            .catch(() => undefined);
        }
      })
      .catch(() => {
        tokenStorage.clearRefreshToken();
      })
      .finally(() => {
        setHydrated();
      });
  }, [setAuth, setHydrated]);

  return <AppRouter />;
}
