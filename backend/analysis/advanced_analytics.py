"""
Advanced Analytics Module
Computes point outcomes, efficiency ratios, and error distribution
"""
from typing import List, Dict
import math

def compute_advanced_analytics(detections: List[Dict], basic_metrics: Dict) -> Dict:
    """
    Compute advanced analytics from detections and basic metrics
    
    Args:
        detections: Frame-by-frame shuttle detections
        basic_metrics: Output from analyze_footwork()
    
    Returns:
        Dict with point_outcomes, efficiency_ratios, error_distribution
    """
    
    # Extract positions
    positions = _extract_positions(detections)
    
    # Segment into rallies
    rallies = _segment_rallies(positions)
    
    # Analyze each rally
    rally_analyses = [_analyze_rally(rally, basic_metrics) for rally in rallies]
    
    # Compute point outcomes
    point_outcomes = _compute_point_outcomes(rally_analyses)
    
    # Compute efficiency ratios
    efficiency_ratios = _compute_efficiency_ratios(rally_analyses, basic_metrics)
    
    # Compute error distribution
    error_distribution = _compute_error_distribution(rally_analyses)
    
    return {
        "point_outcomes": point_outcomes,
        "efficiency_ratios": efficiency_ratios,
        "error_distribution": error_distribution,
        "rally_details": rally_analyses[:10]  # First 10 rallies for debugging
    }

def _extract_positions(detections):
    """Extract center positions from detections"""
    positions = []
    for frame_det in detections:
        if 0 in frame_det:
            x1, y1, x2, y2 = frame_det[0]
            cx = (x1 + x2) / 2
            cy = (y1 + y2) / 2
            positions.append((cx, cy))
        else:
            positions.append(None)
    return positions

def _segment_rallies(positions):
    """Segment continuous positions into rallies"""
    rallies = []
    current_rally = []
    
    for pos in positions:
        if pos is not None:
            current_rally.append(pos)
        else:
            if len(current_rally) > 5:  # Min 5 frames = valid rally
                rallies.append(current_rally)
            current_rally = []
    
    if len(current_rally) > 5:
        rallies.append(current_rally)
    
    return rallies

def _analyze_rally(rally_positions, basic_metrics):
    """Analyze a single rally for outcomes and errors"""
    
    # Rally length
    rally_length = len(rally_positions)
    
    # Classify rally length bucket
    if rally_length <= 15:
        length_bucket = "short"
    elif rally_length <= 45:
        length_bucket = "medium"
    else:
        length_bucket = "long"
    
    # Ending zone (court region where rally ends)
    last_pos = rally_positions[-1]
    ending_zone = _classify_court_zone(last_pos)
    
    # Estimate final stroke type (based on trajectory at end)
    final_stroke = _estimate_final_stroke(rally_positions)
    
    # Determine if rally ended in error (sudden stop)
    is_error = _detect_error_ending(rally_positions)
    
    # Player role at end (attacking/defensive based on shuttle height)
    player_role = _estimate_player_role(rally_positions)
    
    # Point outcome (simulated - in real app, would need score tracking)
    point_won = not is_error  # Simplified: error = point lost
    
    return {
        "length": rally_length,
        "length_bucket": length_bucket,
        "ending_zone": ending_zone,
        "final_stroke": final_stroke,
        "player_role": player_role,
        "point_won": point_won,
        "is_error": is_error
    }

def _classify_court_zone(position):
    """Classify position into court zone (9-zone grid)"""
    x, y = position
    
    # Assume court coordinates (adjust based on your video)
    # Left/Center/Right based on X
    if x < 300:
        x_zone = "left"
    elif x < 500:
        x_zone = "center"
    else:
        x_zone = "right"
    
    # Deep/Mid/Forecourt based on Y
    if y < 200:
        y_zone = "forecourt"
    elif y < 400:
        y_zone = "midcourt"
    else:
        y_zone = "deep"
    
    return f"{y_zone}_{x_zone}"

def _estimate_final_stroke(rally_positions):
    """Estimate stroke type from final trajectory"""
    if len(rally_positions) < 3:
        return "unknown"
    
    # Look at last few positions
    final_segment = rally_positions[-3:]
    
    # Calculate speed
    dx = final_segment[-1][0] - final_segment[0][0]
    dy = final_segment[-1][1] - final_segment[0][1]
    dist = math.sqrt(dx*dx + dy*dy)
    
    # Rough classification
    if dist > 100:
        return "smash"
    elif dy > 50:  # Downward
        return "drop"
    elif dy < -50:  # Upward
        return "clear"
    else:
        return "drive"

