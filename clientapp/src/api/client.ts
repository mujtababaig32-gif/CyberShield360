import axios from "axios";

const rawApiBase = import.meta.env.VITE_API_BASE ?? "/api/v1";
const API_BASE = rawApiBase.replace(/\/+$/, "");

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cs360_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("cs360_token");
      localStorage.removeItem("cs360_user");

      if (location.pathname !== "/login") {
        location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);
