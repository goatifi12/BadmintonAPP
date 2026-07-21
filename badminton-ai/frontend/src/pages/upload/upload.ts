import "@/components/app-nav/app-nav";
import { jobsApi } from "@/api/jobs";
import { ApiError } from "@/api/client";
import { requireToken, verifySession } from "@/lib/auth-guard";
import { animateOnEnter, showToast } from "@/lib/motion";
import { initTheme } from "@/lib/theme";
import { authStore } from "@/state/auth-store";

initTheme();
requireToken();

const nav = document.querySelector("app-nav") as HTMLElement & { setUserEmail(email: string): void };
const dropzone = document.getElementById("dropzone") as HTMLDivElement;
const fileInput = document.getElementById("fileInput") as HTMLInputElement;
const dropzoneEmpty = document.getElementById("dropzoneEmpty") as HTMLDivElement;
const dropzoneFile = document.getElementById("dropzoneFile") as HTMLDivElement;
const fileNameEl = document.getElementById("fileName") as HTMLParagraphElement;
const fileSizeEl = document.getElementById("fileSize") as HTMLParagraphElement;
const modeSelect = document.getElementById("modeSelect") as HTMLSelectElement;
const submitBtn = document.getElementById("submitBtn") as HTMLButtonElement;
const errorBox = document.getElementById("formError") as HTMLDivElement;

let selectedFile: File | null = null;

function showError(message: string): void {
  errorBox.textContent = message;
  errorBox.classList.add("visible");
}

function clearError(): void {
  errorBox.textContent = "";
  errorBox.classList.remove("visible");
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function setSelectedFile(file: File): void {
  selectedFile = file;
  fileNameEl.textContent = file.name;
  fileSizeEl.textContent = formatBytes(file.size);
  dropzoneEmpty.classList.add("hidden");
  dropzoneFile.classList.remove("hidden");
  dropzoneFile.classList.remove("file-pop");
  void dropzoneFile.offsetWidth; // restart animation on repeated selections
  dropzoneFile.classList.add("file-pop");
  submitBtn.disabled = false;
  clearError();
}

dropzone.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    fileInput.click();
  }
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) setSelectedFile(file);
});

for (const eventName of ["dragenter", "dragover"]) {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add("dragover");
  });
}

for (const eventName of ["dragleave", "drop"]) {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove("dragover");
  });
}

dropzone.addEventListener("drop", (event) => {
  const file = event.dataTransfer?.files?.[0];
  if (file) setSelectedFile(file);
});

submitBtn.addEventListener("click", async () => {
  const current = authStore.getState();
  if (!selectedFile || !current.accessToken) return;

  clearError();
  submitBtn.disabled = true;
  submitBtn.classList.add("btn-loading");

  try {
    const job = await jobsApi.create(selectedFile, modeSelect.value, current.accessToken);
    showToast("Upload complete — analyzing your match…", "success");
    window.location.href = `../processing/index.html?jobId=${job.id}`;
  } catch (error) {
    showError(error instanceof ApiError ? error.message : "Upload failed. Please try again.");
    submitBtn.disabled = false;
    submitBtn.classList.remove("btn-loading");
  }
});

void (async () => {
  const user = await verifySession();
  nav.setUserEmail(user.email);
  animateOnEnter();
})();
