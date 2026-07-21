from __future__ import annotations

import json
from typing import Any

import httpx

from app.core.config import get_settings

PROMPT_VERSION = "badminton-coach-v1"

SYSTEM_PROMPT = (
    "You are an elite badminton coach and sports data analyst. Analyze the structured "
    "computer-vision output (shot counts, shot quality, movement stats, weaknesses) and "
    "return compact JSON with exactly these keys: strengths (list of strings), "
    "weaknesses (list of strings), tactical_analysis (list of strings), "
    "training_recommendations (list of strings), summary (string). "
    "Return ONLY the JSON object, no markdown fences, no commentary."
)


class CoachingEngine:
    """Generates a natural-language coaching report from pipeline metrics.

    Uses OpenRouter's OpenAI-compatible chat completions endpoint so free-tier
    models can be used without an OpenAI account. If no API key is configured,
    the request fails, or the response can't be parsed, this falls back to a
    deterministic report built directly from the tactical weaknesses/tips the
    CV pipeline already computed — coaching output is never blocked by LLM
    availability.
    """

    def __init__(self, api_key: str | None = None, model: str | None = None, base_url: str | None = None, timeout: float = 20.0) -> None:
        settings = get_settings()
        self.api_key = api_key if api_key is not None else settings.openrouter_api_key
        self.model = model or settings.openrouter_model
        self.base_url = (base_url or settings.openrouter_base_url).rstrip("/")
        self.timeout = timeout
        self._site_url = settings.openrouter_site_url
        self._app_name = settings.openrouter_app_name

    def generate(self, metrics: dict[str, Any], tactical: dict[str, Any], model_info: dict[str, Any]) -> dict[str, Any]:
        payload = {"metrics": metrics, "tactical": tactical, "model": model_info}
        if not self.api_key:
            return self._fallback(payload, "OPENROUTER_API_KEY is not configured; using deterministic local coaching.")

        try:
            response = httpx.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": self._site_url,
                    "X-Title": self._app_name,
                },
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": json.dumps(payload, default=str)[:60000]},
                    ],
                    "temperature": 0.4,
                },
                timeout=self.timeout,
            )
            response.raise_for_status()
            data = response.json()
            text = data["choices"][0]["message"]["content"] or ""
            parsed = self._extract_json(text)
            used_model = data.get("model", self.model)
            return {
                "provider": "openrouter",
                "model": used_model,
                "prompt_version": PROMPT_VERSION,
                "report_json": parsed,
                "report_text": self._report_to_text(parsed) if parsed.get("summary") is None else text,
            }
        except Exception as exc:
            return self._fallback(payload, f"OpenRouter coaching failed: {exc}")

    def _fallback(self, payload: dict[str, Any], reason: str) -> dict[str, Any]:
        metrics = payload.get("metrics", {})
        tactical = payload.get("tactical", {})
        counts = metrics.get("stroke_counts", {})
        top_shot = max(counts, key=counts.get) if counts and any(counts.values()) else "unknown"
        report = {
            "strengths": [f"Most frequent shot pattern: {top_shot}.", "The replay and heatmaps provide a usable base for rally review."],
            "weaknesses": [w.get("message", str(w)) for w in tactical.get("weaknesses", [])[:3]],
            "tactical_analysis": ["Use the shot distribution with movement heatmaps to identify predictable recovery positions."],
            "training_recommendations": tactical.get("coaching_tips", [])[:4],
            "summary": f"Automated coaching fallback. {reason}",
        }
        return {
            "provider": "local",
            "model": "deterministic-fallback",
            "prompt_version": PROMPT_VERSION,
            "report_json": report,
            "report_text": self._report_to_text(report),
        }

    def _extract_json(self, text: str) -> dict[str, Any]:
        try:
            return json.loads(text)
        except Exception:
            start = text.find("{")
            end = text.rfind("}")
            if start >= 0 and end > start:
                try:
                    return json.loads(text[start : end + 1])
                except Exception:
                    pass
        return {"summary": text, "strengths": [], "weaknesses": [], "tactical_analysis": [], "training_recommendations": []}

    def _report_to_text(self, report: dict[str, Any]) -> str:
        lines = [report.get("summary", "Coaching report")]
        for key in ["strengths", "weaknesses", "tactical_analysis", "training_recommendations"]:
            values = report.get(key, [])
            if values:
                lines.append(f"{key.replace('_', ' ').title()}: " + "; ".join(values))
        return "\n".join(lines)
