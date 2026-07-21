import "@/components/app-nav/app-nav";
import { jobsApi } from "@/api/jobs";
import { ApiError } from "@/api/client";
import { requireToken, verifySession } from "@/lib/auth-guard";
import { loadAuthedObjectUrl, trackObjectUrlsForCleanup } from "@/lib/authed-assets";
import { animateOnEnter, showToast } from "@/lib/motion";
import { initTheme } from "@/lib/theme";
import { authStore } from "@/state/auth-store";
import { COURT_HEIGHT_M, COURT_WIDTH_M, type ReplayData, type ReplayShotEvent } from "@/types/replay";

initTheme();
requireToken();
trackObjectUrlsForCleanup();

const jobId = new URLSearchParams(window.location.search).get("jobId");
if (!jobId) {
  window.location.replace("../reports/index.html");
  throw new Error("no jobId provided");
}

const nav = document.querySelector("app-nav") as HTMLElement & { setUserEmail(email: string): void };
const loadingNotice = document.getElementById("loadingNotice") as HTMLDivElement;
const notDoneNotice = document.getElementById("notDoneNotice") as HTMLDivElement;
const goToProcessingLink = document.getElementById("goToProcessingLink") as HTMLAnchorElement;
const replayContent = document.getElementById("replayContent") as HTMLDivElement;

const replayTitle = document.getElementById("replayTitle") as HTMLHeadingElement;
const backToResultsLink = document.getElementById("backToResultsLink") as HTMLAnchorElement;
const timeReadout = document.getElementById("timeReadout") as HTMLSpanElement;
const frameReadout = document.getElementById("frameReadout") as HTMLSpanElement;

const video = document.getElementById("replayVideo") as HTMLVideoElement;
const playPauseBtn = document.getElementById("playPauseBtn") as HTMLButtonElement;
const stepBackBtn = document.getElementById("stepBackBtn") as HTMLButtonElement;
const stepForwardBtn = document.getElementById("stepForwardBtn") as HTMLButtonElement;
const speedSelect = document.getElementById("speedSelect") as HTMLSelectElement;
const timelineRange = document.getElementById("timelineRange") as HTMLInputElement;
const timelineMarkers = document.getElementById("timelineMarkers") as HTMLDivElement;
const activeShotBanner = document.getElementById("activeShotBanner") as HTMLDivElement;
const replayShotsList = document.getElementById("replayShotsList") as HTMLDivElement;

const shuttleDot = document.getElementById("shuttleDot") as unknown as SVGCircleElement;
const player0Dot = document.getElementById("player0Dot") as unknown as SVGCircleElement;
const player1Dot = document.getElementById("player1Dot") as unknown as SVGCircleElement;

let replay: ReplayData | null = null;
let isScrubbing = false;

