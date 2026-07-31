import "../../components/app-nav/app-nav.js";
import { jobsApi } from "../../api/jobs.js";
import { ApiError } from "../../api/client.js";
import { requireToken, verifySession } from "../../lib/auth-guard.js";
import { initGlobalErrorHandler } from "../../lib/error-handler.js";
import { animateOnEnter, showToast } from "../../lib/motion.js";
import { initTheme } from "../../lib/theme.js";
import { authStore } from "../../state/auth-store.js";

initGlobalErrorHandler();
initTheme();
requireToken();

const nav = document.querySelector("app-nav");
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const dropzoneEmpty = document.getElementById("dropzoneEmpty");
const dropzoneFile = document.getElementById("dropzoneFile");
const fileNameEl = document.getElementById("fileName");
const fileSizeEl = document.getElementById("fileSize");
const modeSelect = document.getElementById("modeSelect");
const submitBtn = document.getElementById("submitBtn");
const errorBox = document.getElementById("formError");

let selectedFile = null;

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.add("visible");
}

function clearError() {
  errorBox.textContent = "";
  errorBox.classList.remove("visible");
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function setSelectedFile(file) {
  selectedFile = file;
  fileNameEl.textContent = file.name;
  fileSizeEl.textContent = formatBytes(file.size);
  dropzoneEmpty.classList.add("hidden");
  dropzoneFile.classList.remove("hidden");
  dropzoneFile.classList.remove("file-pop");
  dropzoneFile.offsetWidth; // restart animation on repeated selections
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

(async () => {
  const user = await verifySession();
  nav.setUserEmail(user.email);
  animateOnEnter();
})();
