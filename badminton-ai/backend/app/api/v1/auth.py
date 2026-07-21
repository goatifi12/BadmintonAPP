from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.api.deps import AuthServiceDep, CurrentUser
from app.schemas.auth import AuthResponse, LoginRequest, RefreshRequest, RegisterRequest, TokenPair
from app.schemas.user import UserRead
from app.services.auth_service import EmailAlreadyRegisteredError, InactiveUserError, InvalidCredentialsError

router = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(payload: RegisterRequest, auth_service: AuthServiceDep) -> AuthResponse:
    try:
        user, tokens = await auth_service.register(email=payload.email, password=payload.password, display_name=payload.display_name)
    except EmailAlreadyRegisteredError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return AuthResponse(user=UserRead.model_validate(user), tokens=TokenPair(access_token=tokens.access_token, refresh_token=tokens.refresh_token))


@router.post("/login", response_model=AuthResponse)
@limiter.limit("10/minute")
async def login(payload: LoginRequest, auth_service: AuthServiceDep) -> AuthResponse:
    try:
        user, tokens = await auth_service.login(email=payload.email, password=payload.password)
    except (InvalidCredentialsError, InactiveUserError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    return AuthResponse(user=UserRead.model_validate(user), tokens=TokenPair(access_token=tokens.access_token, refresh_token=tokens.refresh_token))


@router.post("/refresh", response_model=TokenPair)
async def refresh(payload: RefreshRequest, auth_service: AuthServiceDep) -> TokenPair:
    try:
        tokens = await auth_service.refresh(refresh_token=payload.refresh_token)
    except InvalidCredentialsError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    return TokenPair(access_token=tokens.access_token, refresh_token=tokens.refresh_token)


@router.get("/me", response_model=UserRead)
async def me(current_user: CurrentUser) -> UserRead:
    return UserRead.model_validate(current_user)
