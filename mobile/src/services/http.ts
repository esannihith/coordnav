// src/services/http.ts
import axios from "axios";

export const SOCKET_URL = "http://192.168.1.8:8000";
const BASE_URL = `${SOCKET_URL}/api/v1`;

export const baseApiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});
