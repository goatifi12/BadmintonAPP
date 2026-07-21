export interface ReplayShuttlePoint {
  px: number;
  py: number;
  mx: number;
  my: number;
}

export interface ReplayPlayerPoint {
  id: number | null;
  team: number | null;
  px: number | null;
  py: number | null;
  mx: number | null;
  my: number | null;
  pose: string;
}

export interface ReplayFrame {
  frame: number;
  t_ms: number;
  shuttle: ReplayShuttlePoint | null;
  players: ReplayPlayerPoint[];
}

export interface ReplayShotEvent {
  frame: number;
  stroke_type: string;
  score: number;
  grade: string;
  player_id: number | null;
  landing_m: [number, number] | null;
  speed_km_h: number;
  explanation: string;
}

export interface ReplayData {
  version: string;
  fps: number;
  total_frames: number;
  court_corners_px: number[][];
  frames: ReplayFrame[];
  shot_events: ReplayShotEvent[];
}

// Court dimensions in meters, matching backend/app/pipeline/court.py (COURT_W/COURT_H).
export const COURT_WIDTH_M = 6.1;
export const COURT_HEIGHT_M = 13.4;
