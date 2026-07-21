import { apiClient } from "@/api/client";
import type { AuthResponse, LoginRequest, RegisterRequest, TokenPair, UserRead } from "@/types/api";

export const authApi = {
  register: (payload: RegisterRequest) => apiClient.post<AuthResponse>("/auth/register", payload),
  login: (payload: LoginRequest) => apiClient.post<AuthResponse>("/auth/login", payload),
  refresh: (refreshToken: string) => apiClient.post<TokenPair>("/auth/refresh", { refresh_token: refreshToken }),
  me: (accessToken: string) => apiClient.get<UserRead>("/auth/me", accessToken),
};
