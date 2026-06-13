import httpx
import re
import logging

logger = logging.getLogger(__name__)


def fetch_url_content(url: str) -> str:
    methods = [
        _fetch_via_jina_reader,
        _fetch_via_direct_http,
    ]
    for method in methods:
        try:
            content = method(url)
            if content and len(content.strip()) > 50:
                logger.info(f"[URL] Successfully fetched content via {method.__name__} ({len(content)} chars)")
                return content.strip()
        except Exception as e:
            logger.warning(f"[URL] {method.__name__} failed: {e}")
    logger.error(f"[URL] All methods failed for {url}")
    return ""


def _fetch_via_jina_reader(url: str) -> str:
    jina_url = f"https://r.jina.ai/{url}"
    resp = httpx.get(
        jina_url,
        headers={
            "Accept": "text/plain",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        timeout=30,
    )
    if resp.status_code == 200:
        return resp.text
    return ""


def _fetch_via_direct_http(url: str) -> str:
    resp = httpx.get(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9,fr;q=0.8,ar;q=0.7",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        follow_redirects=True,
        timeout=15,
    )
    if resp.status_code == 200:
        text = re.sub(r'<script[^>]*>.*?</script>', '', resp.text, flags=re.DOTALL)
        text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL)
        text = re.sub(r'<[^>]+>', ' ', text)
        text = re.sub(r'&[a-zA-Z]+;', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text
    return ""