def _detect_error_ending(rally_positions):
    """Detect if rally ended abruptly (error)"""
    if len(rally_positions) < 5:
        return True
    
    # Check if shuttle slowed dramatically at end (hit net/out)
    final_speeds = []
    for i in range(-3, 0):
        if abs(i) < len(rally_positions):
            dx = rally_positions[i][0] - rally_positions[i-1][0]
            dy = rally_positions[i][1] - rally_positions[i-1][1]
            speed = math.sqrt(dx*dx + dy*dy)
            final_speeds.append(speed)
    
    # Error if final speed drops below 30% of average
    if final_speeds:
        avg_speed = sum(final_speeds) / len(final_speeds)
        return final_speeds[-1] < avg_speed * 0.3
    
    return False

def _estimate_player_role(rally_positions):
    """Estimate player role (attacking/defensive) at rally end"""
    if len(rally_positions) < 3:
        return "neutral"
    
    # Check shuttle height trend
    final_y = rally_positions[-1][1]
    initial_y = rally_positions[0][1]
    
    # Lower Y = higher in frame = attacking
    if final_y < initial_y - 50:
        return "attacking"
    elif final_y > initial_y + 50:
        return "defensive"
    else:
        return "neutral"

def _compute_point_outcomes(rally_analyses):
    """Aggregate point outcomes across rallies"""
    
    outcomes_by_stroke = {}
    outcomes_by_zone = {}
    outcomes_by_role = {}
    
    for rally in rally_analyses:
        stroke = rally["final_stroke"]
        zone = rally["ending_zone"]
        role = rally["player_role"]
        won = rally["point_won"]
        
        # By stroke
        if stroke not in outcomes_by_stroke:
            outcomes_by_stroke[stroke] = {"won": 0, "lost": 0}
        outcomes_by_stroke[stroke]["won" if won else "lost"] += 1
        
        # By zone
        if zone not in outcomes_by_zone:
            outcomes_by_zone[zone] = {"won": 0, "lost": 0}
        outcomes_by_zone[zone]["won" if won else "lost"] += 1
        
        # By role
        if role not in outcomes_by_role:
            outcomes_by_role[role] = {"won": 0, "lost": 0}
        outcomes_by_role[role]["won" if won else "lost"] += 1
    
    return {
        "by_stroke": outcomes_by_stroke,
        "by_zone": outcomes_by_zone,
        "by_role": outcomes_by_role
    }

def _compute_efficiency_ratios(rally_analyses, basic_metrics):
    """Compute stroke efficiency and conversion ratios"""
    
    stroke_counts = basic_metrics.get("stroke_counts", {})
    
    # Smash-to-point conversion
    smash_rallies = [r for r in rally_analyses if r["final_stroke"] == "smash"]
    smash_wins = len([r for r in smash_rallies if r["point_won"]])
    smash_conversion = (smash_wins / len(smash_rallies) * 100) if smash_rallies else 0
    
    # Rally length to point
    length_outcomes = {"short": {"won": 0, "lost": 0}, 
                       "medium": {"won": 0, "lost": 0},
                       "long": {"won": 0, "lost": 0}}
    
    for rally in rally_analyses:
        bucket = rally["length_bucket"]
        won = rally["point_won"]
        length_outcomes[bucket]["won" if won else "lost"] += 1
    
    return {
        "smash_to_point_percent": round(smash_conversion, 1),
        "rally_length_outcomes": length_outcomes,
        "overall_win_rate": round(len([r for r in rally_analyses if r["point_won"]]) / len(rally_analyses) * 100, 1) if rally_analyses else 0
    }

def _compute_error_distribution(rally_analyses):
    """Analyze error patterns"""
    
    errors_by_zone = {}
    errors_by_stroke = {}
    
    error_rallies = [r for r in rally_analyses if r["is_error"]]
    
    for rally in error_rallies:
        zone = rally["ending_zone"]
        stroke = rally["final_stroke"]
        
        errors_by_zone[zone] = errors_by_zone.get(zone, 0) + 1
        errors_by_stroke[stroke] = errors_by_stroke.get(stroke, 0) + 1
    
    total_errors = len(error_rallies)
    total_rallies = len(rally_analyses)
    error_rate = (total_errors / total_rallies * 100) if total_rallies else 0
    
    return {
        "total_errors": total_errors,
        "error_rate_percent": round(error_rate, 1),
        "errors_by_zone": errors_by_zone,
        "errors_by_stroke": errors_by_stroke
    }