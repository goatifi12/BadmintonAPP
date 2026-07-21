from __future__ import annotations

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def _register_and_get_token(client: AsyncClient, email: str) -> str:
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "supersecret1", "display_name": "Jobs User"},
    )
    return response.json()["tokens"]["access_token"]


async def test_create_job_requires_auth(client: AsyncClient) -> None:
    response = await client.post("/api/v1/jobs", files={"video": ("clip.mp4", b"fake-bytes", "video/mp4")})
    assert response.status_code in (401, 403)


async def test_create_job_rejects_non_video_content_type(client: AsyncClient) -> None:
    token = await _register_and_get_token(client, "notvideo@example.com")

    response = await client.post(
        "/api/v1/jobs",
        headers={"Authorization": f"Bearer {token}"},
        files={"video": ("clip.txt", b"not a video", "text/plain")},
    )

    assert response.status_code == 415


async def test_create_job_runs_cv_pipeline_to_completion(client: AsyncClient) -> None:
    token = await _register_and_get_token(client, "uploader@example.com")

    response = await client.post(
        "/api/v1/jobs",
        headers={"Authorization": f"Bearer {token}"},
        files={"video": ("clip.mp4", b"fake-video-bytes", "video/mp4")},
        data={"mode": "singles"},
    )

    assert response.status_code == 201
    body = response.json()
    # Celery is eager in tests, so by the time the request returns, the real
    # CV pipeline has already run through every stage — even on an
    # undecodable upload like this fake byte string, it degrades gracefully
    # (see test_pipeline_integration.py) rather than crashing the job.
    assert body["status"] == "done"
    assert body["stage"] == "done"
    assert body["progress"] == 100
    assert "stroke_counts" in body["result_summary"]
    assert "tactical" in body["result_summary"]
    assert "model" in body["result_summary"]
    assert body["artifacts"]["replay"]
    assert body["artifacts"]["annotated_video"]
    assert body["original_filename"] == "clip.mp4"
    assert body["mode"] == "singles"


