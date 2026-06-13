import os
import json
import re
import logging
from openai import OpenAI

logger = logging.getLogger(__name__)

EXTRACTION_PROMPT = """Extract structured project info from this LinkedIn post for an AI project stocktaking platform.

## TITLE - CRITICAL RULES
Generate a clean, short, professional project title (3-12 words). NEVER include hashtags (#anything). NEVER use raw post text. NEVER copy hashtags, social media handles, or pipe-separated keywords.

Good titles: "AI-Powered Handwritten Document Analysis for Healthcare", "Airbnb Data Analytics Dashboard", "Automated Medical Records OCR System"
Bad titles: "#ai #machinelearning #healthtech | Aissa Ghofrane", "Thrilled to share that we've just completed", "#dataanalytics #powerbi"

## SECTOR (domain of application)
These are NOT sectors: Power BI, SQL, Tableau, Data Analytics, Data Science, Data Warehouse, Business Intelligence, ETL, Reporting, Dashboard, Data Visualization. Those go in TECHNOLOGY.

Match the project's domain:
- medical/healthcare/hospital/patient/drug/diagnosis/clinical → Health
- banking/fintech/payment/insurance/loan/credit/trading → Finance
- farming/agriculture/crop/irrigation/soil/harvest/food → AgriTech
- tourism/travel/hotel/Airbnb/booking/hospitality/lodging → Tourism
- education/learning/training/course/student/school/university → EduTech
- energy/renewable/solar/wind/electricity/oil/gas/smart grid → Energy
- transportation/traffic/logistics/supply chain/mobility/fleet → Transportation
- environment/climate/pollution/sustainability/waste/recycling/carbon → Environment
- cybersecurity/malware/encryption/threat/firewall → Cybersecurity
- government/public service/administration/policy → Governance
- telecom/5G/network/communication → Telecommunications
- data science/analytics/big data/statistics → Data Science
- Power BI or related BI + domain → use the domain sector, not "Business Intelligence"
- None of the above → Other

## TECHNOLOGY (tools, AI, methods used)
Match the most representative SINGLE technology:
- Power BI/Tableau/Dashboard/KPI/Reporting/BI → Business Intelligence
- SQL/ETL/Data Warehouse/Pipeline/Spark → Data Engineering
- machine learning/predictive model/ML/regression → Machine Learning
- NLP/text/chatbot/sentiment → NLP
- computer vision/image/object detection/OCR/optical character recognition → Computer Vision
- deep learning/CNN/RNN/LSTM → Deep Learning
- GPT/LLM/Llama/generative AI → Generative AI
- robotics/robot/automation/drone → Robotics
- speech/voice recognition/ASR → Speech Recognition
- IoT/sensor/smart device → IoT
- data science/analytics/statistics → Data Science

## COUNTRY
{user_country_hint}

## DESCRIPTION - CRITICAL
Write a professional, formal project description (100-250 words) structured as:
1. **Goal**: What problem does the project solve? Why was it created?
2. **Approach**: How does it work? What AI/tech methods are used?
3. **Features**: Key functionalities or capabilities.
4. **Impact**: What is the expected outcome or benefit?

Rules:
- WRITE in formal business style (third person, professional tone)
- NEVER copy the post text verbatim
- NEVER include hashtags, social mentions, thank-yous, or team names
- NEVER leave empty when post has enough content

## SDG ALIGNMENT
Predict the most relevant SDG(s) based on project domain:
- Health → 3 | Education → 4 | Agriculture → 2 | Energy → 7
- Environment/Climate → 13 | Finance/Work → 8 | Industry/Innovation → 9
- Cities/Transport → 11 | Tourism/Economy → 8,9
- Can list multiple SDGs

## CONFIDENCE
Set confidence 0.0-1.0 for each field. If unsure or info is absent, set <=0.3.

## OUTPUT (JSON only, no markdown)
{{
  "title": "clean project title",
  "country": "detected country or Non détecté",
  "primary_sector": "detected sector",
  "core_ai_technology": "detected technology",
  "description": "professional 100-250 word description",
  "sdg_alignment": [8, 9],
  "confidence": {{
    "sector": 0.0,
    "technology": 0.0,
    "country": 0.0,
    "sdg": 0.0
  }}
}}

POST TEXT:
{text}

OUTPUT (JSON only):"""


def _call_llm(prompt: str) -> str:
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        logger.error("[AI] GROQ_API_KEY not set")
        return ""
    try:
        client = OpenAI(
            base_url="https://api.groq.com/openai/v1",
            api_key=api_key,
        )
        response = client.chat.completions.create(
            model=os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"),
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=2000,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"[AI] LLM call failed: {e}")
        return ""


def _parse_json_response(text: str) -> dict:
    json_match = re.search(r'\{[\s\S]*\}', text)
    if json_match:
        try:
            return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        logger.error(f"[AI] Failed to parse JSON from LLM response: {text[:200]}")
        return {}


def _clean_title(title: str) -> str:
    title = title.strip()
    title = re.sub(r'#\w+\s*', '', title).strip()
    title = re.sub(r'\s*\|\s*.+', '', title).strip()
    title = re.sub(r'\s+', ' ', title).strip()
    if len(title) > 100:
        title = title[:100]
    return title if title else "Non détecté"


def _truncate_text(text: str, max_chars: int = 2000) -> str:
    if len(text) <= max_chars:
        return text
    half = max_chars // 2
    return text[:half] + "\n...[truncated]...\n" + text[-half:]


def extract_project_info(text: str, user_country: str = "") -> dict:
    if not text or len(text.strip()) < 10:
        return {"error": "Text too short", "extracted": False}

    user_country_hint = (
        f"The connected user's LinkedIn profile shows country: {user_country}. "
        f"Use this as country only if the post text does NOT mention a different country. "
        f"If country absent from the post, default to \"{user_country}\"."
        if user_country else
        "Detect country from the post text. If not mentioned, set \"Non détecté\"."
    )

    prompt = EXTRACTION_PROMPT.format(
        text=_truncate_text(text, 2000),
        user_country_hint=user_country_hint,
    )

    llm_response = _call_llm(prompt)
    if not llm_response:
        return {"error": "LLM returned empty response", "extracted": False}

    parsed = _parse_json_response(llm_response)
    if not parsed:
        return {"error": "Failed to parse LLM response", "extracted": False}

    conf = parsed.get("confidence", {})

    field_mapping = {
        "title": ("title", "Non détecté"),
        "country": ("country", "Non détecté"),
        "primary_sector": ("primary_sector", "Other"),
        "core_ai_technology": ("core_ai_technology", "Non détecté"),
        "description": ("description", ""),
        "sdg_alignment": ("sdg_alignment", []),
    }

    result_fields = {}
    for field_key, (output_key, default) in field_mapping.items():
        value = parsed.get(field_key, default)
        if value is None or (isinstance(value, str) and value in ("", "Non détecté")):
            value = default
        if isinstance(value, list) and len(value) == 0:
            value = default
        score_key = {"primary_sector": "sector", "core_ai_technology": "technology"}.get(field_key, field_key)
        score = conf.get(score_key, 0.0)
        if value == default or (isinstance(value, str) and value in ("Non détecté", "Other", "")):
            score = 0.0
        if output_key == "title" and isinstance(value, str):
            value = _clean_title(value)
            if value == "Non détecté":
                score = 0.0
        result_fields[output_key] = {
            "value": value,
            "confidence": score,
        }

    return {"extracted": True, "fields": result_fields}
