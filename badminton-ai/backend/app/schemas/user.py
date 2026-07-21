from __future__ import annotations

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    display_name: str
    is_active: bool


class UserUpdate(BaseModel):
    display_name: str | None = Field(None, min_length=1, max_length=120)
