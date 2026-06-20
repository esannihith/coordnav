// src/services/api.client.ts
import { useAuthStore } from "@/store/auth.store";
import * as SecureStore from "expo-secure-store";
import { AxiosError, InternalAxiosRequestConfig } from "axios";
import { baseApiClient, apiClient } from "./http";

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let refreshPromise: Promise<string> | null = null;
const REFRESH_TOKEN_KEY = "refreshToken";

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

async function doRefresh(): Promise<string> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!refreshToken) throw new Error("No refresh Token Found");

  const response = await baseApiClient.post("/auth/refresh", {
    refreshToken: refreshToken,
  });
  const tokens = response.data.data;

  const currentRefreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (currentRefreshToken !== refreshToken) {
    throw new Error("Session changed during refresh");
  }

  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
  useAuthStore.getState().setAccessToken(tokens.accessToken);
  return tokens.accessToken;
}

export async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig;

    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    if (originalRequest?._retry) {
      await useAuthStore.getState().clearSession();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const currentToken = useAuthStore.getState().accessToken;
      const authHeader = originalRequest.headers.Authorization?.toString();
      const sentToken =
        authHeader && authHeader.startsWith("Bearer ")
          ? authHeader.substring(7)
          : null;

      let newAccessToken = currentToken;
      if (currentToken && sentToken && currentToken !== sentToken) {
        console.log(
          "Token already refreshed by another request, retrying directly.",
        );
      } else {
        newAccessToken = await refreshAccessToken();
      }

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      return apiClient(originalRequest);
    } catch (refreshError: any) {
      if (refreshError?.message !== "Session changed during refresh") {
        await useAuthStore.getState().clearSession();
      }
      return Promise.reject(refreshError);
    }
  },
);
