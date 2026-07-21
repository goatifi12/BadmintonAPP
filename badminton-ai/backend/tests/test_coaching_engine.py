from __future__ import annotations

import json

import httpx

from app.services.coaching_engine import CoachingEngine


def _metrics_tactical_model():
    metrics = {"avg_shuttle_speed_km_h": 150, "stroke_counts": {"smash": 5, "clear": 3}}
    tactical = {"weaknesses": [{"message": "Late recovery after lifts."}], "coaching_tips": ["Drill recovery footwork."]}
    model = {"analysis_confidence": "medium"}
    return metrics, tactical, model


def _patch_httpx_post(monkeypatch, handler) -> None:
    def fake_post(url, **kwargs):
        with httpx.Client(transport=httpx.MockTransport(handler)) as client:
            return client.post(url, **kwargs)

    monkeypatch.setattr("app.services.coaching_engine.httpx.post", fake_post)


def test_generate_falls_back_when_no_api_key():
    engine = CoachingEngine(api_key=None)
    metrics, tactical, model = _metrics_tactical_model()

    report = engine.generate(metrics, tactical, model)

    assert report["provider"] == "local"
    assert "Late recovery after lifts." in report["report_text"]


def test_generate_uses_openrouter_response_on_success(monkeypatch):
    engine = CoachingEngine(api_key="test-key", model="test-model")
    metrics, tactical, model = _metrics_tactical_model()

    payload = {
        "strengths": ["Consistent smash pace."],
        "weaknesses": ["Recovery is slow after lifts."],
        "tactical_analysis": ["Opponent targets the back corners."],
        "training_recommendations": ["Run recovery-footwork drills 3x per week."],
        "summary": "Solid attacking game, work on recovery.",
    }

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["authorization"] == "Bearer test-key"
        body = json.loads(request.content)
        assert body["model"] == "test-model"
        return httpx.Response(200, json={"model": "test-model", "choices": [{"message": {"content": json.dumps(payload)}}]})

    _patch_httpx_post(monkeypatch, handler)

    report = engine.generate(metrics, tactical, model)

    assert report["provider"] == "openrouter"
    assert report["model"] == "test-model"
    assert report["report_json"]["summary"] == "Solid attacking game, work on recovery."
    assert report["report_json"]["training_recommendations"] == ["Run recovery-footwork drills 3x per week."]


def test_generate_falls_back_on_http_error(monkeypatch):
    engine = CoachingEngine(api_key="test-key", model="test-model")
    metrics, tactical, model = _metrics_tactical_model()

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, json={"error": "server exploded"})

    _patch_httpx_post(monkeypatch, handler)

    report = engine.generate(metrics, tactical, model)

    assert report["provider"] == "local"
    assert "OpenRouter coaching failed" in report["report_text"]


def test_generate_falls_back_when_response_is_not_json(monkeypatch):
    engine = CoachingEngine(api_key="test-key", model="test-model")
    metrics, tactical, model = _metrics_tactical_model()

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, content=b"not json at all")

    _patch_httpx_post(monkeypatch, handler)

    report = engine.generate(metrics, tactical, model)

    assert report["provider"] == "local"


def test_generate_extracts_json_embedded_in_prose(monkeypatch):
    engine = CoachingEngine(api_key="test-key", model="test-model")
    metrics, tactical, model = _metrics_tactical_model()
    payload = {"strengths": [], "weaknesses": [], "tactical_analysis": [], "training_recommendations": [], "summary": "ok"}

    def handler(request: httpx.Request) -> httpx.Response:
        content = f"Here is the analysis:\n{json.dumps(payload)}\nHope that helps!"
        return httpx.Response(200, json={"model": "test-model", "choices": [{"message": {"content": content}}]})

    _patch_httpx_post(monkeypatch, handler)

    report = engine.generate(metrics, tactical, model)

    assert report["provider"] == "openrouter"
    assert report["report_json"]["summary"] == "ok"
