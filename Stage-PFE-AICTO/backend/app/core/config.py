import os
import logging

logger = logging.getLogger(__name__)

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "")
if not SECRET_KEY or SECRET_KEY in ("super-secret-key-change-in-production", "change-this-to-a-secure-random-string"):
    logger.warning("[SECURITY] JWT_SECRET_KEY is not set or using a default value! Set it in .env for production.")
    SECRET_KEY = SECRET_KEY or "insecure-dev-key-change-me"

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 365  # 365 days
