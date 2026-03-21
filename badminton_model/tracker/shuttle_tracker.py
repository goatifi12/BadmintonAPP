from ultralytics import YOLO
import cv2
import pickle
import pandas as pd
import numpy as np
import math


class ShuttleTracker:
    def __init__(self, model_path: str):
        """
        Loads YOLO model for shuttle detection
        """
        self.model = YOLO(model_path)

    def detect_frame(self, frame, frame_idx=None):
        """
        Detect shuttle in a single frame.
        frame_idx is optional and only used for debug / logging.
        """
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Multi-scale detection for better small object detection
        results = self.model.predict(
            frame_rgb,
            conf=0.08,  # Even lower threshold
            imgsz=1280,  # Larger image size for better detection
            verbose=False,
            iou=0.4  # Lower IOU to catch more overlapping detections
        )[0]

        shuttle_dict = {}

        if results.boxes is None or len(results.boxes) == 0:
            return shuttle_dict

        # Get the detection with highest confidence if multiple
        max_conf = 0
        best_box = None
        
        for box in results.boxes:
            cls = int(box.cls.tolist()[0])
            if cls != 0:
                continue

            conf = float(box.conf.tolist()[0])
            if conf > max_conf:
                max_conf = conf
                best_box = box

        if best_box is not None:
            xyxy = best_box.xyxy.tolist()[0]
            shuttle_dict[0] = xyxy

        # Optional debug print - only every 30 frames
        if frame_idx is not None and frame_idx % 30 == 0:
            print(f"Frame {frame_idx}: detections -> {shuttle_dict}")

        return shuttle_dict

    def detect_shuttle(self, frames, last_detect=False, path_of_last_detect=None):
        """
        Detect shuttle across all frames
        """
        if last_detect and path_of_last_detect is not None:
            with open(path_of_last_detect, 'rb') as f:
                shuttle_detections = pickle.load(f)
            return shuttle_detections

        shuttle_detections = []
        for i, frame in enumerate(frames):
            shuttle_dict = self.detect_frame(frame, frame_idx=i)
            shuttle_detections.append(shuttle_dict)

        if path_of_last_detect is not None:
            with open(path_of_last_detect, 'wb') as f:
                pickle.dump(shuttle_detections, f)

        return shuttle_detections

    def interpolate_shuttle_position(self, shuttle_detections):
        """
        Enhanced interpolation with gap limits and smoothing
        """
        rows = []
        has_detection = []

        for det in shuttle_detections:
            if 0 in det and det[0] is not None:
                rows.append(det[0])
                has_detection.append(True)
            else:
                rows.append([None, None, None, None])
                has_detection.append(False)

        df = pd.DataFrame(rows, columns=["x1", "y1", "x2", "y2"])
        
        # Only interpolate if gap is reasonable (max 15 frames ~ 0.5 seconds at 30fps)
        MAX_GAP = 15
        
        # Mark sections with large gaps
        for col in df.columns:
            gaps = df[col].isna()
            gap_starts = []
            gap_ends = []
            
            in_gap = False
            gap_start = 0
            
            for i, is_na in enumerate(gaps):
                if is_na and not in_gap:
                    gap_start = i
                    in_gap = True
                elif not is_na and in_gap:
                    gap_ends.append((gap_start, i - 1))
                    in_gap = False
            
            # Don't interpolate large gaps
            for start, end in gap_ends:
                if end - start > MAX_GAP:
                    # Keep as NaN - don't interpolate
                    continue
                    
        # Standard interpolation
        df = df.interpolate(method='linear', limit=MAX_GAP)
        df = df.bfill(limit=5).ffill(limit=5)  # Only fill small gaps at start/end
        
        # Apply moving average smoothing to reduce jitter
        window_size = 3
        for col in df.columns:
            df[col] = df[col].rolling(window=window_size, center=True, min_periods=1).mean()

        interpolated = []
        for i, row in df.iterrows():
            if row.isna().any():
                interpolated.append({})  # Keep empty if still has NaN
            else:
                interpolated.append({0: row.tolist()})
                
        return interpolated

    def draw_shuttle_bbox(self, frames, shuttle_detections, fps=30):
        """
        Draw bounding boxes, centers, speed, and trails with detection quality indicator
        """
        output_frames = []
        prev_center = None
        trail_points = []  # Store trail history
        MAX_TRAIL_LENGTH = 15  # Show last 15 positions

        PIXELS_TO_METERS = 0.02

        for i, (frame, det) in enumerate(zip(frames, shuttle_detections)):
            # Add detection count info
            detection_status = "DETECTED" if (0 in det) else "INTERPOLATED"
            color = (0, 255, 0) if (0 in det) else (255, 165, 0)
            
            cv2.putText(
                frame,
                f"Frame {i} | {detection_status}",
                (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                color,
                2
            )

            current_center = None

            if 0 in det:
                x1, y1, x2, y2 = det[0]

                # Different color for interpolated vs actual detections
                bbox_color = (0, 255, 0) if detection_status == "DETECTED" else (255, 165, 0)
                
                cv2.rectangle(
                    frame,
                    (int(x1), int(y1)),
                    (int(x2), int(y2)),
                    bbox_color,
                    2
                )

                cx = int((x1 + x2) / 2)
                cy = int((y1 + y2) / 2)
                current_center = (cx, cy)

                # Draw center point
                cv2.circle(frame, current_center, 5, (0, 0, 255), -1)
                
                # Add to trail
                trail_points.append(current_center)
                if len(trail_points) > MAX_TRAIL_LENGTH:
                    trail_points.pop(0)

                # Draw trail
                for j in range(1, len(trail_points)):
                    alpha = j / len(trail_points)  # Fade effect
                    thickness = max(1, int(3 * alpha))
                    cv2.line(
                        frame,
                        trail_points[j - 1],
                        trail_points[j],
                        (255, 0, 255),
                        thickness
                    )

                # Calculate speed
                if prev_center is not None:
                    dx = cx - prev_center[0]
                    dy = cy - prev_center[1]
                    pixel_dist = math.sqrt(dx * dx + dy * dy)

                    speed_kmh = pixel_dist * PIXELS_TO_METERS * fps * 3.6

                    cv2.putText(
                        frame,
                        f"{speed_kmh:.1f} km/h",
                        (cx + 10, cy - 10),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.5,
                        (255, 255, 0),
                        2
                    )

            prev_center = current_center
            output_frames.append(frame)

        return output_frames