import type { TokenPair, UserRead } from "@/types/api";

export interface AuthState {
  user: UserRead | null;
  accessToken: string | null;
  refreshToken: string | null;
}

const STORAGE_KEY = "badminton-ai:auth";

type Listener = (state: AuthState) => void;

function readInitialState(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: null, accessToken: null, refreshToken: null };
    return JSON.parse(raw) as AuthState;
  } catch {
    return { user: null, accessToken: null, refreshToken: null };
  }
}

class AuthStore {
  private state: AuthState = readInitialState();
  private listeners = new Set<Listener>();

  getState(): AuthState {
    return this.state;
  }

  isAuthenticated(): boolean {
    return Boolean(this.state.accessToken && this.state.user);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setSession(user: UserRead, tokens: TokenPair): void {
    this.state = { user, accessToken: tokens.access_token, refreshToken: tokens.refresh_token };
    this.persist();
    this.notify();
  }

  updateTokens(tokens: TokenPair): void {
    this.state = { ...this.state, accessToken: tokens.access_token, refreshToken: tokens.refresh_token };
    this.persist();
    this.notify();
  }

  clearSession(): void {
    this.state = { user: null, accessToken: null, refreshToken: null };
    localStorage.removeItem(STORAGE_KEY);
    this.notify();
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this.state);
  }
}

export const authStore = new AuthStore();
