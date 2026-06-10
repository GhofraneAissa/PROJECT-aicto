from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from app.services.email_service import send_contact_email

router = APIRouter()

class ContactRequest(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str

@router.post("/contact")
def contact_us(request: ContactRequest):
    if not request.name.strip() or not request.subject.strip() or not request.message.strip():
        raise HTTPException(status_code=422, detail="All fields are required")

    sent = send_contact_email(request.name, request.email, request.subject, request.message)

    if not sent:
        raise HTTPException(status_code=500, detail="Failed to send message. Please try again later.")

    return {"message": "Your message has been sent successfully. We will get back to you soon."}
