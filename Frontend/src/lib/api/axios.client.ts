import axios from 'axios';
import { tokenStorage } from '@/lib/auth/token.storage';
import { useAuthStore } from '@/store/auth.store';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: false,
});

// Attach access token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string> | null = null;

// On 401 — try to refresh
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error as Error);
    }

    original._retry = true;
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      useAuthStore.getState().clear();
      tokenStorage.clearRefreshToken();
      window.location.href = '/login';
      return Promise.reject(error as Error);
    }

    try {
      if (!refreshing) {
        refreshing = api
          .post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken })
          .then((res) => {
            const { accessToken, refreshToken: newRefresh } = res.data;
            useAuthStore.getState().setAccessToken(accessToken);
            tokenStorage.setRefreshToken(newRefresh);
            return accessToken;
          })
          .finally(() => {
            refreshing = null;
          });
      }

      const newToken = await refreshing;
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch {
      useAuthStore.getState().clear();
      tokenStorage.clearRefreshToken();
      window.location.href = '/login';
      return Promise.reject(error as Error);
    }
  },
);
