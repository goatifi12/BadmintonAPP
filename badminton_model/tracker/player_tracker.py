from ultralytics import YOLO
import cv2
import pickle


class PlayerTracker:
    def __init__(self, model_path):
        self.model = YOLO(model_path)

    def detect_frame(self, frame):
        """This function returns a dictionary containing the key of each player and the value of bbox."""
        # Lower confidence, higher image size for better detection
        tracker = self.model.track(
            frame, 
            persist=True,
            conf=0.3,  # Lower confidence threshold
            imgsz=1280,  # Larger image size
            verbose=False
        )[0]
        
        tracker_id = tracker.names
        player_dict = {}
        
        for box in tracker.boxes:
            if box.id is None:  # Skip if no tracking ID
                continue
                
            box_id = int(box.id.tolist()[0])
            xyxy = box.xyxy.tolist()[0]
            player_id = box.cls.tolist()[0]
            player_name = tracker_id[player_id]
            
            # Store both players
            player_dict[box_id] = xyxy
            
        return player_dict

    def detect_player(self, frames, last_detect=False, path_of_last_detect=None):
        """This function detects the player in each frame and returns it as a list of dictionaries containing bbox."""
        # read last detect player
        if last_detect and path_of_last_detect is not None:
            with open(path_of_last_detect, 'rb') as f:
                player_detections = pickle.load(f)
            return player_detections

        player_detections = []
        for i, frame in enumerate(frames):
            player_dict = self.detect_frame(frame)
            player_detections.append(player_dict)
            
            # Debug output every 100 frames
            if i % 100 == 0:
                print(f"Frame {i}: Detected {len(player_dict)} players")

        if path_of_last_detect is not None:
            with open(path_of_last_detect, 'wb') as f:
                pickle.dump(player_detections, f)

        return player_detections

    def player_positions(self, frames, detections):
        """Calculate center positions for all detected players"""
        c_positions = {}
        for k, bbox in detections.items():
            x1, y1, x2, y2 = bbox
            # Calculate center position
            c_x = x1 + (x2 - x1) / 2
            c_y = y1 + (y2 - y1) / 2
            c_positions[k] = [c_x, c_y]
        return c_positions  
    
    def draw_player_bbox(self, frames, player_detections):
        """Draw bounding boxes and labels for players"""
        player_frames = []
        
        for frame, player_detect in zip(frames, player_detections):
            for id, box in player_detect.items():
                x1, y1, x2, y2 = box
                
                # Different colors for different players
                if id == 1:
                    color = (0, 0, 255)  # Red for Player 1
                else:
                    color = (255, 0, 0)  # Blue for Player 2
                
                # Draw label
                cv2.putText(
                    frame, 
                    f"Player: {id}", 
                    (int(x1), int(y1 - 10)),
                    cv2.FONT_HERSHEY_SIMPLEX, 
                    0.9, 
                    color, 
                    2
                )
                
                # Draw bounding box
                cv2.rectangle(
                    frame, 
                    (int(x1), int(y1)), 
                    (int(x2), int(y2)), 
                    color, 
                    2
                )
                
            player_frames.append(frame)
            
        return player_frames