import axios from "axios";
import { clearAuthStorage, getAuthStorage } from "../auth/storage";

const rawApiBase = import.meta.env.VITE_API_BASE ?? "/api/v1";
const API_BASE = rawApiBase.replace(/\/+$/, "");

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = getAuthStorage().getItem("cs360_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const SESSION_EXPIRED_EVENT = "cs360:session-expired";

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthStorage(["cs360_token", "cs360_user"]);

      if (location.pathname !== "/login") {
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      }
    }

    return Promise.reject(error);
  }
);
