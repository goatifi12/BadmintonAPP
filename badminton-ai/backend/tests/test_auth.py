from __future__ import annotations

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_register_returns_user_and_tokens(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": "player@example.com", "password": "supersecret1", "display_name": "Club Player"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["user"]["email"] == "player@example.com"
    assert body["user"]["display_name"] == "Club Player"
    assert body["tokens"]["access_token"]
    assert body["tokens"]["refresh_token"]


async def test_register_rejects_duplicate_email(client: AsyncClient) -> None:
    payload = {"email": "dupe@example.com", "password": "supersecret1", "display_name": "Someone"}
    first = await client.post("/api/v1/auth/register", json=payload)
    second = await client.post("/api/v1/auth/register", json=payload)

    assert first.status_code == 201
    assert second.status_code == 409


async def test_login_with_correct_credentials_succeeds(client: AsyncClient) -> None:
    await client.post(
        "/api/v1/auth/register",
        json={"email": "login@example.com", "password": "correcthorse", "display_name": "Login User"},
    )

    response = await client.post("/api/v1/auth/login", json={"email": "login@example.com", "password": "correcthorse"})

    assert response.status_code == 200
    assert response.json()["tokens"]["access_token"]


async def test_login_with_wrong_password_is_rejected(client: AsyncClient) -> None:
    await client.post(
        "/api/v1/auth/register",
        json={"email": "wrongpw@example.com", "password": "correcthorse", "display_name": "User"},
    )

    response = await client.post("/api/v1/auth/login", json={"email": "wrongpw@example.com", "password": "nope-nope-nope"})

    assert response.status_code == 401


async def test_me_requires_bearer_token(client: AsyncClient) -> None:
    response = await client.get("/api/v1/auth/me")
    assert response.status_code in (401, 403)


async def test_me_returns_current_user_with_valid_token(client: AsyncClient) -> None:
    register = await client.post(
        "/api/v1/auth/register",
        json={"email": "me@example.com", "password": "correcthorse", "display_name": "Me User"},
    )
    access_token = register.json()["tokens"]["access_token"]

    response = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access_token}"})

    assert response.status_code == 200
    assert response.json()["email"] == "me@example.com"


async def test_refresh_token_issues_new_access_token(client: AsyncClient) -> None:
    register = await client.post(
        "/api/v1/auth/register",
        json={"email": "refresh@example.com", "password": "correcthorse", "display_name": "Refresh User"},
    )
    refresh_token = register.json()["tokens"]["refresh_token"]

    response = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})

    assert response.status_code == 200
    assert response.json()["access_token"]


async def test_access_token_cannot_be_used_as_refresh_token(client: AsyncClient) -> None:
    register = await client.post(
        "/api/v1/auth/register",
        json={"email": "swap@example.com", "password": "correcthorse", "display_name": "Swap User"},
    )
    access_token = register.json()["tokens"]["access_token"]

    response = await client.post("/api/v1/auth/refresh", json={"refresh_token": access_token})

    assert response.status_code == 401


async def test_health_check(client: AsyncClient) -> None:
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
