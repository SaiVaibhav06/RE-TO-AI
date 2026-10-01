import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field, field_validator
from pwdlib import PasswordHash

from database import connect

router = APIRouter(prefix="/api/auth", tags=["auth"])
password_hasher = PasswordHash.recommended()
dummy_password_hash = password_hasher.hash("constant-time-login-check")
email_pattern = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
session_cookie = "reto_session"
oauth_state_cookie = "reto_oauth_state"
session_lifetime = 60 * 60 * 24 * 7


class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not email_pattern.fullmatch(normalized):
            raise ValueError("Enter a valid email address")
        return normalized


class Registration(Credentials):
    full_name: str = Field(min_length=1, max_length=100)

    @field_validator("full_name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Enter your name")
        return normalized


class ProfileUpdate(BaseModel):
    full_name: str = Field(min_length=1, max_length=100)

    @field_validator("full_name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Enter your name")
        return normalized


def frontend_url() -> str:
    return os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")


def auth_secret() -> str:
    secret = os.getenv("AUTH_SECRET")
    environment = os.getenv("APP_ENV", "development").lower()
    if not secret:
        if environment in {"production", "prod"}:
            raise RuntimeError("AUTH_SECRET must be configured in production")
        return "local-development-only-change-this-auth-secret"
    if len(secret) < 32:
        raise RuntimeError("AUTH_SECRET must contain at least 32 characters")
    return secret


def public_user(user) -> dict[str, str | int]:
    return {"id": user["id"], "email": user["email"], "full_name": user["full_name"]}


def user_by_id(user_id: int):
    with connect() as db:
        return db.execute(
            "SELECT id, email, full_name, password_hash FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()


def create_session(response: Response, user) -> None:
    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {
            "sub": str(user["id"]),
            "iat": now,
            "exp": now + timedelta(seconds=session_lifetime),
        },
        auth_secret(),
        algorithm="HS256",
    )
    response.set_cookie(
        session_cookie,
        token,
        max_age=session_lifetime,
        httponly=True,
        secure=os.getenv("APP_ENV", "development").lower() in {"production", "prod"},
        samesite="lax",
        path="/",
    )


def current_user(request: Request):
    token = request.cookies.get(session_cookie)
    if not token:
        raise HTTPException(status_code=401, detail="Sign in to continue")
    try:
        claims = jwt.decode(token, auth_secret(), algorithms=["HS256"])
        user_id = int(claims["sub"])
    except (jwt.PyJWTError, KeyError, TypeError, ValueError) as error:
        raise HTTPException(status_code=401, detail="Session expired. Please sign in again.") from error
    user = user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Account no longer exists")
    return user


def provider_configured(provider: str) -> bool:
    prefix = provider.upper()
    return bool(os.getenv(f"{prefix}_CLIENT_ID") and os.getenv(f"{prefix}_CLIENT_SECRET"))


def oauth_redirect_uri(provider: str) -> str:
    configured = os.getenv(f"{provider.upper()}_REDIRECT_URI")
    if configured:
        return configured
    return f"{frontend_url()}/api/auth/{provider}/callback"


def oauth_failure(provider: str, reason: str) -> RedirectResponse:
    response = RedirectResponse(
        f"{frontend_url()}/login?error={provider}_{reason}", status_code=303
    )
    response.delete_cookie(oauth_state_cookie, path="/")
    return response


def link_oauth_user(provider: str, subject: str, email: str, full_name: str):
    column = {"google": "google_subject", "github": "github_id"}[provider]
    with connect() as db:
        linked = db.execute(
            f"SELECT * FROM users WHERE {column} = ?", (subject,)
        ).fetchone()
        if linked:
            return linked

        existing = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            if existing[column] and existing[column] != subject:
                raise HTTPException(status_code=409, detail="This email is linked to another provider account")
            db.execute(
                f"UPDATE users SET {column} = ?, full_name = CASE WHEN full_name = '' THEN ? ELSE full_name END WHERE id = ?",
                (subject, full_name, existing["id"]),
            )
            return db.execute("SELECT * FROM users WHERE id = ?", (existing["id"],)).fetchone()

        cursor = db.execute(
            f"INSERT INTO users (email, full_name, {column}) VALUES (?, ?, ?)",
            (email, full_name, subject),
        )
        return db.execute("SELECT * FROM users WHERE id = ?", (cursor.lastrowid,)).fetchone()


@router.get("/providers")
def auth_providers() -> dict[str, bool]:
    return {"google": provider_configured("google"), "github": provider_configured("github")}


@router.post("/register")
def register(payload: Registration, response: Response) -> dict[str, dict[str, str | int]]:
    with connect() as db:
        existing = db.execute("SELECT id FROM users WHERE email = ?", (payload.email,)).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="An account with this email already exists")
        cursor = db.execute(
            "INSERT INTO users (email, full_name, password_hash) VALUES (?, ?, ?)",
            (payload.email, payload.full_name, password_hasher.hash(payload.password)),
        )
        user = db.execute(
            "SELECT id, email, full_name FROM users WHERE id = ?", (cursor.lastrowid,)
        ).fetchone()
    create_session(response, user)
    return {"user": public_user(user)}


