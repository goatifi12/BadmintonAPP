import "../../components/app-nav/app-nav.js";
import Chart from "chart.js/auto";
import { jobsApi } from "../../api/jobs.js";
import { ApiError } from "../../api/client.js";
import { requireToken, verifySession } from "../../lib/auth-guard.js";
import { initGlobalErrorHandler } from "../../lib/error-handler.js";
import { downloadAuthedFile, loadAuthedObjectUrl, trackObjectUrlsForCleanup } from "../../lib/authed-assets.js";
import { animateOnEnter, countUpTo, showToast } from "../../lib/motion.js";
import { initTheme } from "../../lib/theme.js";
import { authStore } from "../../state/auth-store.js";

initGlobalErrorHandler();
initTheme();
requireToken();
trackObjectUrlsForCleanup();

const jobId = new URLSearchParams(window.location.search).get("jobId");
if (!jobId) {
  window.location.replace("../reports/index.html");
  throw new Error("no jobId provided");
}

const nav = document.querySelector("app-nav");
const loadingNotice = document.getElementById("loadingNotice");
const notDoneNotice = document.getElementById("notDoneNotice");
const goToProcessingLink = document.getElementById("goToProcessingLink");
const resultsContent = document.getElementById("resultsContent");

const jobTitle = document.getElementById("jobTitle");
const jobMeta = document.getElementById("jobMeta");
const confidenceBadge = document.getElementById("confidenceBadge");

const kpiAvgSpeed = document.getElementById("kpiAvgSpeed");
const kpiMaxSpeed = document.getElementById("kpiMaxSpeed");
const kpiShots = document.getElementById("kpiShots");
const kpiRallies = document.getElementById("kpiRallies");

const weaknessesList = document.getElementById("weaknessesList");
const tipsList = document.getElementById("tipsList");

const coachingLoading = document.getElementById("coachingLoading");
const coachingBody = document.getElementById("coachingBody");
const coachingSummary = document.getElementById("coachingSummary");
const coachingStrengths = document.getElementById("coachingStrengths");
const coachingRecommendations = document.getElementById("coachingRecommendations");
const coachingProviderBadge = document.getElementById("coachingProviderBadge");
const regenerateCoachingBtn = document.getElementById("regenerateCoachingBtn");

const shotsTableBody = document.getElementById("shotsTableBody");
const replayVideo = document.getElementById("replayVideo");
const downloadVideoBtn = document.getElementById("downloadVideoBtn");
const downloadReplayBtn = document.getElementById("downloadReplayBtn");

function bulletList(list, items, emptyText) {
  list.innerHTML = items.length ? items.map((item) => `<li>${escapeHtml(item)}</li>`).join("") : `<li>${escapeHtml(emptyText)}</li>`;
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

const PIE_COLORS = ["#3860ff", "#14b8a6", "#ff7a59", "#a855f7", "#f59e0b", "#ec4899", "#22c55e", "#64748b", "#0ea5e9", "#f43f5e"];

function renderBarChart(strokeCounts) {
  const canvas = document.getElementById("strokeChart");
  const labels = Object.keys(strokeCounts);
  const values = Object.values(strokeCounts);
  new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: "Shots", data: values, backgroundColor: "#3860ff", borderRadius: 6 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
}

function renderPieChart(strokeCounts) {
  const canvas = document.getElementById("strokePieChart");
  const entries = Object.entries(strokeCounts).filter(([, count]) => count > 0);
  const labels = entries.length ? entries.map(([type]) => type.replace(/_/g, " ")) : ["No shots detected"];
  const values = entries.length ? entries.map(([, count]) => count) : [1];
  const colors = entries.length ? labels.map((_, i) => PIE_COLORS[i % PIE_COLORS.length]) : ["#cbd5e1"];

  new Chart(canvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: colors, borderColor: "var(--color-surface)", borderWidth: 2 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: { enabled: entries.length > 0 },
      },
    },
  });
}

async function loadCoaching(jobId, force = false) {
  coachingLoading.classList.remove("hidden");
  coachingBody.classList.add("hidden");
  if (force) regenerateCoachingBtn.classList.add("btn-loading");
  try {
    const report = await jobsApi.coaching(jobId, token, force);
    coachingProviderBadge.textContent = report.provider;
    coachingSummary.textContent = report.report_json.summary ?? report.report_text;
    bulletList(coachingStrengths, report.report_json.strengths ?? [], "No strengths identified yet.");
    bulletList(coachingRecommendations, report.report_json.training_recommendations ?? [], "No recommendations yet.");
    coachingLoading.classList.add("hidden");
    coachingBody.classList.remove("hidden");
    if (force) showToast("Coaching report regenerated.", "success");
  } catch (error) {
    coachingLoading.textContent = error instanceof ApiError ? error.message : "Could not load the coaching report.";
    if (force) showToast("Couldn't regenerate the coaching report.", "error");
  } finally {
    regenerateCoachingBtn.classList.remove("btn-loading");
  }
}

