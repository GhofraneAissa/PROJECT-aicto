from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.notification import Notification
from app.models.user import User
from app.routers.admin import get_admin_user

router = APIRouter()


@router.get("/")
def get_notifications(db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    notifications = db.query(Notification).filter(
        Notification.user_id == admin.id
    ).order_by(Notification.created_at.desc()).limit(50).all()
    return [
        {
            "id": n.id,
            "type": n.type,
            "message": n.message,
            "related_project_id": n.related_project_id,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notifications
    ]


@router.get("/unread-count")
def get_unread_count(db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    count = db.query(Notification).filter(
        Notification.user_id == admin.id,
        Notification.is_read == 0
    ).count()
    return {"count": count}


@router.put("/{id}/read")
def mark_as_read(id: int, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    notification = db.query(Notification).filter(
        Notification.id == id,
        Notification.user_id == admin.id
    ).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.is_read = 1
    db.commit()
    return {"message": "Notification marked as read"}


@router.put("/read-all")
def mark_all_as_read(db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    db.query(Notification).filter(
        Notification.user_id == admin.id,
        Notification.is_read == 0
    ).update({"is_read": 1})
    db.commit()
    return {"message": "All notifications marked as read"}