async def test_get_job_status_by_id(client: AsyncClient) -> None:
    token = await _register_and_get_token(client, "status@example.com")
    create_response = await client.post(
        "/api/v1/jobs",
        headers={"Authorization": f"Bearer {token}"},
        files={"video": ("clip.mp4", b"fake-video-bytes", "video/mp4")},
    )
    job_id = create_response.json()["id"]

    response = await client.get(f"/api/v1/jobs/{job_id}", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json()["id"] == job_id


async def test_get_job_returns_404_for_unknown_id(client: AsyncClient) -> None:
    token = await _register_and_get_token(client, "unknown@example.com")

    response = await client.get("/api/v1/jobs/does-not-exist", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 404


async def test_get_job_returns_403_for_another_users_job(client: AsyncClient) -> None:
    owner_token = await _register_and_get_token(client, "owner@example.com")
    create_response = await client.post(
        "/api/v1/jobs",
        headers={"Authorization": f"Bearer {owner_token}"},
        files={"video": ("clip.mp4", b"fake-video-bytes", "video/mp4")},
    )
    job_id = create_response.json()["id"]

    intruder_token = await _register_and_get_token(client, "intruder@example.com")
    response = await client.get(f"/api/v1/jobs/{job_id}", headers={"Authorization": f"Bearer {intruder_token}"})

    assert response.status_code == 403


async def test_list_jobs_returns_only_own_jobs(client: AsyncClient) -> None:
    token_a = await _register_and_get_token(client, "lista@example.com")
    token_b = await _register_and_get_token(client, "listb@example.com")

    await client.post(
        "/api/v1/jobs", headers={"Authorization": f"Bearer {token_a}"}, files={"video": ("a.mp4", b"bytes-a", "video/mp4")}
    )
    await client.post(
        "/api/v1/jobs", headers={"Authorization": f"Bearer {token_b}"}, files={"video": ("b.mp4", b"bytes-b", "video/mp4")}
    )

    response = await client.get("/api/v1/jobs", headers={"Authorization": f"Bearer {token_a}"})

    assert response.status_code == 200
    jobs = response.json()
    assert len(jobs) == 1
    assert jobs[0]["original_filename"] == "a.mp4"


async def test_get_job_replay_returns_json_artifact(client: AsyncClient) -> None:
    token = await _register_and_get_token(client, "replay@example.com")
    create_response = await client.post(
        "/api/v1/jobs", headers={"Authorization": f"Bearer {token}"}, files={"video": ("clip.mp4", b"bytes", "video/mp4")}
    )
    job_id = create_response.json()["id"]

    response = await client.get(f"/api/v1/jobs/{job_id}/replay", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    replay = response.json()
    assert replay["version"] == "1.0"
    assert "frames" in replay


async def test_get_job_annotated_video_returns_file(client: AsyncClient) -> None:
    token = await _register_and_get_token(client, "video@example.com")
    create_response = await client.post(
        "/api/v1/jobs", headers={"Authorization": f"Bearer {token}"}, files={"video": ("clip.mp4", b"bytes", "video/mp4")}
    )
    job_id = create_response.json()["id"]

    response = await client.get(f"/api/v1/jobs/{job_id}/video", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.headers["content-type"] == "video/mp4"


async def test_get_job_heatmap_404_for_unknown_name(client: AsyncClient) -> None:
    token = await _register_and_get_token(client, "heatmap@example.com")
    create_response = await client.post(
        "/api/v1/jobs", headers={"Authorization": f"Bearer {token}"}, files={"video": ("clip.mp4", b"bytes", "video/mp4")}
    )
    job_id = create_response.json()["id"]

    response = await client.get(f"/api/v1/jobs/{job_id}/heatmaps/does-not-exist", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 404


async def test_get_job_heatmap_returns_known_heatmap(client: AsyncClient) -> None:
    token = await _register_and_get_token(client, "heatmap2@example.com")
    create_response = await client.post(
        "/api/v1/jobs", headers={"Authorization": f"Bearer {token}"}, files={"video": ("clip.mp4", b"bytes", "video/mp4")}
    )
    job_id = create_response.json()["id"]
    heatmap_names = list(create_response.json()["artifacts"]["heatmaps"].keys())
    assert heatmap_names, "pipeline should always produce at least the default player heatmaps"

    response = await client.get(f"/api/v1/jobs/{job_id}/heatmaps/{heatmap_names[0]}", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"


async def test_get_job_shots_returns_list_scoped_to_job(client: AsyncClient) -> None:
    token = await _register_and_get_token(client, "shots@example.com")
    create_response = await client.post(
        "/api/v1/jobs", headers={"Authorization": f"Bearer {token}"}, files={"video": ("clip.mp4", b"bytes", "video/mp4")}
    )
    job_id = create_response.json()["id"]

    response = await client.get(f"/api/v1/jobs/{job_id}/shots", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert isinstance(response.json(), list)


async def test_get_job_shots_requires_ownership(client: AsyncClient) -> None:
    owner_token = await _register_and_get_token(client, "shotsowner@example.com")
    create_response = await client.post(
        "/api/v1/jobs", headers={"Authorization": f"Bearer {owner_token}"}, files={"video": ("clip.mp4", b"bytes", "video/mp4")}
    )
    job_id = create_response.json()["id"]

    intruder_token = await _register_and_get_token(client, "shotsintruder@example.com")
    response = await client.get(f"/api/v1/jobs/{job_id}/shots", headers={"Authorization": f"Bearer {intruder_token}"})

    assert response.status_code == 403


async def test_get_job_player_tracks_returns_list(client: AsyncClient) -> None:
    token = await _register_and_get_token(client, "tracks@example.com")
    create_response = await client.post(
        "/api/v1/jobs", headers={"Authorization": f"Bearer {token}"}, files={"video": ("clip.mp4", b"bytes", "video/mp4")}
    )
    job_id = create_response.json()["id"]

    response = await client.get(f"/api/v1/jobs/{job_id}/player-tracks", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert isinstance(response.json(), list)


async def test_coaching_defaults_to_local_provider_without_api_key(client: AsyncClient, monkeypatch) -> None:
    # Ensures the test environment (no OPENROUTER_API_KEY) exercises the
    # deterministic fallback rather than attempting a real network call.
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    token = await _register_and_get_token(client, "coaching@example.com")
    create_response = await client.post(
        "/api/v1/jobs", headers={"Authorization": f"Bearer {token}"}, files={"video": ("clip.mp4", b"bytes", "video/mp4")}
    )
    job_id = create_response.json()["id"]

    response = await client.post(f"/api/v1/jobs/{job_id}/coaching", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    body = response.json()
    assert body["provider"] == "local"
    assert body["report_text"]


async def test_coaching_requires_ownership(client: AsyncClient) -> None:
    owner_token = await _register_and_get_token(client, "coachowner@example.com")
    create_response = await client.post(
        "/api/v1/jobs", headers={"Authorization": f"Bearer {owner_token}"}, files={"video": ("clip.mp4", b"bytes", "video/mp4")}
    )
    job_id = create_response.json()["id"]

    intruder_token = await _register_and_get_token(client, "coachintruder@example.com")
    response = await client.post(f"/api/v1/jobs/{job_id}/coaching", headers={"Authorization": f"Bearer {intruder_token}"})

    assert response.status_code == 403