function renderShots(shots) {
  if (shots.length === 0) {
    shotsTableBody.innerHTML = `<tr><td colspan="6">No shot events were detected in this clip.</td></tr>`;
    return;
  }
  shotsTableBody.innerHTML = shots
    .map(
      (shot) => `
        <tr>
          <td>${shot.timestamp.toFixed(1)}s</td>
          <td>${escapeHtml(shot.shot_type.replace(/_/g, " "))}</td>
          <td>${shot.player_id ?? "—"}</td>
          <td>${shot.speed_km_h.toFixed(0)} km/h</td>
          <td>${shot.angle_deg.toFixed(0)}°</td>
          <td>${shot.quality_score ?? "—"}${shot.quality_grade ? ` (${shot.quality_grade})` : ""}</td>
        </tr>
      `,
    )
    .join("");
}

async function renderResults(job, token) {
  const summary = job.result_summary;
  const artifacts = job.artifacts;

  jobTitle.textContent = job.original_filename;
  jobMeta.textContent = `${job.mode} · ${new Date(job.created_at).toLocaleString()}`;
  confidenceBadge.textContent = `${summary.model.analysis_confidence} confidence`;
  confidenceBadge.className = `confidence-badge confidence-${summary.model.analysis_confidence}`;

  kpiAvgSpeed.classList.remove("skeleton");
  kpiMaxSpeed.classList.remove("skeleton");
  kpiShots.classList.remove("skeleton");
  kpiRallies.classList.remove("skeleton");
  countUpTo(kpiAvgSpeed, summary.avg_shuttle_speed_km_h, { formatter: (n) => `${n.toFixed(0)} km/h` });
  countUpTo(kpiMaxSpeed, summary.max_shuttle_speed_km_h, { formatter: (n) => `${n.toFixed(0)} km/h` });
  countUpTo(kpiShots, summary.shot_stats.total_shots);
  countUpTo(kpiRallies, summary.total_rallies);

  renderBarChart(summary.stroke_counts);
  renderPieChart(summary.stroke_counts);

  bulletList(
    weaknessesList,
    summary.tactical.weaknesses.map((w) => w.message),
    "No weaknesses flagged.",
  );
  bulletList(tipsList, summary.tactical.coaching_tips, "No coaching tips yet.");

  const heatmapKeys = Object.keys(artifacts.heatmaps);
  const player0Key = heatmapKeys.find((k) => k === "player_0") ?? heatmapKeys[0];
  const player1Key = heatmapKeys.find((k) => k === "player_1") ?? heatmapKeys[1];
  if (player0Key) document.getElementById("heatmap0").src = await loadAuthedObjectUrl(`/jobs/${job.id}/heatmaps/${player0Key}`, token);
  if (player1Key) document.getElementById("heatmap1").src = await loadAuthedObjectUrl(`/jobs/${job.id}/heatmaps/${player1Key}`, token);

  replayVideo.src = await loadAuthedObjectUrl(`/jobs/${job.id}/video`, token);

  const shots = await jobsApi.shots(job.id, token);
  renderShots(shots);

  downloadVideoBtn.addEventListener("click", async () => {
    downloadVideoBtn.classList.add("btn-loading");
    try {
      await downloadAuthedFile(`/jobs/${job.id}/video`, token, `${job.original_filename}-annotated.mp4`);
      showToast("Video download started.", "success");
    } catch {
      showToast("Couldn't download the video.", "error");
    } finally {
      downloadVideoBtn.classList.remove("btn-loading");
    }
  });
  downloadReplayBtn.addEventListener("click", async () => {
    downloadReplayBtn.classList.add("btn-loading");
    try {
      await downloadAuthedFile(`/jobs/${job.id}/replay`, token, `${job.original_filename}-replay.json`);
      showToast("Replay JSON download started.", "success");
    } catch {
      showToast("Couldn't download the replay file.", "error");
    } finally {
      downloadReplayBtn.classList.remove("btn-loading");
    }
  });
  document.getElementById("openReplayLink").href = `../replay/index.html?jobId=${job.id}`;

  regenerateCoachingBtn.addEventListener("click", () => loadCoaching(jobId, true));
  loadCoaching(jobId, false);

  loadingNotice.classList.add("hidden");
  resultsContent.classList.remove("hidden");
  animateOnEnter();
}

(async () => {
  const user = await verifySession();
  nav.setUserEmail(user.email);
  const token = authStore.getState().accessToken;

  try {
    const job = await jobsApi.get(jobId, token);
    if (job.status !== "done" || !job.result_summary || !job.artifacts) {
      loadingNotice.classList.add("hidden");
      notDoneNotice.classList.remove("hidden");
      goToProcessingLink.href = `../processing/index.html?jobId=${job.id}`;
      return;
    }
    await renderResults(job, token);
  } catch (error) {
    loadingNotice.textContent = error instanceof ApiError ? error.message : "Could not load this analysis.";
    showToast("Couldn't load this analysis.", "error");
  }
})();
