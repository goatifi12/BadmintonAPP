import { API_TIMEOUT_MS, API_UPLOAD_TIMEOUT_MS, getApiBaseUrl } from "./config.js";

const API_BASE_URL = getApiBaseUrl();

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
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
      const errorBody = await response.json();
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
    return undefined;
  }
  return await response.json();
}

export const apiClient = {
  get: (path, token) => request(path, { method: "GET", token }),
  post: (path, body, token) => request(path, { method: "POST", body, token }),
  postForm: async (path, formData, token) => {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, { method: "POST", headers, body: formData }, API_UPLOAD_TIMEOUT_MS);
    if (!response.ok) {
      let message = `Request failed with status ${response.status}`;
      try {
        const errorBody = await response.json();
        if (typeof errorBody.detail === "string") message = errorBody.detail;
      } catch {
        // ignore non-JSON error bodies
      }
      throw new ApiError(message, response.status);
    }
    return await response.json();
  },
};

async function fetchWithTimeout(url, init, timeoutMs) {
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
