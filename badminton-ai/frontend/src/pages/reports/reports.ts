import "@/components/app-nav/app-nav";
import { jobsApi } from "@/api/jobs";
import { ApiError } from "@/api/client";
import { requireToken, verifySession } from "@/lib/auth-guard";
import { renderJobCard } from "@/lib/job-card";
import { animateOnEnter, showToast } from "@/lib/motion";
import { initTheme } from "@/lib/theme";
import { authStore } from "@/state/auth-store";
import type { AnalysisJobRead } from "@/types/jobs";

initTheme();
requireToken();

const nav = document.querySelector("app-nav") as HTMLElement & { setUserEmail(email: string): void };
const jobList = document.getElementById("jobList") as HTMLDivElement;
const emptyState = document.getElementById("emptyState") as HTMLDivElement;
const filterChips = Array.from(document.querySelectorAll<HTMLButtonElement>(".filter-chip"));

let allJobs: AnalysisJobRead[] = [];
let activeFilter = "all";

function matchesFilter(job: AnalysisJobRead, filter: string): boolean {
  if (filter === "all") return true;
  if (filter === "processing") return job.status === "processing" || job.status === "queued";
  return job.status === filter;
}

function render(): void {
  const filtered = allJobs.filter((job) => matchesFilter(job, activeFilter));
  if (filtered.length === 0) {
    jobList.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");
  jobList.innerHTML = filtered.map(renderJobCard).join("");
  animateOnEnter(".job-card");
}

for (const chip of filterChips) {
  chip.addEventListener("click", () => {
    activeFilter = chip.dataset.filter ?? "all";
    for (const other of filterChips) other.classList.toggle("active", other === chip);
    render();
  });
}

void (async () => {
  const user = await verifySession();
  nav.setUserEmail(user.email);

  const token = authStore.getState().accessToken;
  if (!token) return;
  try {
    allJobs = await jobsApi.list(token);
    render();
  } catch (error) {
    showToast(error instanceof ApiError ? error.message : "Couldn't load your analyses.", "error");
  }
})();
