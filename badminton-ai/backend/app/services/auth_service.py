from __future__ import annotations

from dataclasses import dataclass

from app.core.security import (
    TokenType,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.models.user import User
from app.repositories.user_repository import UserRepository


class AuthError(Exception):
    """Base class for auth failures the API layer should turn into 4xx responses."""


class EmailAlreadyRegisteredError(AuthError):
    pass


class InvalidCredentialsError(AuthError):
    pass


class InactiveUserError(AuthError):
    pass


@dataclass(frozen=True)
class TokenPair:
    access_token: str
    refresh_token: str


class AuthService:
    """Orchestrates registration, login, and token refresh. Depends only on the repository
    abstraction, so it is easy to unit test with a fake repository if needed.
    """

    def __init__(self, user_repository: UserRepository) -> None:
        self._users = user_repository

    async def register(self, *, email: str, password: str, display_name: str) -> tuple[User, TokenPair]:
        existing = await self._users.get_by_email(email)
        if existing is not None:
            raise EmailAlreadyRegisteredError(f"An account already exists for {email}")
        user = await self._users.create(email=email, display_name=display_name, hashed_password=hash_password(password))
        await self._users.commit()
        return user, self._issue_tokens(user)

    async def login(self, *, email: str, password: str) -> tuple[User, TokenPair]:
        user = await self._users.get_by_email(email)
        if user is None or not user.hashed_password or not verify_password(password, user.hashed_password):
            raise InvalidCredentialsError("Incorrect email or password")
        if not user.is_active:
            raise InactiveUserError("This account has been deactivated")
        return user, self._issue_tokens(user)

    async def refresh(self, *, refresh_token: str) -> TokenPair:
        from app.core.security import InvalidTokenError

        try:
            user_id = decode_token(refresh_token, expected_type=TokenType.REFRESH)
        except InvalidTokenError as exc:
            raise InvalidCredentialsError("Invalid or expired refresh token") from exc
        user = await self._users.get_by_id(user_id)
        if user is None or not user.is_active:
            raise InvalidCredentialsError("Account no longer available")
        return self._issue_tokens(user)

    async def get_current_user(self, *, access_token: str) -> User:
        from app.core.security import InvalidTokenError

        try:
            user_id = decode_token(access_token, expected_type=TokenType.ACCESS)
        except InvalidTokenError as exc:
            raise InvalidCredentialsError("Invalid or expired access token") from exc
        user = await self._users.get_by_id(user_id)
        if user is None or not user.is_active:
            raise InvalidCredentialsError("Account no longer available")
        return user

    def _issue_tokens(self, user: User) -> TokenPair:
        return TokenPair(access_token=create_access_token(user.id), refresh_token=create_refresh_token(user.id))
