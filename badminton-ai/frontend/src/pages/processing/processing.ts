import "@/components/app-nav/app-nav";
import { jobsApi } from "@/api/jobs";
import { requireToken, verifySession } from "@/lib/auth-guard";
import { initGlobalErrorHandler } from "@/lib/error-handler";
import { animateOnEnter, showToast } from "@/lib/motion";
import { initTheme } from "@/lib/theme";
import { authStore } from "@/state/auth-store";
import type { AnalysisJobRead } from "@/types/jobs";

initGlobalErrorHandler();
initTheme();
requireToken();

const jobId = new URLSearchParams(window.location.search).get("jobId");
if (!jobId) {
  window.location.replace("../upload/index.html");
  throw new Error("no jobId provided");
}

const nav = document.querySelector("app-nav") as HTMLElement & { setUserEmail(email: string): void };
const loadingState = document.getElementById("loadingState") as HTMLDivElement;
const errorState = document.getElementById("errorState") as HTMLDivElement;
const doneState = document.getElementById("doneState") as HTMLDivElement;
const stageLabel = document.getElementById("stageLabel") as HTMLParagraphElement;
const progressFill = document.getElementById("progressFill") as HTMLDivElement;
const progressPercent = document.getElementById("progressPercent") as HTMLParagraphElement;
const errorMessage = document.getElementById("errorMessage") as HTMLParagraphElement;
const viewResultsLink = document.getElementById("viewResultsLink") as HTMLAnchorElement;

const POLL_INTERVAL_MS = 1500;
let pollHandle: ReturnType<typeof setTimeout> | null = null;

let notified = false;

function renderJob(job: AnalysisJobRead): void {
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

async function poll(): Promise<void> {
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

void (async () => {
  const user = await verifySession();
  nav.setUserEmail(user.email);
  void poll();
})();
