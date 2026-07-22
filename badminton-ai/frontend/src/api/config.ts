const DEFAULT_DEV_API_BASE_URL = "http://localhost:8000/api/v1";

export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (import.meta.env.DEV) {
    return DEFAULT_DEV_API_BASE_URL;
  }

  throw new Error("VITE_API_BASE_URL must be configured for production builds.");
}

export const API_TIMEOUT_MS = 30_000;
export const API_UPLOAD_TIMEOUT_MS = 300_000;
