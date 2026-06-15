import os
import json
import re
import logging
from openai import OpenAI

logger = logging.getLogger(__name__)

EXTRACTION_PROMPT = """Extract structured project info from this LinkedIn post for an AI project stocktaking platform.

## CRITICAL: You MUST fill EVERY field. NEVER leave any field empty or "Non détecté".

## TITLE - CRITICAL RULES
Generate a clean, short, professional project title (3-12 words). NEVER include hashtags (#anything). NEVER copy social media handles. NEVER use pipe-separated keywords.

Good titles: "AI-Powered Handwritten Document Analysis for Healthcare", "Airbnb Data Analytics Dashboard", "Automated Medical Records OCR System"
Bad titles: "#ai #machinelearning #healthtech | Aissa Ghofrane", "Thrilled to share that we've just completed", "#dataanalytics #powerbi"

If the post is vague, generate a plausible title from the sector and technology.

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

IMPORTANT: You MUST select ONE sector. If unsure, pick the most likely one.

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
- No clear tech, domain-related → Machine Learning

## COUNTRY
{user_country_hint}

## DESCRIPTION - MANDATORY - NEVER LEAVE EMPTY
Write a professional, formal project description (100-250 words) structured as:
1. **Goal**: What problem does the project solve? Why was it created?
2. **Approach**: How does it work? What AI/tech methods are used?
3. **Features**: Key functionalities or capabilities.
4. **Impact**: What is the expected outcome or benefit?

Rules:
- WRITE in formal business style (third person, professional tone)
- NEVER copy the post text verbatim
- NEVER include hashtags, social mentions, thank-yous, or team names
- ALWAYS generate a description even if the post is short - use the sector and technology to infer it
- NEVER leave the description empty

## SDG ALIGNMENT
Predict the most relevant SDG(s) based on project domain:
- Health → 3 | Education → 4 | Agriculture → 2 | Energy → 7
- Environment/Climate → 13 | Finance/Work → 8 | Industry/Innovation → 9
- Cities/Transport → 11 | Tourism/Economy → 8,9
- Can list multiple SDGs. Default to [9] if unsure.

## CONFIDENCE
Set confidence 0.0-1.0 for each field.

## OUTPUT (JSON only, no markdown)
{{
  "title": "clean project title",
  "country": "detected country",
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
    return title if title else "AI Project"


def _truncate_text(text: str, max_chars: int = 2000) -> str:
    if len(text) <= max_chars:
        return text
    half = max_chars // 2
    return text[:half] + "\n...[truncated]...\n" + text[-half:]


def _generate_fallback_description(title: str, sector: str, technology: str) -> str:
    import random
    templates = [
        f"This project focuses on developing an AI-powered solution in the {sector} sector using {technology} technologies. "
        f"The initiative aims to leverage cutting-edge artificial intelligence to address key challenges and drive innovation in the region. "
        f"By implementing {technology}-based approaches, the project seeks to improve efficiency, accuracy, and decision-making processes. "
        f"The expected outcomes include enhanced operational capabilities, reduced costs, and better service delivery for stakeholders in the Arab region.",
    ]
    return templates[0]


SECTOR_MAP = {
    "health": "Health", "medical": "Health", "healthcare": "Health", "hospital": "Health",
    "patient": "Health", "drug": "Health", "diagnosis": "Health", "clinical": "Health",
    "doctor": "Health", "pharma": "Health",
    "financ": "Finance", "banking": "Finance", "fintech": "Finance", "payment": "Finance",
    "insurance": "Finance", "loan": "Finance", "credit": "Finance", "trading": "Finance",
    "agricult": "AgriTech", "farm": "AgriTech", "crop": "AgriTech", "irrigation": "AgriTech",
    "harvest": "AgriTech", "food": "AgriTech",
    "tourism": "Tourism", "travel": "Tourism", "hotel": "Tourism", "booking": "Tourism",
    "hospitality": "Tourism",
    "educat": "EduTech", "learn": "EduTech", "training": "EduTech", "course": "EduTech",
    "student": "EduTech", "school": "EduTech", "university": "EduTech",
    "energy": "Energy", "renewable": "Energy", "solar": "Energy", "wind": "Energy",
    "electricity": "Energy", "oil": "Energy", "gas": "Energy", "smart grid": "Energy",
    "transport": "Transportation", "traffic": "Transportation", "logistics": "Transportation",
    "supply chain": "Transportation", "mobility": "Transportation", "fleet": "Transportation",
    "environ": "Environment", "climate": "Environment", "pollution": "Environment",
    "sustainability": "Environment", "waste": "Environment", "recycl": "Environment", "carbon": "Environment",
    "cyber": "Cybersecurity", "malware": "Cybersecurity", "encryption": "Cybersecurity",
    "threat": "Cybersecurity", "firewall": "Cybersecurity", "security": "Cybersecurity",
    "govern": "Governance", "government": "Governance", "public service": "Governance",
    "administration": "Governance", "policy": "Governance",
    "telecom": "Telecommunications", "5g": "Telecommunications", "network": "Telecommunications",
    "communication": "Telecommunications",
    "data science": "Data Science", "analytics": "Data Science", "big data": "Data Science",
    "statistics": "Data Science",
}

TECH_MAP = {
    "power bi": "Business Intelligence", "tableau": "Business Intelligence",
    "dashboard": "Business Intelligence", "kpi": "Business Intelligence",
    "reporting": "Business Intelligence", "bi ": "Business Intelligence",
    "sql": "Data Engineering", "etl": "Data Engineering", "data warehouse": "Data Engineering",
    "pipeline": "Data Engineering", "spark": "Data Engineering",
    "machine learning": "Machine Learning", "predictive model": "Machine Learning",
    "regression": "Machine Learning", "classification": "Machine Learning",
    "nlp": "NLP", "text": "NLP", "chatbot": "NLP", "sentiment": "NLP",
    "computer vision": "Computer Vision", "image": "Computer Vision",
    "object detection": "Computer Vision", "ocr": "Computer Vision",
    "deep learning": "Deep Learning", "cnn": "Deep Learning", "rnn": "Deep Learning",
    "lstm": "Deep Learning",
    "gpt": "Generative AI", "llm": "Generative AI", "llama": "Generative AI",
    "generative": "Generative AI",
    "robot": "Robotics", "automation": "Robotics", "drone": "Robotics",
    "speech": "Speech Recognition", "voice": "Speech Recognition", "asr": "Speech Recognition",
    "iot": "IoT", "sensor": "IoT", "smart device": "IoT",
    "data science": "Data Science",
}

COUNTRY_MAP = {
    "algeria": "Algeria", "algérie": "Algeria",
    "bahrain": "Bahrain",
    "comoros": "Comoros", "djibouti": "Djibouti",
    "egypt": "Egypt", "égypte": "Egypt",
    "iraq": "Iraq",
    "jordan": "Jordan", "jordanie": "Jordan",
    "kuwait": "Kuwait", "koweït": "Kuwait",
    "lebanon": "Lebanon", "liban": "Lebanon",
    "libya": "Libya", "libye": "Libya",
    "mauritania": "Mauritania", "mauritanie": "Mauritania",
    "morocco": "Morocco", "maroc": "Morocco",
    "oman": "Oman",
    "palestine": "Palestine",
    "qatar": "Qatar",
    "saudi arabia": "Saudi Arabia", "saudi": "Saudi Arabia", "arabie saoudite": "Saudi Arabia",
    "somalia": "Somalia", "somali": "Somalia",
    "sudan": "Sudan", "soudan": "Sudan",
    "syria": "Syria", "syrie": "Syria",
    "tunisia": "Tunisia", "tunisie": "Tunisia",
    "uae": "United Arab Emirates", "united arab emirates": "United Arab Emirates",
    "dubai": "United Arab Emirates", "abou dabi": "United Arab Emirates",
    "yemen": "Yemen", "yémen": "Yemen",
}


def _keyword_match(text_lower: str, mapping: dict, default: str) -> str:
    for keyword, value in mapping.items():
        if keyword in text_lower:
            return value
    return default


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
    parsed = _parse_json_response(llm_response) if llm_response else {}

    text_lower = text.lower()

    # Keyword-based fallback for sector and technology
    keyword_sector = _keyword_match(text_lower, SECTOR_MAP, "Other")
    keyword_tech = _keyword_match(text_lower, TECH_MAP, "Machine Learning")

    # Extract title from LLM or generate fallback
    title = parsed.get("title", "")
    if not title or title in ("Non détecté", ""):
        title = "AI Project in " + keyword_sector
    title = _clean_title(title)

    # Sector: prefer LLM, fallback to keyword
    primary_sector = parsed.get("primary_sector", "")
    valid_sectors = ['Health', 'EduTech', 'AgriTech', 'Finance', 'Tourism', 'Transportation',
                     'Energy', 'Environment', 'Cybersecurity', 'Governance',
                     'Telecommunications', 'Data Science', 'Business Intelligence', 'Other']
    if primary_sector not in valid_sectors or primary_sector in ("", "Non détecté"):
        primary_sector = keyword_sector

    # Technology: prefer LLM, fallback to keyword
    core_ai_technology = parsed.get("core_ai_technology", "")
    valid_techs = ['NLP', 'Computer Vision', 'Robotics', 'Machine Learning', 'Deep Learning',
                   'Speech Recognition', 'Business Intelligence', 'Data Engineering',
                   'Data Science', 'Generative AI', 'IoT']
    if core_ai_technology not in valid_techs or core_ai_technology in ("", "Non détecté"):
        core_ai_technology = keyword_tech

    # Country: prefer LLM, fallback to keyword match, then user_country
    country = parsed.get("country", "")
    if not country or country in ("Non détecté", ""):
        keyword_country = _keyword_match(text_lower, COUNTRY_MAP, "")
        country = keyword_country or user_country or "Non détecté"

    # Description: prefer LLM, fallback to generated
    description = parsed.get("description", "")
    if not description or len(description.strip()) < 20:
        description = _generate_fallback_description(title, primary_sector, core_ai_technology)

    # SDG: prefer LLM, fallback to sector-based
    sdg_alignment = parsed.get("sdg_alignment", [])
    if not sdg_alignment:
        sdg_map = {
            "Health": [3], "EduTech": [4], "AgriTech": [2], "Finance": [8],
            "Tourism": [8, 9], "Transportation": [11], "Energy": [7],
            "Environment": [13], "Cybersecurity": [9], "Governance": [16],
            "Telecommunications": [9], "Data Science": [9], "Business Intelligence": [9],
            "Other": [9]
        }
        sdg_alignment = sdg_map.get(primary_sector, [9])

    # Confidence from LLM or default
    conf = parsed.get("confidence", {})

    field_mapping = {
        "title": ("title", title),
        "country": ("country", country),
        "primary_sector": ("primary_sector", primary_sector),
        "core_ai_technology": ("core_ai_technology", core_ai_technology),
        "description": ("description", description),
        "sdg_alignment": ("sdg_alignment", sdg_alignment),
    }

    result_fields = {}
    for field_key, (output_key, default) in field_mapping.items():
        value = default
        score_key = {
            "primary_sector": "sector",
            "core_ai_technology": "technology"
        }.get(field_key, field_key)
        score = conf.get(score_key, 0.0)

        result_fields[output_key] = {
            "value": value,
            "confidence": score if score > 0 else 0.5,
        }

    return {"extracted": True, "fields": result_fields}
