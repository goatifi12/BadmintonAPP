import { authApi } from "@/api/auth";
import { ApiError } from "@/api/client";
import { authStore } from "@/state/auth-store";
import type { UserRead } from "@/types/api";

/** Synchronous guard: redirects to /login immediately if there's no token at
 * all, before any network round-trip. Call this first, at the top of the page
 * script, so an unauthenticated visitor never sees a flash of page content.
 */
export function requireToken(): string {
  const token = authStore.getState().accessToken;
  if (!token) {
    window.location.replace("../login/index.html");
    throw new Error("redirecting to login");
  }
  return token;
}

/** Full session verification: calls /auth/me with the stored token, retries
 * once via /auth/refresh on a 401, and clears the session + redirects if
 * both fail. Returns the verified user on success.
 */
export async function verifySession(): Promise<UserRead> {
  const state = authStore.getState();
  if (!state.accessToken) {
    window.location.replace("../login/index.html");
    throw new Error("redirecting to login");
  }

  try {
    return await authApi.me(state.accessToken);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && state.refreshToken) {
      try {
        const tokens = await authApi.refresh(state.refreshToken);
        authStore.updateTokens(tokens);
        return await authApi.me(tokens.access_token);
      } catch {
        // fall through to sign-out below
      }
    }
    authStore.clearSession();
    window.location.replace("../login/index.html");
    throw error;
  }
}

export function signOutAndRedirect(): void {
  authStore.clearSession();
  window.location.href = "../login/index.html";
}
