const STORAGE_KEY = "badminton-ai:auth";

function readInitialState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: null, accessToken: null, refreshToken: null };
    return JSON.parse(raw);
  } catch {
    return { user: null, accessToken: null, refreshToken: null };
  }
}

class AuthStore {
  #state = readInitialState();
  #listeners = new Set();

  getState() {
    return this.#state;
  }

  isAuthenticated() {
    return Boolean(this.#state.accessToken && this.#state.user);
  }

  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  setSession(user, tokens) {
    this.#state = { user, accessToken: tokens.access_token, refreshToken: tokens.refresh_token };
    this.#persist();
    this.#notify();
  }

  updateTokens(tokens) {
    this.#state = { ...this.#state, accessToken: tokens.access_token, refreshToken: tokens.refresh_token };
    this.#persist();
    this.#notify();
  }

  clearSession() {
    this.#state = { user: null, accessToken: null, refreshToken: null };
    localStorage.removeItem(STORAGE_KEY);
    this.#notify();
  }

  #persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.#state));
  }

  #notify() {
    for (const listener of this.#listeners) listener(this.#state);
  }
}

export const authStore = new AuthStore();
