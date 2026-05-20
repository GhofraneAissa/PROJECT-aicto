import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load .env from the backend directory
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3001")

logger.info(f"[EMAIL] SMTP_SERVER: {SMTP_SERVER}")
logger.info(f"[EMAIL] SMTP_PORT: {SMTP_PORT}")
logger.info(f"[EMAIL] SMTP_EMAIL: {SMTP_EMAIL}")
logger.info(f"[EMAIL] FRONTEND_URL: {FRONTEND_URL}")
logger.info(f"[EMAIL] SMTP_PASSWORD configured: {bool(SMTP_PASSWORD and SMTP_PASSWORD != 'ton-app-password-gmail')}")


def send_reset_email(recipient_email: str, organization_name: str, token: str) -> bool:
    """
    Send password reset email.
    Returns True if email was sent successfully, False otherwise.
    """
    # Check if SMTP is properly configured
    if not all([SMTP_EMAIL, SMTP_PASSWORD]):
        logger.error("[EMAIL] ❌ SMTP credentials not configured!")
        logger.info(f"[EMAIL] Reset link (dev mode): {FRONTEND_URL}/reset-password.html?token={token}")
        return False
    
    # Check if using placeholder values
    if SMTP_EMAIL == "ton.email@gmail.com" or SMTP_PASSWORD == "ton-app-password-gmail":
        logger.error("[EMAIL] ❌ Using placeholder SMTP credentials! Please update .env file with real credentials.")
        logger.info(f"[EMAIL] Reset link (dev mode): {FRONTEND_URL}/reset-password.html?token={token}")
        return False

    reset_link = f"{FRONTEND_URL}/reset-password.html?token={token}"
    
    logger.info(f"[EMAIL] Sending reset email to {recipient_email}")
    logger.info(f"[EMAIL] Reset link: {reset_link}")

    html_body = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        .container {{ max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Arial, sans-serif; }}
        .header {{ background: linear-gradient(135deg, #2563EB, #1D4ED8); color: white; padding: 30px 20px; text-align: center; }}
        .header h1 {{ margin: 0; font-size: 24px; }}
        .content {{ padding: 40px 30px; background: #ffffff; }}
        .button {{ display: inline-block; padding: 14px 32px; background: #2563EB; color: white !important; 
                   text-decoration: none; border-radius: 8px; margin: 25px 0; font-weight: 600; }}
        .button:hover {{ background: #1D4ED8; }}
        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }}
        .fallback {{ margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 6px; font-size: 13px; word-break: break-all; }}
    </style>
</head>
<body style="margin: 0; padding: 20px; background: #f3f4f6;">
    <div class="container">
        <div class="header">
            <h1>🔐 Regional AI Repository</h1>
        </div>
        <div class="content">
            <h2 style="margin-top: 0;">Hello {organization_name},</h2>
            <p>We received a request to reset your password. Click the button below to set a new password:</p>
            <a href="{reset_link}" class="button">Reset Password</a>
            <p><strong>This link expires in 15 minutes.</strong></p>
            <p>If you didn't request this, you can safely ignore this email.</p>
            <div class="fallback">
                <strong>Can't click the button?</strong> Copy and paste this link:<br>
                {reset_link}
            </div>
            <div class="footer">
                © 2026 Regional AI Repository Platform<br>
                This is an automated email, please do not reply.
            </div>
        </div>
    </div>
</body>
</html>"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Reset Your Password - Regional AI Repository"
    msg["From"] = f"Regional AI Repository <{SMTP_EMAIL}>"
    msg["To"] = recipient_email
    msg.attach(MIMEText(html_body, "html"))

    try:
        logger.info(f"[EMAIL] Connecting to SMTP server {SMTP_SERVER}:{SMTP_PORT}")
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10) as server:
            server.set_debuglevel(0)
            server.starttls()
            logger.info(f"[EMAIL] Logging in as {SMTP_EMAIL}")
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            logger.info(f"[EMAIL] Sending email...")
            server.sendmail(SMTP_EMAIL, recipient_email, msg.as_string())
        logger.info(f"[EMAIL] ✅ Reset email sent successfully to {recipient_email}")
        return True
    except smtplib.SMTPAuthenticationError:
        logger.error("[EMAIL] ❌ SMTP Authentication failed! Check email/password.")
        return False
    except smtplib.SMTPException as e:
        logger.error(f"[EMAIL] ❌ SMTP error: {e}")
        return False
    except Exception as e:
        logger.error(f"[EMAIL] ❌ Failed to send email: {type(e).__name__}: {e}")
        return False


def send_activation_email(recipient_email: str, organization_name: str, token: str) -> bool:
    """
    Send account activation email.
    Returns True if email was sent successfully, False otherwise.
    """
    if not all([SMTP_EMAIL, SMTP_PASSWORD]):
        logger.error("[EMAIL] ❌ SMTP credentials not configured!")
        logger.info(f"[EMAIL] Activation link (dev mode): {FRONTEND_URL}/activation.html?token={token}")
        return False

    if SMTP_EMAIL == "ton.email@gmail.com" or SMTP_PASSWORD == "ton-app-password-gmail":
        logger.error("[EMAIL] ❌ Using placeholder SMTP credentials! Please update .env file with real credentials.")
        logger.info(f"[EMAIL] Activation link (dev mode): {FRONTEND_URL}/activation.html?token={token}")
        return False

    activation_link = f"{FRONTEND_URL}/activation.html?token={token}"

    logger.info(f"[EMAIL] Sending activation email to {recipient_email}")
    logger.info(f"[EMAIL] Activation link: {activation_link}")

    html_body = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        .container {{ max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Arial, sans-serif; }}
        .header {{ background: linear-gradient(135deg, #059669, #047857); color: white; padding: 30px 20px; text-align: center; }}
        .header h1 {{ margin: 0; font-size: 24px; }}
        .content {{ padding: 40px 30px; background: #ffffff; }}
        .button {{ display: inline-block; padding: 14px 32px; background: #059669; color: white !important;
                   text-decoration: none; border-radius: 8px; margin: 25px 0; font-weight: 600; }}
        .button:hover {{ background: #047857; }}
        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }}
        .fallback {{ margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 6px; font-size: 13px; word-break: break-all; }}
    </style>
</head>
<body style="margin: 0; padding: 20px; background: #f3f4f6;">
    <div class="container">
        <div class="header">
            <h1>Regional AI Repository</h1>
        </div>
        <div class="content">
            <h2 style="margin-top: 0;">Welcome {organization_name}!</h2>
            <p>Thank you for registering. Please activate your account by clicking the button below:</p>
            <a href="{activation_link}" class="button">Activate Account</a>
            <p><strong>This link expires in 24 hours.</strong></p>
            <p>If you didn't create this account, you can safely ignore this email.</p>
            <div class="fallback">
                <strong>Can't click the button?</strong> Copy and paste this link:<br>
                {activation_link}
            </div>
            <div class="footer">
                &copy; 2026 Regional AI Repository Platform<br>
                This is an automated email, please do not reply.
            </div>
        </div>
    </div>
</body>
</html>"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Activate Your Account - Regional AI Repository"
    msg["From"] = f"Regional AI Repository <{SMTP_EMAIL}>"
    msg["To"] = recipient_email
    msg.attach(MIMEText(html_body, "html"))

    try:
        logger.info(f"[EMAIL] Connecting to SMTP server {SMTP_SERVER}:{SMTP_PORT}")
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10) as server:
            server.set_debuglevel(0)
            server.starttls()
            logger.info(f"[EMAIL] Logging in as {SMTP_EMAIL}")
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            logger.info(f"[EMAIL] Sending activation email...")
            server.sendmail(SMTP_EMAIL, recipient_email, msg.as_string())
        logger.info(f"[EMAIL] ✅ Activation email sent successfully to {recipient_email}")
        return True
    except smtplib.SMTPAuthenticationError:
        logger.error("[EMAIL] ❌ SMTP Authentication failed! Check email/password.")
        return False
    except smtplib.SMTPException as e:
        logger.error(f"[EMAIL] ❌ SMTP error: {e}")
        return False
    except Exception as e:
        logger.error(f"[EMAIL] ❌ Failed to send email: {type(e).__name__}: {e}")
        return False


def send_contact_email(name: str, email: str, subject: str, message: str) -> bool:
    if not all([SMTP_EMAIL, SMTP_PASSWORD]):
        logger.error("[EMAIL] ❌ SMTP credentials not configured!")
        return False

    if SMTP_EMAIL == "ton.email@gmail.com" or SMTP_PASSWORD == "ton-app-password-gmail":
        logger.error("[EMAIL] ❌ Using placeholder SMTP credentials!")
        return False

    html_body = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        .container {{ max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Arial, sans-serif; }}
        .header {{ background: linear-gradient(135deg, #2563EB, #1D4ED8); color: white; padding: 30px 20px; text-align: center; }}
        .header h1 {{ margin: 0; font-size: 24px; }}
        .content {{ padding: 40px 30px; background: #ffffff; }}
        .field {{ margin-bottom: 20px; }}
        .field-label {{ font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }}
        .field-value {{ font-size: 16px; color: #111827; margin-top: 4px; padding: 12px 16px; background: #f9fafb; border-radius: 8px; }}
        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }}
    </style>
</head>
<body style="margin: 0; padding: 20px; background: #f3f4f6;">
    <div class="container">
        <div class="header">
            <h1>📬 New Contact Message</h1>
        </div>
        <div class="content">
            <div class="field">
                <div class="field-label">Name</div>
                <div class="field-value">{name}</div>
            </div>
            <div class="field">
                <div class="field-label">Email</div>
                <div class="field-value">{email}</div>
            </div>
            <div class="field">
                <div class="field-label">Subject</div>
                <div class="field-value">{subject}</div>
            </div>
            <div class="field">
                <div class="field-label">Message</div>
                <div class="field-value" style="white-space: pre-wrap;">{message}</div>
            </div>
            <div class="footer">
                &copy; 2026 Regional AI Repository Platform<br>
                Sent from the Contact Us form
            </div>
        </div>
    </div>
</body>
</html>"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Contact Form: {subject}"
    msg["From"] = f"Regional AI Repository <{SMTP_EMAIL}>"
    msg["To"] = SMTP_EMAIL
    msg["Reply-To"] = email
    msg.attach(MIMEText(html_body, "html"))

    try:
        logger.info(f"[EMAIL] Sending contact email from {email} about: {subject}")
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, SMTP_EMAIL, msg.as_string())
        logger.info(f"[EMAIL] ✅ Contact email sent successfully")
        return True
    except Exception as e:
        logger.error(f"[EMAIL] ❌ Failed to send contact email: {type(e).__name__}: {e}")
        return False
