import type { AnalysisJobRead } from "@/types/jobs";

const STATUS_LABELS: Record<AnalysisJobRead["status"], string> = {
  queued: "Queued",
  processing: "Processing",
  done: "Done",
  error: "Error",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function linkFor(job: AnalysisJobRead): string {
  if (job.status === "done") return `/src/pages/results/index.html?jobId=${job.id}`;
  if (job.status === "error") return `/src/pages/reports/index.html`;
  return `/src/pages/processing/index.html?jobId=${job.id}`;
}

export function renderJobCard(job: AnalysisJobRead): string {
  const shots = job.result_summary?.shot_stats?.total_shots;
  const speed = job.result_summary?.avg_shuttle_speed_km_h;
  const metaParts = [job.mode];
  if (job.status === "done" && typeof shots === "number") metaParts.push(`${shots} shots`);
  if (job.status === "done" && typeof speed === "number") metaParts.push(`${speed} km/h avg`);
  if (job.status === "processing" || job.status === "queued") metaParts.push(`${job.progress}% · ${job.stage.replace(/_/g, " ")}`);
  if (job.status === "error") metaParts.push(job.error ?? "failed");

  return `
    <a class="job-card status-${job.status}" href="${linkFor(job)}">
      <div class="job-card-main">
        <span class="job-card-name">${escapeHtml(job.original_filename)}</span>
        <span class="job-card-meta">${escapeHtml(metaParts.join(" · "))}</span>
      </div>
      <div class="job-card-side">
        <span class="job-status-badge status-${job.status}">${STATUS_LABELS[job.status]}</span>
        <span class="job-card-date">${formatDate(job.created_at)}</span>
      </div>
    </a>
  `;
}

function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
