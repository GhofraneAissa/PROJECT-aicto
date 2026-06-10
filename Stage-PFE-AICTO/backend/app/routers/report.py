import logging
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from datetime import datetime
from app.services.pdf_report_service import generate_pdf_report
from app.services.email_service import send_report_email
import os

logger = logging.getLogger(__name__)
router = APIRouter()

REPORT_RECIPIENT = os.getenv("REPORT_EMAIL", "aissaghofrane1@gmail.com")


@router.get("/report/generate")
def generate_report(year: int = Query(None, description="Annee du rapport (defaut: annee courante)")):
    """
    Generate the annual report PDF and return it for download.
    """
    try:
        if year is None:
            year = datetime.utcnow().year
        pdf_bytes = generate_pdf_report(year)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename=SARAI_Rapport_Annuel_{year}.pdf",
                "Content-Length": str(len(pdf_bytes))
            }
        )
    except Exception as e:
        logger.error(f"[REPORT] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/report/generate-and-send")
def generate_and_send_report(
    year: int = Query(None, description="Annee du rapport"),
    email: str = Query(None, description="Email du destinataire (defaut: admin)")
):
    """
    Generate the annual report as PDF and send it via email with PDF attachment.
    """
    try:
        if year is None:
            year = datetime.utcnow().year
        recipient = email or REPORT_RECIPIENT
        logger.info(f"[REPORT] Generating annual report PDF for {year} to send to {recipient}")

        pdf_bytes = generate_pdf_report(year)
        logger.info(f"[REPORT] PDF generated: {len(pdf_bytes)} bytes")

        sent = send_report_email(recipient, pdf_bytes, year)

        if sent:
            return {
                "success": True,
                "message": f"Rapport annuel {year} envoye avec succes a {recipient} (PDF: {len(pdf_bytes)} bytes)",
                "year": year,
                "recipient": recipient,
                "pdf_size_bytes": len(pdf_bytes)
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Echec de l'envoi du rapport a {recipient}. Verifiez la configuration SMTP."
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[REPORT] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
