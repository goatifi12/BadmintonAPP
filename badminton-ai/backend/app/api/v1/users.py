from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, UserRepositoryDep
from app.schemas.user import UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
async def get_current_user_profile(current_user: CurrentUser) -> UserRead:
    return UserRead.model_validate(current_user)


@router.patch("/me", response_model=UserRead)
async def update_current_user_profile(
    payload: UserUpdate,
    current_user: CurrentUser,
    user_repo: UserRepositoryDep,
) -> UserRead:
    if payload.display_name is not None:
        current_user.display_name = payload.display_name
    await user_repo.commit()
    await user_repo.refresh(current_user)
    return UserRead.model_validate(current_user)
