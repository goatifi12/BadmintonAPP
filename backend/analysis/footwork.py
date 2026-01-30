import math
from typing import List, Dict

def analyze_footwork(detections: List[Dict], fps: int = 30) -> Dict:
    """
    Compute real physics-based metrics from shuttle detections.
    NOW INCLUDES STROKE CLASSIFICATION!
    
    Args:
        detections: List of frame detections [{0: [x1, y1, x2, y2]}, ...]
        fps: Video frame rate (default 30)
    
    Returns:
        dict: Complete analysis with motion metrics AND stroke classification
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
    
    # Court-based calibration
    # Standard badminton court width ≈ 6.1m shown in ~400 pixels
    # So 1 pixel ≈ 0.015 meters (more accurate calibration)
    PIXELS_TO_METERS = 0.015
    
    for i in range(1, len(positions)):
        if positions[i] and positions[i-1]:
            dx = positions[i][0] - positions[i-1][0]
            dy = positions[i][1] - positions[i-1][1]
            pixel_dist = math.sqrt(dx*dx + dy*dy)
            speeds_px_per_frame.append(pixel_dist)
            
            # Convert to km/h
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
    
    if current_rally > 0:
        rally_lengths.append(current_rally)
    
    avg_rally_frames = sum(rally_lengths) / len(rally_lengths) if rally_lengths else 0
    avg_rally_seconds = avg_rally_frames / fps

    # ============================================================
    # 3️⃣ TOTAL DISTANCE (meters)
    # ============================================================
    total_distance_pixels = sum(speeds_px_per_frame)
    total_distance_meters = total_distance_pixels * PIXELS_TO_METERS

    # ============================================================
    # 4️⃣ MOVEMENT SMOOTHNESS (inverse of speed variance)
    # ============================================================
    if len(speeds_km_h) > 1:
        mean_speed = sum(speeds_km_h) / len(speeds_km_h)
        variance = sum((s - mean_speed) ** 2 for s in speeds_km_h) / len(speeds_km_h)
        # Normalize smoothness to 0-1 range (higher = smoother)
        smoothness = 1 / (1 + math.sqrt(variance) / 100)
    else:
        variance = 0
        smoothness = 0

    # ============================================================
    # 5️⃣ DETECTION CONSISTENCY
    # ============================================================
    detected_count = sum(1 for p in positions if p)
    consistency_percent = round(100 * detected_count / len(detections), 1) if detections else 0

    # ============================================================
    # 6️⃣ STROKE CLASSIFICATION (USING YOUR ADVANCED CLASSIFIER!)
    # ============================================================
    from analysis.stroke_classifier import StrokeClassifier
    
    # Initialize classifier with correct parameters
    classifier = StrokeClassifier(fps=fps, pixels_to_meters=PIXELS_TO_METERS)
    
    # Analyze strokes
    stroke_analysis = classifier.analyze_strokes(detections)
    
    print(f"🏸 Stroke analysis complete:")
    print(f"   Total strokes detected: {stroke_analysis.get('total_strokes', 0)}")
    print(f"   Stroke breakdown: {stroke_analysis.get('stroke_counts', {})}")

    # ============================================================
    # RETURN COMPLETE METRICS
    # ============================================================
    return {
        # Basic detection metrics
        "frames_processed": len(detections),
        "detections": detected_count,
        "consistency_percent": consistency_percent,
        
        # Speed metrics (km/h)
        "avg_shuttle_speed_km_h": round(sum(speeds_km_h) / len(speeds_km_h), 2) if speeds_km_h else 0,
        "max_shuttle_speed_km_h": round(max(speeds_km_h), 2) if speeds_km_h else 0,
        "min_speed_km_h": round(min(speeds_km_h), 2) if speeds_km_h else 0,
        "speed_variance": round(variance, 2),
        
        # Rally metrics
        "avg_rally_length_frames": round(avg_rally_frames, 1),
        "avg_rally_length_seconds": round(avg_rally_seconds, 2),
        "total_rallies": len(rally_lengths),
        
        # Movement metrics
        "total_distance_meters": round(total_distance_meters, 2),
        "movement_smoothness": round(smoothness, 3),
        
        # STROKE CLASSIFICATION RESULTS (from your advanced classifier!)
        "stroke_counts": stroke_analysis.get('stroke_counts', {
            "smash": 0, "clear": 0, "drop": 0, "net": 0
        }),
        "stroke_quality": stroke_analysis.get('stroke_quality', {
            "smash": {"avg_speed": 0, "max_speed": 0, "avg_angle": 0},
            "drop": {"net_clearance": 0, "accuracy": 0},
            "clear": {"avg_apex": 0, "depth_percentage": 0}
        })
    }