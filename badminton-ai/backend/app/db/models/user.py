from __future__ import annotations

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)

    # Nullable so social-login users (Google, future) don't need a local password.
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    google_sub: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)

    def __repr__(self) -> str:  # pragma: no cover
        return f"User(id={self.id!r}, email={self.email!r})"
