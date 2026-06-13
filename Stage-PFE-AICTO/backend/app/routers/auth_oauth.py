import os
import secrets
import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.routers.users import create_access_token, hash_password
from app.schemas.user import determine_role_from_email
from datetime import datetime, timezone
from urllib.parse import urlencode

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

LINKEDIN_CLIENT_ID = os.getenv("LINKEDIN_CLIENT_ID", "")
LINKEDIN_CLIENT_SECRET = os.getenv("LINKEDIN_CLIENT_SECRET", "")
LINKEDIN_REDIRECT_URI = os.getenv("LINKEDIN_REDIRECT_URI", "http://localhost:8000/api/auth/linkedin/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3001")

_oauth_states = {}


@router.get("/linkedin/login")
def linkedin_login():
    state = secrets.token_urlsafe(32)
    _oauth_states[state] = True

    params = {
        "response_type": "code",
        "client_id": LINKEDIN_CLIENT_ID,
        "redirect_uri": LINKEDIN_REDIRECT_URI,
        "scope": "openid profile email",
        "state": state,
    }
    auth_url = f"https://www.linkedin.com/oauth/v2/authorization?{urlencode(params)}"
    return RedirectResponse(url=auth_url)


@router.get("/linkedin/callback")
def linkedin_callback(code: str, state: str, db: Session = Depends(get_db)):
    if state not in _oauth_states:
        raise HTTPException(status_code=400, detail="Invalid state parameter")
    del _oauth_states[state]

    token_resp = httpx.post(
        "https://www.linkedin.com/oauth/v2/accessToken",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "client_id": LINKEDIN_CLIENT_ID,
            "client_secret": LINKEDIN_CLIENT_SECRET,
            "redirect_uri": LINKEDIN_REDIRECT_URI,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    if token_resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to exchange authorization code")
    token_data = token_resp.json()
    access_token = token_data.get("access_token")

    userinfo_resp = httpx.get(
        "https://api.linkedin.com/v2/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    if userinfo_resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to fetch user info")
    profile = userinfo_resp.json()

    linkedin_email = profile.get("email")
    linkedin_name = profile.get("name", "")
    linkedin_picture = profile.get("picture", "")

    if not linkedin_email:
        raise HTTPException(status_code=400, detail="Email not provided by LinkedIn")

    user = db.query(User).filter(User.email == linkedin_email).first()

    if user:
        user.last_login = datetime.now(timezone.utc)
        db.commit()
    else:
        role = determine_role_from_email(linkedin_email)
        user = User(
            organization_name=linkedin_name or linkedin_email.split("@")[0],
            organization_type="NGO",
            email=linkedin_email,
            password_hash=hash_password(secrets.token_urlsafe(32)),
            logo=linkedin_picture or None,
            role=role,
            is_active=True,
            is_approved=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    jwt_token = create_access_token(data={"sub": str(user.id), "email": user.email})

    redirect_url = f"{FRONTEND_URL}/auth.html?token={jwt_token}&oauth=linkedin"
    return RedirectResponse(url=redirect_url)
