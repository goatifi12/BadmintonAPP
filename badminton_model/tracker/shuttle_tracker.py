from ultralytics import YOLO
import cv2
import pickle
import pandas as pd
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

        results = self.model.predict(
            frame_rgb,
            conf=0.10,
            imgsz=640,
            verbose=False
        )[0]

        shuttle_dict = {}

        if results.boxes is None or len(results.boxes) == 0:
            return shuttle_dict

        for box in results.boxes:
            cls = int(box.cls.tolist()[0])
            if cls != 0:
                continue

            xyxy = box.xyxy.tolist()[0]
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
        Fills missing frames using linear interpolation
        """
        rows = []

        for det in shuttle_detections:
            if 0 in det:
                rows.append(det[0])
            else:
                rows.append([None, None, None, None])

        df = pd.DataFrame(rows, columns=["x1", "y1", "x2", "y2"])
        df = df.interpolate()
        df = df.bfill().ffill()

        interpolated = [{0: row.tolist()} for _, row in df.iterrows()]
        return interpolated

    def draw_shuttle_bbox(self, frames, shuttle_detections, fps=30):
        """
        Draw bounding boxes, centers, speed, and trails
        """
        output_frames = []
        prev_center = None

        PIXELS_TO_METERS = 0.02

        for i, (frame, det) in enumerate(zip(frames, shuttle_detections)):

            cv2.putText(
                frame,
                f"Frame {i} | Detections: {len(det)}",
                (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 0),
                2
            )

            current_center = None

            if 0 in det:
                x1, y1, x2, y2 = det[0]

                cv2.rectangle(
                    frame,
                    (int(x1), int(y1)),
                    (int(x2), int(y2)),
                    (0, 255, 0),
                    2
                )

                cx = int((x1 + x2) / 2)
                cy = int((y1 + y2) / 2)
                current_center = (cx, cy)

                cv2.circle(frame, current_center, 5, (0, 0, 255), -1)

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

                    cv2.line(
                        frame,
                        prev_center,
                        current_center,
                        (255, 0, 255),
                        2
                    )

            prev_center = current_center
            output_frames.append(frame)

        return output_frames