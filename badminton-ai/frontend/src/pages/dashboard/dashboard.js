import "../../components/app-nav/app-nav.js";
import { jobsApi } from "../../api/jobs.js";
import { requireToken, verifySession } from "../../lib/auth-guard.js";
import { initGlobalErrorHandler } from "../../lib/error-handler.js";
import { renderJobCard } from "../../lib/job-card.js";
import { animateOnEnter, countUpTo, showToast } from "../../lib/motion.js";
import { initTheme } from "../../lib/theme.js";
import { authStore } from "../../state/auth-store.js";

initGlobalErrorHandler();
initTheme();
requireToken();

const welcomeHeading = document.getElementById("welcomeHeading");
const statTotal = document.getElementById("statTotal");
const statProcessing = document.getElementById("statProcessing");
const statDone = document.getElementById("statDone");
const recentList = document.getElementById("recentList");
const emptyState = document.getElementById("emptyState");
const nav = document.querySelector("app-nav");

function revealStat(el, value) {
  el.classList.remove("skeleton");
  countUpTo(el, value);
}

void (async () => {
  const user = await verifySession();
  nav.setUserEmail(user.email);
  welcomeHeading.textContent = `Welcome, ${user.display_name}`;

  const token = authStore.getState().accessToken;
  try {
    const jobs = await jobsApi.list(token);

    revealStat(statTotal, jobs.length);
    revealStat(statProcessing, jobs.filter((j) => j.status === "processing" || j.status === "queued").length);
    revealStat(statDone, jobs.filter((j) => j.status === "done").length);

    if (jobs.length === 0) {
      emptyState.classList.remove("hidden");
      animateOnEnter();
      return;
    }

    recentList.innerHTML = jobs.slice(0, 5).map(renderJobCard).join("");
    animateOnEnter(".card, [data-animate], .job-card");
  } catch {
    revealStat(statTotal, 0);
    revealStat(statProcessing, 0);
    revealStat(statDone, 0);
    showToast("Couldn't load your analyses. Try refreshing the page.", "error");
  }
})();
