import "../../components/app-nav/app-nav.js";
import { jobsApi } from "../../api/jobs.js";
import { ApiError } from "../../api/client.js";
import { requireToken, verifySession } from "../../lib/auth-guard.js";
import { renderJobCard } from "../../lib/job-card.js";
import { animateOnEnter, showToast } from "../../lib/motion.js";
import { initTheme } from "../../lib/theme.js";
import { authStore } from "../../state/auth-store.js";

initTheme();
requireToken();

const nav = document.querySelector("app-nav");
const jobList = document.getElementById("jobList");
const emptyState = document.getElementById("emptyState");
const filterChips = Array.from(document.querySelectorAll(".filter-chip"));

let allJobs = [];
let activeFilter = "all";

function matchesFilter(job, filter) {
  if (filter === "all") return true;
  if (filter === "processing") return job.status === "processing" || job.status === "queued";
  return job.status === filter;
}

function render() {
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

(async () => {
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
