import "../../components/app-nav/app-nav.js";
import { jobsApi } from "../../api/jobs.js";
import { requireToken, verifySession } from "../../lib/auth-guard.js";
import { initGlobalErrorHandler } from "../../lib/error-handler.js";
import { animateOnEnter, showToast } from "../../lib/motion.js";
import { initTheme } from "../../lib/theme.js";
import { authStore } from "../../state/auth-store.js";

initGlobalErrorHandler();
initTheme();
requireToken();

const jobId = new URLSearchParams(window.location.search).get("jobId");
if (!jobId) {
  window.location.replace("../upload/index.html");
  throw new Error("no jobId provided");
}

const nav = document.querySelector("app-nav");
const loadingState = document.getElementById("loadingState");
const errorState = document.getElementById("errorState");
const doneState = document.getElementById("doneState");
const stageLabel = document.getElementById("stageLabel");
const progressFill = document.getElementById("progressFill");
const progressPercent = document.getElementById("progressPercent");
const errorMessage = document.getElementById("errorMessage");
const viewResultsLink = document.getElementById("viewResultsLink");

const POLL_INTERVAL_MS = 1500;
let pollHandle = null;

let notified = false;

function renderJob(job) {
  stageLabel.textContent = job.stage.replace(/_/g, " ");
  progressFill.style.width = `${job.progress}%`;
  progressPercent.textContent = `${job.progress}%`;

  if (job.status === "error") {
    loadingState.classList.add("hidden");
    doneState.classList.add("hidden");
    errorState.classList.remove("hidden");
    errorMessage.textContent = job.error ?? "The analysis pipeline failed.";
    if (!notified) {
      showToast("Analysis failed. See details below.", "error");
      notified = true;
    }
    return;
  }

  if (job.status === "done") {
    loadingState.classList.add("hidden");
    errorState.classList.add("hidden");
    doneState.classList.remove("hidden");
    viewResultsLink.href = `../results/index.html?jobId=${job.id}`;
    if (!notified) {
      showToast("Analysis complete!", "success");
      notified = true;
      animateOnEnter();
    }
    return;
  }
}

async function poll() {
  const current = authStore.getState();
  if (!current.accessToken || !jobId) return;

  try {
    const job = await jobsApi.get(jobId, current.accessToken);
    renderJob(job);
    if (job.status === "queued" || job.status === "processing") {
      pollHandle = setTimeout(poll, POLL_INTERVAL_MS);
    }
  } catch {
    errorMessage.textContent = "Could not reach the server. Retrying…";
    errorState.classList.remove("hidden");
    loadingState.classList.add("hidden");
    pollHandle = setTimeout(poll, POLL_INTERVAL_MS * 2);
  }
}

window.addEventListener("beforeunload", () => {
  if (pollHandle) clearTimeout(pollHandle);
});

(async () => {
  const user = await verifySession();
  nav.setUserEmail(user.email);
  animateOnEnter();
})();
