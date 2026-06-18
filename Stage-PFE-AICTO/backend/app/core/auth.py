from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from app.database import get_db
from app.models.user import User
from app.core.config import SECRET_KEY, ALGORITHM


def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            raise HTTPException(status_code=401, detail="Invalid authorization header")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_admin_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    user = get_current_user(authorization=authorization, db=db)
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied: Admin only")
    return user
