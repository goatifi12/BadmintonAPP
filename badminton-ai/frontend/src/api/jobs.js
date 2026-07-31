import { apiClient } from "./client.js";

export const jobsApi = {
  create: (file, mode, token) => {
    const formData = new FormData();
    formData.append("video", file);
    formData.append("mode", mode);
    return apiClient.postForm("/jobs", formData, token);
  },
  get: (jobId, token) => apiClient.get(`/jobs/${jobId}`, token),
  list: (token) => apiClient.get("/jobs", token),
  shots: (jobId, token) => apiClient.get(`/jobs/${jobId}/shots`, token),
  playerTracks: (jobId, token) => apiClient.get(`/jobs/${jobId}/player-tracks`, token),
  replay: (jobId, token) => apiClient.get(`/jobs/${jobId}/replay`, token),
  coaching: (jobId, token, force = false) =>
    apiClient.post(`/jobs/${jobId}/coaching${force ? "?force=true" : ""}`, undefined, token),
};
