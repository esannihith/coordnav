import { create } from "axios";

export const SOCKET_URL = "http://192.168.1.4:8000";
const BASE_URL = `${SOCKET_URL}/api/v1`;

export const baseApiClient = create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const apiClient = create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});
