from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.user import User


class UserRepository:
    """Pure data access for the `users` table. No business rules live here."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, user_id: str) -> User | None:
        return await self.session.get(User, user_id)

    async def get_by_email(self, email: str) -> User | None:
        result = await self.session.execute(select(User).where(User.email == email.lower()))
        return result.scalar_one_or_none()

    async def create(self, *, email: str, display_name: str, hashed_password: str | None) -> User:
        user = User(email=email.lower(), display_name=display_name, hashed_password=hashed_password)
        self.session.add(user)
        await self.session.flush()
        return user

    async def commit(self) -> None:
        await self.session.commit()
