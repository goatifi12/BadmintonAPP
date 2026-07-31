import { apiClient } from "./client.js";

export const authApi = {
  register: (payload) => apiClient.post("/auth/register", payload),
  login: (payload) => apiClient.post("/auth/login", payload),
  refresh: (refreshToken) => apiClient.post("/auth/refresh", { refresh_token: refreshToken }),
  me: (accessToken) => apiClient.get("/auth/me", accessToken),
};
