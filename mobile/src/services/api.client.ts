// src/services/api.client.ts
import { useAuthStore } from "@/store/auth.store";
import { authService } from "./auth.service";
import * as SecureStore from "expo-secure-store";
import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";

interface RetryableRequestConfig
  extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const SOCKET_URL = "https://deeply-concrete-sawfish.ngrok-free.app";
const BASE_URL = `${SOCKET_URL}/api/v1`;

let refreshPromise : Promise<string> | null = null;
const REFRESH_TOKEN_KEY = "refreshToken"

export const baseApiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

async function doRefresh() : Promise<string> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if(!refreshToken)
    throw new Error("No refresh Token Found")

  const tokens = await authService.refresh(refreshToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
  useAuthStore.getState().setAccessToken(tokens.accessToken);
  return tokens.accessToken;
}

export async function refreshAccessToken() : Promise<string> {
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
    const originalRequest =
      error.config as RetryableRequestConfig;

    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    if (originalRequest?.url?.includes("/auth/refresh")) {
      await useAuthStore.getState().clearSession();
      return Promise.reject(error);
    }

    if (originalRequest?._retry) {
      await useAuthStore.getState().clearSession();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const newAccessToken = await refreshAccessToken();

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`

      return apiClient(originalRequest);
    } catch (refreshError) {
      await useAuthStore.getState().clearSession();
      return Promise.reject(refreshError);
    }
  }
);