function formatClock(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function frameForTime(currentTime: number): number {
  if (!replay) return 0;
  return Math.min(replay.frames.length - 1, Math.max(0, Math.round(currentTime * replay.fps)));
}

function updateCourtView(frameIndex: number): void {
  if (!replay) return;
  const frame = replay.frames[frameIndex];
  if (!frame) return;

  if (frame.shuttle) {
    shuttleDot.style.display = "block";
    shuttleDot.setAttribute("cx", String((frame.shuttle.mx / COURT_WIDTH_M) * 61));
    shuttleDot.setAttribute("cy", String((frame.shuttle.my / COURT_HEIGHT_M) * 134));
  } else {
    shuttleDot.style.display = "none";
  }

  const team0 = frame.players.find((p) => p.team === 0 && p.mx !== null && p.my !== null);
  const team1 = frame.players.find((p) => p.team === 1 && p.mx !== null && p.my !== null);

  if (team0) {
    player0Dot.style.display = "block";
    player0Dot.setAttribute("cx", String((team0.mx! / COURT_WIDTH_M) * 61));
    player0Dot.setAttribute("cy", String((team0.my! / COURT_HEIGHT_M) * 134));
  } else {
    player0Dot.style.display = "none";
  }

  if (team1) {
    player1Dot.style.display = "block";
    player1Dot.setAttribute("cx", String((team1.mx! / COURT_WIDTH_M) * 61));
    player1Dot.setAttribute("cy", String((team1.my! / COURT_HEIGHT_M) * 134));
  } else {
    player1Dot.style.display = "none";
  }
}

function findActiveShot(currentTime: number): ReplayShotEvent | null {
  if (!replay) return null;
  const windowSeconds = 0.4;
  return replay.shot_events.find((shot) => Math.abs(shot.frame / replay!.fps - currentTime) <= windowSeconds) ?? null;
}

function updateActiveShotHighlight(activeShot: ReplayShotEvent | null): void {
  const rows = replayShotsList.querySelectorAll<HTMLButtonElement>(".replay-shot-row");
  for (const row of rows) {
    row.classList.toggle("active", activeShot !== null && row.dataset.frame === String(activeShot.frame));
  }

  if (activeShot) {
    activeShotBanner.classList.remove("hidden");
    activeShotBanner.textContent = `${activeShot.stroke_type.replace(/_/g, " ")} — score ${activeShot.score}/100 (${activeShot.grade}), ${activeShot.speed_km_h.toFixed(0)} km/h`;
  } else {
    activeShotBanner.classList.add("hidden");
  }
}

function onPlaybackTick(): void {
  const frameIndex = frameForTime(video.currentTime);
  timeReadout.textContent = `${formatClock(video.currentTime)} / ${formatClock(video.duration || 0)}`;
  frameReadout.textContent = `frame ${frameIndex}`;
  updateCourtView(frameIndex);
  updateActiveShotHighlight(findActiveShot(video.currentTime));
  if (!isScrubbing) timelineRange.value = String(video.currentTime);
}

function renderTimelineMarkers(): void {
  if (!replay || !video.duration) return;
  const duration = video.duration;
  timelineMarkers.innerHTML = replay.shot_events
    .map((shot) => {
      const timestamp = shot.frame / replay!.fps;
      const leftPercent = Math.min(100, Math.max(0, (timestamp / duration) * 100));
      return `<div class="timeline-marker" style="left:${leftPercent}%" data-timestamp="${timestamp}" title="${escapeHtml(shot.stroke_type)} @ ${timestamp.toFixed(1)}s"></div>`;
    })
    .join("");

  for (const marker of timelineMarkers.querySelectorAll<HTMLDivElement>(".timeline-marker")) {
    marker.addEventListener("click", () => {
      video.currentTime = Number(marker.dataset.timestamp ?? 0);
      video.pause();
    });
  }
}

function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function renderShotsList(shotEvents: ReplayShotEvent[]): void {
  if (shotEvents.length === 0) {
    replayShotsList.innerHTML = `<p class="replay-shot-meta">No shot events were detected in this clip.</p>`;
    return;
  }
  replayShotsList.innerHTML = shotEvents
    .map(
      (shot) => `
        <button class="replay-shot-row" data-frame="${shot.frame}" data-timestamp="${shot.frame / replay!.fps}">
          <span class="replay-shot-type">${escapeHtml(shot.stroke_type.replace(/_/g, " "))}</span>
          <span class="replay-shot-meta">${shot.speed_km_h.toFixed(0)} km/h · ${shot.score}/100</span>
        </button>
      `,
    )
    .join("");

  for (const row of replayShotsList.querySelectorAll<HTMLButtonElement>(".replay-shot-row")) {
    row.addEventListener("click", () => {
      video.currentTime = Number(row.dataset.timestamp ?? 0);
      video.pause();
    });
  }
}

playPauseBtn.addEventListener("click", () => {
  if (video.paused) void video.play();
  else video.pause();
});

video.addEventListener("play", () => (playPauseBtn.textContent = "Pause"));
video.addEventListener("pause", () => (playPauseBtn.textContent = "Play"));

stepBackBtn.addEventListener("click", () => {
  if (!replay) return;
  video.pause();
  video.currentTime = Math.max(0, video.currentTime - 1 / replay.fps);
});

stepForwardBtn.addEventListener("click", () => {
  if (!replay) return;
  video.pause();
  video.currentTime = Math.min(video.duration, video.currentTime + 1 / replay.fps);
});

speedSelect.addEventListener("change", () => {
  video.playbackRate = Number(speedSelect.value);
});

timelineRange.addEventListener("pointerdown", () => (isScrubbing = true));
timelineRange.addEventListener("input", () => {
  video.currentTime = Number(timelineRange.value);
});
timelineRange.addEventListener("change", () => (isScrubbing = false));

video.addEventListener("timeupdate", onPlaybackTick);
video.addEventListener("seeked", onPlaybackTick);
video.addEventListener("loadedmetadata", () => {
  timelineRange.max = String(video.duration);
  timelineRange.step = "0.01";
  renderTimelineMarkers();
  onPlaybackTick();
});

void (async () => {
  const user = await verifySession();
  nav.setUserEmail(user.email);
  const token = authStore.getState().accessToken!;
  backToResultsLink.href = `../results/index.html?jobId=${jobId}`;
  goToProcessingLink.href = `../processing/index.html?jobId=${jobId}`;

  try {
    const job = await jobsApi.get(jobId!, token);
    if (job.status !== "done" || !job.artifacts) {
      loadingNotice.classList.add("hidden");
      notDoneNotice.classList.remove("hidden");
      return;
    }

    replayTitle.textContent = `Replay — ${job.original_filename}`;
    const [replayData, videoUrl] = await Promise.all([jobsApi.replay(job.id, token), loadAuthedObjectUrl(`/jobs/${job.id}/video`, token)]);
    replay = replayData;
    video.src = videoUrl;
    renderShotsList(replay.shot_events);

    loadingNotice.classList.add("hidden");
    replayContent.classList.remove("hidden");
    animateOnEnter();
  } catch (error) {
    loadingNotice.textContent = error instanceof ApiError ? error.message : "Could not load this replay.";
    showToast("Couldn't load this replay.", "error");
  }
})();
