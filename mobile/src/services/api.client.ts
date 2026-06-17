// src/services/api.client.ts
import axios from "axios";
import { useAuthStore } from "@/store/auth.store";

const BASE_URL = "https://deeply-concrete-sawfish.ngrok-free.app/api/v1";

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
