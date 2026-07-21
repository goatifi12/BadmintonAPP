export interface ShotEventRead {
  id: string;
  frame: number;
  timestamp: number;
  player_id: number | null;
  shot_type: string;
  confidence: number;
  speed_km_h: number;
  angle_deg: number;
  landing_x: number | null;
  landing_y: number | null;
  quality_score: number | null;
  quality_grade: string | null;
}

export interface PlayerTrackRead {
  id: string;
  frame: number;
  player_id: number;
  team: string;
  x: number;
  y: number;
  speed_ms: number;
  confidence: number;
}

export interface CoachingReportRead {
  provider: string;
  model: string;
  prompt_version: string;
  report_json: {
    strengths?: string[];
    weaknesses?: string[];
    tactical_analysis?: string[];
    training_recommendations?: string[];
    summary?: string;
  };
  report_text: string;
}
