from __future__ import annotations

from datetime import datetime, timedelta, timezone
from enum import StrEnum
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class TokenType(StrEnum):
    ACCESS = "access"
    REFRESH = "refresh"


def hash_password(plain_password: str) -> str:
    return _pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return _pwd_context.verify(plain_password, hashed_password)


def create_token(subject: str, token_type: TokenType, expires_delta: timedelta | None = None) -> str:
    settings = get_settings()
    if expires_delta is None:
        minutes = settings.access_token_expire_minutes if token_type == TokenType.ACCESS else settings.refresh_token_expire_minutes
        expires_delta = timedelta(minutes=minutes)
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {"sub": subject, "type": token_type.value, "iat": now, "exp": now + expires_delta}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(subject: str) -> str:
    return create_token(subject, TokenType.ACCESS)


def create_refresh_token(subject: str) -> str:
    return create_token(subject, TokenType.REFRESH)


class InvalidTokenError(Exception):
    pass


def decode_token(token: str, expected_type: TokenType = TokenType.ACCESS) -> str:
    """Decode a JWT and return the subject (user id). Raises InvalidTokenError on any failure."""
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise InvalidTokenError(str(exc)) from exc
    if payload.get("type") != expected_type.value:
        raise InvalidTokenError("Unexpected token type")
    subject = payload.get("sub")
    if not subject:
        raise InvalidTokenError("Token missing subject")
    return subject
