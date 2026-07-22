import { API_TIMEOUT_MS, getApiBaseUrl } from "@/api/config";

const API_BASE_URL = getApiBaseUrl();

const createdObjectUrls = new Set<string>();

/** Fetches an auth-gated binary resource and returns a blob object URL
 * suitable for `img.src` / `video.src`. Caller is responsible for calling
 * `revokeAllObjectUrls()` when the page unloads (already wired up by
 * `trackObjectUrlsForCleanup`).
 */
export async function loadAuthedObjectUrl(path: string, token: string): Promise<string> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller.signal,
  }).finally(() => window.clearTimeout(timeout));
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  createdObjectUrls.add(url);
  return url;
}

export function revokeAllObjectUrls(): void {
  for (const url of createdObjectUrls) URL.revokeObjectURL(url);
  createdObjectUrls.clear();
}

export function trackObjectUrlsForCleanup(): void {
  window.addEventListener("beforeunload", revokeAllObjectUrls);
}

/** Triggers a browser download of an auth-gated resource without navigating
 * away from the page.
 */
export async function downloadAuthedFile(path: string, token: string, filename: string): Promise<void> {
  const url = await loadAuthedObjectUrl(path, token);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
