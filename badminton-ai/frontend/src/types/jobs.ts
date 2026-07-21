export interface ShotStats {
  total_shots: number;
  distribution: Record<string, number>;
  shot_accuracy: number;
  winning_shot_percentage: number;
  error_percentage: number;
}

export interface RallyStats {
  rally_count: number;
  average_rally_length_seconds: number;
  longest_rally_seconds: number;
  shot_sequences: string[][];
}

export interface Weakness {
  type: string;
  severity: string;
  message: string;
  stroke?: string;
}

export interface TacticalData {
  heatmaps: {
    exports: Record<string, string>;
    [key: string]: unknown;
  };
  movement_stats: Record<string, unknown>;
  shot_patterns: Record<string, unknown>;
  weaknesses: Weakness[];
  coaching_tips: string[];
}

export interface ModelInfo {
  name: string;
  method: string;
  analysis_confidence: "high" | "medium" | "low";
  confidence_score: number;
  warnings: string[];
  stages: Array<{ name: string; method: string; confidence: number; warnings: string[] }>;
  evidence: Record<string, unknown>;
}

export interface Insights {
  overall_rating: string;
  consistency_level: string;
  power_analysis: string;
  analysis_confidence: string;
  coaching_provider?: string;
  coaching_summary?: string;
}

export interface ResultSummary {
  avg_shuttle_speed_km_h: number;
  max_shuttle_speed_km_h: number;
  min_speed_km_h: number;
  speed_variance: number;
  avg_rally_length_seconds: number;
  total_rallies: number;
  total_distance_meters: number;
  movement_smoothness: number;
  stroke_counts: Record<string, number>;
  stroke_quality: Record<string, unknown>;
  shot_stats: ShotStats;
  rally_stats: RallyStats;
  movement: Record<string, unknown>;
  tactical: TacticalData;
  model: ModelInfo;
  insights: Insights;
}

export interface JobArtifacts {
  replay: string;
  annotated_video: string;
  heatmaps: Record<string, string>;
}

export interface AnalysisJobRead {
  id: string;
  original_filename: string;
  mode: string;
  status: "queued" | "processing" | "done" | "error";
  stage: string;
  progress: number;
  error: string | null;
  result_summary: ResultSummary | null;
  artifacts: JobArtifacts | null;
  created_at: string;
  updated_at: string;
}
