import json
import os
from datetime import datetime

RESULTS_DIR = os.path.join(os.path.dirname(__file__), "analysis_results")
os.makedirs(RESULTS_DIR, exist_ok=True)

class AnalysisStorage:
    @staticmethod
    def save_result(analysis_id: str, metrics: dict, video_path: str):
        """Save analysis results for chat consumption"""
        result = {
            "id": analysis_id,
            "timestamp": datetime.now().isoformat(),
            "video_path": video_path,
            "metrics": metrics,
            "insights": AnalysisStorage._generate_insights(metrics)
        }
        
        filepath = os.path.join(RESULTS_DIR, f"{analysis_id}.json")
        with open(filepath, 'w') as f:
            json.dump(result, f, indent=2)
        
        # Also save as "latest.json" for easy chat access
        latest_path = os.path.join(RESULTS_DIR, "latest.json")
        with open(latest_path, 'w') as f:
            json.dump(result, f, indent=2)
        
        return filepath
    
    @staticmethod
    def _generate_insights(metrics: dict) -> dict:
        """Generate coaching insights from raw metrics"""
        consistency = metrics.get("consistency_percent", 0)
        smoothness = metrics.get("movement_smoothness", 0)
        avg_speed = metrics.get("avg_shuttle_speed_km_h", 0)
        max_speed = metrics.get("max_shuttle_speed_km_h", 0)
        variance = metrics.get("speed_variance", 0)
        
        insights = {
            "consistency_level": "excellent" if consistency > 90 else "good" if consistency > 70 else "needs_improvement",
            "shuttle_control": "excellent" if smoothness < 30 else "good" if smoothness < 60 else "needs_work",
            "power_analysis": "high_power" if max_speed > 300 else "moderate_power" if max_speed > 200 else "low_power",
            "speed_consistency": "consistent" if variance < 5000 else "variable" if variance < 15000 else "highly_variable",
            "overall_rating": AnalysisStorage._calculate_rating(metrics)
        }
        
        return insights
    
    @staticmethod
    def _calculate_rating(metrics: dict) -> str:
        """Calculate overall performance rating"""
        score = 0
        
        # Consistency (40 points max)
        consistency = metrics.get("consistency_percent", 0)
        score += min(consistency * 0.4, 40)
        
        # Speed (30 points max)
        avg_speed = metrics.get("avg_shuttle_speed_km_h", 0)
        score += min(avg_speed / 10, 30)
        
        # Control (30 points max)
        smoothness = metrics.get("movement_smoothness", 100)
        score += max(30 - (smoothness / 3), 0)
        
        if score >= 80:
            return "advanced"
        elif score >= 60:
            return "intermediate"
        elif score >= 40:
            return "beginner"
        else:
            return "needs_practice"
    
    @staticmethod
    def get_latest():
        """Get most recent analysis for chat"""
        latest_path = os.path.join(RESULTS_DIR, "latest.json")
        if os.path.exists(latest_path):
            with open(latest_path, 'r') as f:
                return json.load(f)
        return None