@router.post("/login")
def login(payload: Credentials, response: Response) -> dict[str, dict[str, str | int]]:
    with connect() as db:
        user = db.execute("SELECT * FROM users WHERE email = ?", (payload.email,)).fetchone()
    password_hash = user["password_hash"] if user and user["password_hash"] else dummy_password_hash
    if not password_hasher.verify(payload.password, password_hash) or not user or not user["password_hash"]:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    create_session(response, user)
    return {"user": public_user(user)}


@router.get("/me")
def who_am_i(user=Depends(current_user)) -> dict[str, dict[str, str | int]]:
    return {"user": public_user(user)}


@router.put("/profile")
def update_profile(payload: ProfileUpdate, user=Depends(current_user)):
    with connect() as db:
        db.execute("UPDATE users SET full_name = ? WHERE id = ?", (payload.full_name, user["id"]))
    return {"user": {**public_user(user), "full_name": payload.full_name}}


@router.get("/session")
def session_status(request: Request) -> dict:
    try:
        user = current_user(request)
    except HTTPException:
        return {"authenticated": False, "user": None}
    return {"authenticated": True, "user": public_user(user)}


@router.post("/logout")
def logout(response: Response) -> dict[str, bool]:
    response.delete_cookie(session_cookie, httponly=True, samesite="lax", path="/")
    return {"ok": True}


@router.get("/google")
def google_login() -> RedirectResponse:
    if not provider_configured("google"):
        raise HTTPException(status_code=503, detail="Google sign-in is not configured")
    state = secrets.token_urlsafe(32)
    params = {
        "client_id": os.environ["GOOGLE_CLIENT_ID"],
        "redirect_uri": oauth_redirect_uri("google"),
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "prompt": "select_account",
    }
    response = RedirectResponse(
        f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}", status_code=302
    )
    response.set_cookie(oauth_state_cookie, state, max_age=600, httponly=True, samesite="lax", path="/")
    return response


@router.get("/github")
def github_login() -> RedirectResponse:
    if not provider_configured("github"):
        raise HTTPException(status_code=503, detail="GitHub sign-in is not configured")
    state = secrets.token_urlsafe(32)
    params = {
        "client_id": os.environ["GITHUB_CLIENT_ID"],
        "redirect_uri": oauth_redirect_uri("github"),
        "scope": "read:user user:email",
        "state": state,
    }
    response = RedirectResponse(
        f"https://github.com/login/oauth/authorize?{urlencode(params)}", status_code=302
    )
    response.set_cookie(oauth_state_cookie, state, max_age=600, httponly=True, samesite="lax", path="/")
    return response


async def exchange_oauth_code(provider: str, code: str) -> dict[str, str]:
    prefix = provider.upper()
    token_url = "https://oauth2.googleapis.com/token" if provider == "google" else "https://github.com/login/oauth/access_token"
    payload = {
        "client_id": os.environ[f"{prefix}_CLIENT_ID"],
        "client_secret": os.environ[f"{prefix}_CLIENT_SECRET"],
        "code": code,
        "redirect_uri": oauth_redirect_uri(provider),
        "grant_type": "authorization_code",
    }
    async with httpx.AsyncClient(timeout=12) as client:
        token_response = await client.post(token_url, data=payload, headers={"Accept": "application/json"})
        token_response.raise_for_status()
        access_token = token_response.json().get("access_token")
        if not access_token:
            raise ValueError("OAuth provider did not return an access token")
        headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}

        if provider == "google":
            profile_response = await client.get("https://openidconnect.googleapis.com/v1/userinfo", headers=headers)
            profile_response.raise_for_status()
            profile = profile_response.json()
            if not profile.get("email_verified"):
                raise ValueError("Google email is not verified")
            return {
                "subject": str(profile["sub"]),
                "email": profile["email"].strip().lower(),
                "full_name": profile.get("name", ""),
            }

        profile_response = await client.get("https://api.github.com/user", headers=headers)
        profile_response.raise_for_status()
        profile = profile_response.json()
        email = profile.get("email")
        if not email:
            emails_response = await client.get("https://api.github.com/user/emails", headers=headers)
            emails_response.raise_for_status()
            verified = [item for item in emails_response.json() if item.get("primary") and item.get("verified")]
            email = verified[0]["email"] if verified else None
        if not email:
            raise ValueError("GitHub did not provide a verified email address")
        return {
            "subject": str(profile["id"]),
            "email": email.strip().lower(),
            "full_name": profile.get("name") or profile.get("login", ""),
        }


async def finish_oauth(
    provider: str,
    request: Request,
    code: str | None,
    state: str | None,
    error: str | None,
):
    state_cookie = request.cookies.get(oauth_state_cookie)
    if error:
        return oauth_failure(provider, "cancelled")
    if not code or not state or not state_cookie or not secrets.compare_digest(state, state_cookie):
        return oauth_failure(provider, "invalid_state")
    try:
        profile = await exchange_oauth_code(provider, code)
        user = link_oauth_user(provider, profile["subject"], profile["email"], profile["full_name"])
    except (httpx.HTTPError, KeyError, ValueError, HTTPException):
        return oauth_failure(provider, "failed")
    response = RedirectResponse(f"{frontend_url()}/re-to-ai", status_code=303)
    create_session(response, user)
    response.delete_cookie(oauth_state_cookie, path="/")
    return response


@router.get("/google/callback")
async def google_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
):
    return await finish_oauth("google", request, code, state, error)


@router.get("/github/callback")
async def github_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
):
    return await finish_oauth("github", request, code, state, error)