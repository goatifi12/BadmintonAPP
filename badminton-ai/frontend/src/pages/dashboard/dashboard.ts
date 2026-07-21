import "@/components/app-nav/app-nav";
import { jobsApi } from "@/api/jobs";
import { requireToken, verifySession } from "@/lib/auth-guard";
import { initGlobalErrorHandler } from "@/lib/error-handler";
import { renderJobCard } from "@/lib/job-card";
import { animateOnEnter, countUpTo, showToast } from "@/lib/motion";
import { initTheme } from "@/lib/theme";
import { authStore } from "@/state/auth-store";

initGlobalErrorHandler();
initTheme();
requireToken();

const welcomeHeading = document.getElementById("welcomeHeading") as HTMLHeadingElement;
const statTotal = document.getElementById("statTotal") as HTMLSpanElement;
const statProcessing = document.getElementById("statProcessing") as HTMLSpanElement;
const statDone = document.getElementById("statDone") as HTMLSpanElement;
const recentList = document.getElementById("recentList") as HTMLDivElement;
const emptyState = document.getElementById("emptyState") as HTMLDivElement;
const nav = document.querySelector("app-nav") as HTMLElement & { setUserEmail(email: string): void };

function revealStat(el: HTMLSpanElement, value: number): void {
  el.classList.remove("skeleton");
  countUpTo(el, value);
}

void (async () => {
  const user = await verifySession();
  nav.setUserEmail(user.email);
  welcomeHeading.textContent = `Welcome, ${user.display_name}`;

  const token = authStore.getState().accessToken!;
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
