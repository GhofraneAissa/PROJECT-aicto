from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.country import Country
from app.schemas.user import (
    UserCreate, UserUpdate, UserResponse, UserLogin, LoginResponse,
    ForgotPasswordRequest, ResetPasswordRequest, determine_role_from_email
)
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import os
from uuid import uuid4
from app.services.email_service import send_reset_email, send_activation_email

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "super-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

router = APIRouter()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    auto_role = determine_role_from_email(user.email)
    activation_token = uuid4().hex

    db_user = User(
        organization_name=user.organization_name,
        organization_type=user.organization_type,
        email=user.email,
        password_hash=hash_password(user.password),
        phone=user.phone,
        website=user.website,
        country=user.country,
        city=user.city,
        address=user.address,
        sector=user.sector,
        description=user.description,
        logo=user.logo,
        role=auto_role,
        is_active=False,
        activation_token=activation_token,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    send_activation_email(db_user.email, db_user.organization_name, activation_token)

    return db_user


@router.get("/activate/{token}")
def activate_user(token: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.activation_token == token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired activation token")

    if user.is_active:
        return {"message": "Account is already active."}

    user.is_active = True
    user.activation_token = None
    db.commit()

    return {"message": "Account activated successfully. You can now sign in."}


@router.post("/login", response_model=LoginResponse)
def login_user(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Account not activated. Please check your email for the activation link."
        )

    user.last_login = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    return LoginResponse(access_token=access_token, token_type="bearer", user=user)


# @router.post("/forgot-password")
# def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
#     user = db.query(User).filter(User.email == request.email).first()

#     if user:
#         token = uuid4().hex
#         expiry = datetime.now(timezone.utc) + timedelta(minutes=15)
#         user.reset_token = token
#         user.reset_token_expiry = expiry
#         db.commit()
#         send_reset_email(user.email, user.organization_name, token)

#     return {"message": "If the email exists, a password reset link has been sent."}


@router.post("/reset-password/{token}")
def reset_password(token: str, request: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.reset_token == token).first()

    if not user or not user.reset_token_expiry or user.reset_token_expiry < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user.password_hash = hash_password(request.password)
    user.reset_token = None
    user.reset_token_expiry = None
    db.commit()

    return {"message": "Password has been reset successfully."}


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user_update: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = user_update.model_dump(exclude_unset=True)
    if "password" in update_data and update_data["password"]:
        update_data["password_hash"] = hash_password(update_data.pop("password"))

    update_data.pop("role", None)

    for key, value in update_data.items():
        setattr(user, key, value)

    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()


@router.get("/{user_id}/projects")
def get_user_projects(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    projects = (
        db.query(Project, Country.country)
        .join(Country, Country.id == Project.country_id, isouter=True)
        .filter(Project.user_id == user_id)
        .order_by(Project.created_at.desc())
        .all()
    )

    result = []
    for p, cname in projects:
        result.append({
            "id": p.id,
            "title": p.title,
            "sector": p.sector or "",
            "technology": p.technology or "",
            "country": cname or "",
            "description": (p.description or "")[:200],
            "status": p.status or "",
            "sdg_alignment": p.sdg_alignment or "",
            "year_of_implementation": p.year_of_implementation,
            "start_date": str(p.start_date) if p.start_date else None,
            "end_date": str(p.end_date) if p.end_date else None,
            "created_at": str(p.created_at) if p.created_at else None,
            "rejection_reason": p.rejection_reason,
            "moderated_at": str(p.moderated_at) if p.moderated_at else None,
        })

    return {"projects": result, "total": len(result)}


@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"[FORGOT] === START === Email: {request.email}")
    
    try:
        # 1. Find user
        logger.info("[FORGOT] Searching for user...")
        user = db.query(User).filter(User.email == request.email).first()
        
        if user:
            logger.info(f"[FORGOT] User found: {user.organization_name} (ID: {user.id})")
            
            # 2. Generate secure token
            logger.info("[FORGOT] Generating reset token...")
            token = uuid4().hex
            expiry = datetime.now(timezone.utc) + timedelta(minutes=15)
            
            # 3. Save to database
            logger.info("[FORGOT] Saving token to database...")
            user.reset_token = token
            user.reset_token_expiry = expiry
            db.commit()
            logger.info(f"[FORGOT] Token saved: {token[:8]}... (expires: {expiry})")
            
            # 4. Send email
            logger.info("[FORGOT] Sending reset email...")
            email_sent = send_reset_email(user.email, user.organization_name, token)
            
            if email_sent:
                logger.info("[FORGOT] Email sent successfully")
            else:
                logger.warning("[FORGOT] Email not sent - check SMTP configuration")
        else:
            logger.info("[FORGOT] No user found with that email")
        
        # Always return success for security
        logger.info("[FORGOT] === END (200 OK) ===")
        return {"message": "If the email exists, a password reset link has been sent."}
    
    except Exception as e:
        logger.error(f"[FORGOT] ❌ CRITICAL ERROR: {type(e).__name__}: {e}")
        import traceback
        logger.error(f"[FORGOT] Traceback: {traceback.format_exc()}")
        logger.info("[FORGOT] === END (ERROR) ===")
        raise HTTPException(status_code=500, detail="Internal server error. Check logs.")