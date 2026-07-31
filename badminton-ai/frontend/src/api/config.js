const DEFAULT_DEV_API_BASE_URL = "http://localhost:8000/api/v1";

export function getApiBaseUrl() {
  const configured = window.VITE_API_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return DEFAULT_DEV_API_BASE_URL;
}

export const API_TIMEOUT_MS = 30_000;
export const API_UPLOAD_TIMEOUT_MS = 300_000;
