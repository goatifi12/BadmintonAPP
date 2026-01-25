import math

def analyze_footwork(detections, fps=30):
    """
    Compute real physics-based metrics from shuttle detections.
    
    Args:
        detections: List of frame detections [{0: [x1, y1, x2, y2]}, ...]
        fps: Video frame rate (default 30)
    
    Returns:
        dict: Real motion metrics
    """
    
    # ============================================================
    # EXTRACT SHUTTLE CENTER POSITIONS
    # ============================================================
    positions = []
    for frame_det in detections:
        if 0 in frame_det:
            x1, y1, x2, y2 = frame_det[0]
            cx = (x1 + x2) / 2
            cy = (y1 + y2) / 2
            positions.append((cx, cy))
        else:
            positions.append(None)

    # ============================================================
    # 1️⃣ SHUTTLE SPEED (pixels/frame → km/h)
    # ============================================================
    speeds_px_per_frame = []
    speeds_km_h = []
    
    # Assume 1 pixel ≈ 0.02 meters (rough court estimation)
    PIXELS_TO_METERS = 0.02
    
    for i in range(1, len(positions)):
        if positions[i] and positions[i-1]:
            dx = positions[i][0] - positions[i-1][0]
            dy = positions[i][1] - positions[i-1][1]
            pixel_dist = math.sqrt(dx*dx + dy*dy)
            speeds_px_per_frame.append(pixel_dist)
            
            # Convert to km/h
            # pixel_dist * PIXELS_TO_METERS = meters per frame
            # meters_per_frame * fps = meters per second
            # meters_per_second * 3.6 = km/h
            meters_per_frame = pixel_dist * PIXELS_TO_METERS
            meters_per_second = meters_per_frame * fps
            km_h = meters_per_second * 3.6
            speeds_km_h.append(km_h)

    # ============================================================
    # 2️⃣ RALLY LENGTH (continuous detection segments)
    # ============================================================
    rally_lengths = []
    current_rally = 0
    
    for pos in positions:
        if pos is not None:
            current_rally += 1
        else:
            if current_rally > 0:
                rally_lengths.append(current_rally)
                current_rally = 0
    
    # Add final rally if video ends during detection
    if current_rally > 0:
        rally_lengths.append(current_rally)
    
    # Convert frames to seconds
    avg_rally_frames = sum(rally_lengths) / len(rally_lengths) if rally_lengths else 0
    avg_rally_seconds = avg_rally_frames / fps

    # ============================================================
    # 3️⃣ TOTAL DISTANCE (meters)
    # ============================================================
    total_distance_pixels = sum(speeds_px_per_frame)
    total_distance_meters = total_distance_pixels * PIXELS_TO_METERS

    # ============================================================
    # 4️⃣ MOVEMENT SMOOTHNESS (variance of speed)
    # ============================================================
    if len(speeds_km_h) > 1:
        mean_speed = sum(speeds_km_h) / len(speeds_km_h)
        variance = sum((s - mean_speed) ** 2 for s in speeds_km_h) / len(speeds_km_h)
        smoothness = 1 / (1 + variance)  # 0-1 scale, higher = smoother
    else:
        smoothness = 0

    # ============================================================
    # 5️⃣ DETECTION CONSISTENCY
    # ============================================================
    detected_count = sum(1 for p in positions if p)
    consistency_percent = round(100 * detected_count / len(detections), 1) if detections else 0

    # ============================================================
    # RETURN METRICS
    # ============================================================
    return {
        "frames_processed": len(detections),
        "detections": detected_count,
        "consistency_percent": consistency_percent,
        
        # Speed metrics (km/h)
        "avg_shuttle_speed_km_h": round(sum(speeds_km_h) / len(speeds_km_h), 2) if speeds_km_h else 0,
        "max_shuttle_speed_km_h": round(max(speeds_km_h), 2) if speeds_km_h else 0,
        
        # Rally metrics
        "avg_rally_length_frames": round(avg_rally_frames, 1),
        "avg_rally_length_seconds": round(avg_rally_seconds, 2),
        "total_rallies": len(rally_lengths),
        
        # Movement metrics
        "total_distance_meters": round(total_distance_meters, 2),
        "movement_smoothness": round(smoothness, 3),
        
        # Additional stats
        "min_speed_km_h": round(min(speeds_km_h), 2) if speeds_km_h else 0,
        "speed_variance": round(variance if len(speeds_km_h) > 1 else 0, 2)
    }