import { apiClient } from "@/api/client";
import type { CoachingReportRead, PlayerTrackRead, ShotEventRead } from "@/types/analytics";
import type { AnalysisJobRead } from "@/types/jobs";
import type { ReplayData } from "@/types/replay";

export const jobsApi = {
  create: (file: File, mode: string, token: string) => {
    const formData = new FormData();
    formData.append("video", file);
    formData.append("mode", mode);
    return apiClient.postForm<AnalysisJobRead>("/jobs", formData, token);
  },
  get: (jobId: string, token: string) => apiClient.get<AnalysisJobRead>(`/jobs/${jobId}`, token),
  list: (token: string) => apiClient.get<AnalysisJobRead[]>("/jobs", token),
  shots: (jobId: string, token: string) => apiClient.get<ShotEventRead[]>(`/jobs/${jobId}/shots`, token),
  playerTracks: (jobId: string, token: string) => apiClient.get<PlayerTrackRead[]>(`/jobs/${jobId}/player-tracks`, token),
  replay: (jobId: string, token: string) => apiClient.get<ReplayData>(`/jobs/${jobId}/replay`, token),
  coaching: (jobId: string, token: string, force = false) =>
    apiClient.post<CoachingReportRead>(`/jobs/${jobId}/coaching${force ? "?force=true" : ""}`, undefined, token),
};
