import type { ApiErrorBody } from "@/types/api";
import { API_TIMEOUT_MS, API_UPLOAD_TIMEOUT_MS, getApiBaseUrl } from "@/api/config";

const API_BASE_URL = getApiBaseUrl();

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetchWithTimeout(
    `${API_BASE_URL}${path}`,
    {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    },
    API_TIMEOUT_MS,
  );

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const errorBody = (await response.json()) as ApiErrorBody;
      if (typeof errorBody.detail === "string") {
        message = errorBody.detail;
      } else if (Array.isArray(errorBody.detail) && errorBody.detail[0]?.msg) {
        message = errorBody.detail[0].msg;
      }
    } catch {
      // response body wasn't JSON — keep the generic message
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export const apiClient = {
  get: <T>(path: string, token?: string | null) => request<T>(path, { method: "GET", token }),
  post: <T>(path: string, body?: unknown, token?: string | null) => request<T>(path, { method: "POST", body, token }),
  postForm: async <T>(path: string, formData: FormData, token?: string | null): Promise<T> => {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, { method: "POST", headers, body: formData }, API_UPLOAD_TIMEOUT_MS);
    if (!response.ok) {
      let message = `Request failed with status ${response.status}`;
      try {
        const errorBody = (await response.json()) as ApiErrorBody;
        if (typeof errorBody.detail === "string") message = errorBody.detail;
      } catch {
        // ignore non-JSON error bodies
      }
      throw new ApiError(message, response.status);
    }
    return (await response.json()) as T;
  },
};

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("The request timed out. Try a smaller video or retry in a moment.", 408);
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
