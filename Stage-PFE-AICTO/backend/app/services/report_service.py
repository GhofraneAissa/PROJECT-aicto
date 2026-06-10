import logging
from datetime import datetime, timedelta
from collections import Counter
from app.database import SessionLocal
from app.models.project import Project
from app.models.country import Country
from app.models.user import User
from app.models.stakeholder import Stakeholder
from app.models.sdg import SDG
from sqlalchemy import func, extract
import re

logger = logging.getLogger(__name__)


def parse_sdg_numbers(raw):
    if not raw or not raw.strip():
        return []
    results = set()
    parts = re.split(r'[,;]+', raw)
    for part in parts:
        part = part.strip()
        if not part:
            continue
        if part.isdigit():
            results.add(int(part))
            continue
        m = re.match(r'^(?:SDG|odd)\s*(\d+)$', part, re.IGNORECASE)
        if m:
            results.add(int(m.group(1)))
            continue
        m = re.match(r'^(?:SDG|odd)\s*(\d+)\s*:\s*', part, re.IGNORECASE)
        if m:
            results.add(int(m.group(1)))
            continue
        nums = re.findall(r'\d+', part)
        for n in nums:
            results.add(int(n))
    return sorted(results)


def generate_annual_report_html(year=None):
    """
    Generate a comprehensive HTML annual report for projects.
    If year is None, uses the current year.
    """
    if year is None:
        year = datetime.utcnow().year

    db = SessionLocal()
    try:
        # ── Projects posted this year ──
        start_of_year = datetime(year, 1, 1)
        end_of_year = datetime(year, 12, 31, 23, 59, 59)

        projects_year = db.query(Project).filter(
            Project.submitted_at >= start_of_year,
            Project.submitted_at <= end_of_year
        ).all()

        all_projects = db.query(Project).all()
        all_active = [p for p in all_projects if p.status and p.status.lower() in
                      ("active", "approved", "completed", "in progress")]

        # ── KPIs ──
        total_new = len(projects_year)
        total_active = len(all_active)
        total_all = len(all_projects)

        sectors = Counter(p.sector for p in projects_year if p.sector)
        countries_ids = [p.country_id for p in projects_year if p.country_id]
        countries_list = db.query(Country).filter(Country.id.in_(countries_ids)).all() if countries_ids else []
        country_map = {c.id: c.country for c in countries_list}

        countries_counter = Counter()
        for pid in countries_ids:
            countries_counter[country_map.get(pid, "Unknown")] += 1

        tech_counter = Counter(p.technology for p in projects_year if p.technology)

        sdg_counter = Counter()
        for p in projects_year:
            if p.sdg:
                sdg_counter[p.sdg.goal_number] += 1

        sdgs_all = db.query(SDG).all()
        sdg_map = {s.goal_number: s for s in sdgs_all}

        # Status distribution
        statuses = Counter(p.status.lower() if p.status else "unknown" for p in projects_year)

        # Users
        total_users = db.query(User).count()
        active_users = db.query(User).filter(User.is_active == True).count()

        # Stakeholders
        total_stakeholders = db.query(Stakeholder).count()
        stakeholder_types = db.query(Stakeholder.type, func.count(Stakeholder.id)).group_by(
            Stakeholder.type).all()

        # ── Build HTML ──
        now_str = datetime.utcnow().strftime("%d/%m/%Y à %H:%M UTC")

        def bar(value, max_val, color="#2563eb"):
            pct = (value / max_val * 100) if max_val > 0 else 0
            return f'<div style="background:#f1f5f9;border-radius:6px;height:20px;overflow:hidden;margin:4px 0">' \
                   f'<div style="height:100%;width:{pct:.0f}%;background:{color};border-radius:6px;' \
                   f'transition:width 0.5s"></div></div><span style="font-size:13px;color:#475569;font-weight:600">{value}</span>'

        sector_rows = ""
        max_sector = sectors.most_common(1)[0][1] if sectors else 1
        for s, c in sectors.most_common():
            sector_rows += f"<tr><td style='padding:6px 12px;font-weight:600'>{s}</td><td style='padding:6px 12px'>{bar(c, max_sector)}</td></tr>"

        country_rows = ""
        max_country = countries_counter.most_common(1)[0][1] if countries_counter else 1
        for c, cnt in countries_counter.most_common():
            country_rows += f"<tr><td style='padding:6px 12px;font-weight:600'>{c}</td><td style='padding:6px 12px'>{bar(cnt, max_country, '#8b5cf6')}</td></tr>"

        tech_rows = ""
        max_tech = tech_counter.most_common(1)[0][1] if tech_counter else 1
        colors = ["#2563eb","#8b5cf6","#10b981","#f59e0b","#06b6d4","#ec4899","#f97316","#6366f1"]
        for i, (t, c) in enumerate(tech_counter.most_common()):
            tech_rows += f"<tr><td style='padding:6px 12px;font-weight:600'>{t}</td><td style='padding:6px 12px'>{bar(c, max_tech, colors[i % len(colors)])}</td></tr>"

        sdg_rows = ""
        for s in sdgs_all:
            cnt = sdg_counter.get(s.goal_number, 0)
            bar_color = s.color if cnt > 0 else "#e2e8f0"
            sdg_rows += f"<tr><td style='padding:4px 8px;font-weight:600;color:{s.color}'>ODD {s.goal_number}</td>" \
                        f"<td style='padding:4px 8px;font-size:12px;color:#475569'>{s.title[:35]}</td>" \
                        f"<td style='padding:4px 8px'>{bar(cnt, max(sdg_counter.values() or [1]), bar_color)}</td></tr>"

        project_list_rows = ""
        for p in projects_year:
            country_name = p.country.country if p.country else "N/A"
            status_badge = p.status.lower() if p.status else "unknown"
            badge_color = {"approved":"#10b981","active":"#2563eb","pending":"#f59e0b","rejected":"#ef4444","draft":"#94a3b8","completed":"#6366f1"}.get(status_badge, "#94a3b8")
            project_list_rows += f"<tr><td style='padding:8px 12px;font-weight:600'>{p.title[:40]}</td>" \
                                f"<td style='padding:8px 12px'>{p.organization}</td>" \
                                f"<td style='padding:8px 12px'>{country_name}</td>" \
                                f"<td style='padding:8px 12px'>{p.sector}</td>" \
                                f"<td style='padding:8px 12px'><span style='background:{badge_color}20;color:{badge_color};padding:2px 10px;border-radius:12px;font-size:12px;font-weight:700'>{status_badge}</span></td>" \
                                f"<td style='padding:8px 12px;font-size:12px;color:#64748b'>{p.submitted_at.strftime('%d/%m/%Y') if p.submitted_at else '-'}</td></tr>"

        st_type_rows = ""
        for t, c in stakeholder_types:
            st_type_rows += f"<tr><td style='padding:6px 12px;font-weight:600'>{t}</td><td style='padding:6px 12px'>{c}</td></tr>"

        html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Rapport Annuel {year} - SARAI</title>
<style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
    body {{ font-family:'Outfit','Segoe UI',sans-serif; margin:0; padding:0; background:#f8fafc; color:#1e293b; }}
    .container {{ max-width:800px; margin:0 auto; padding:20px; }}
    .header {{ background:linear-gradient(135deg,#1e3a5f,#2563eb); color:white; padding:40px 30px; border-radius:20px 20px 0 0; text-align:center; }}
    .header h1 {{ font-size:28px; margin:0 0 8px; font-weight:800; letter-spacing:-0.5px; }}
    .header p {{ font-size:14px; opacity:0.85; margin:0; }}
    .header .badge {{ display:inline-block; background:rgba(255,255,255,0.15); padding:6px 16px; border-radius:20px; font-size:12px; font-weight:700; margin-top:12px; }}
    .section {{ background:white; border:1px solid #e2e8f0; border-radius:16px; padding:24px; margin:20px 0; }}
    .section h2 {{ font-size:18px; font-weight:800; margin:0 0 16px; color:#0f172a; display:flex; align-items:center; gap:10px; }}
    .section h2 .icon {{ width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px; }}
    .kpi-grid {{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin:16px 0; }}
    .kpi-card {{ background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px; text-align:center; }}
    .kpi-card .value {{ font-size:28px; font-weight:800; color:#0f172a; }}
    .kpi-card .label {{ font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.3px; margin-top:4px; }}
    table {{ width:100%; border-collapse:collapse; font-size:14px; }}
    th {{ text-align:left; padding:10px 12px; color:#64748b; font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; border-bottom:2px solid #f1f5f9; }}
    td {{ padding:8px 12px; border-bottom:1px solid #f1f5f9; }}
    .footer {{ text-align:center; padding:24px; color:#94a3b8; font-size:12px; }}
    hr {{ border:none; border-top:1px solid #e2e8f0; margin:16px 0; }}
    @media (max-width:600px) {{ .kpi-grid {{ grid-template-columns:1fr; }} .container {{ padding:10px; }} }}
</style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>Rapport Annuel {year}</h1>
        <p>Stocktaking of Arab Regional AI Initiatives — SARAI Platform</p>
        <div class="badge">Genere le {now_str}</div>
    </div>

    <div class="section">
        <h2><span class="icon" style="background:#2563eb20;color:#2563eb">1</span> Vue d'ensemble des Projets</h2>
        <div class="kpi-grid">
            <div class="kpi-card"><div class="value">{total_new}</div><div class="label">Nouveaux Projets {year}</div></div>
            <div class="kpi-card"><div class="value">{total_active}</div><div class="label">Projets Actifs (Total)</div></div>
            <div class="kpi-card"><div class="value">{total_all}</div><div class="label">Projets (Total historique)</div></div>
        </div>
        <table>
            <tr><th>Statut</th><th>Nombre</th></tr>
            {''.join(f'<tr><td style="font-weight:600">{s}</td><td>{c}</td></tr>' for s,c in statuses.most_common())}
        </table>
    </div>

    <div class="section">
        <h2><span class="icon" style="background:#8b5cf620;color:#8b5cf6">2</span> Repartition par Secteur</h2>
        <table>{sector_rows}</table>
    </div>

    <div class="section">
        <h2><span class="icon" style="background:#10b98120;color:#10b981">3</span> Repartition par Pays</h2>
        <table>{country_rows}</table>
    </div>

    <div class="section">
        <h2><span class="icon" style="background:#f59e0b20;color:#f59e0b">4</span> Technologies Utilisees</h2>
        <table>{tech_rows}</table>
    </div>

    <div class="section">
        <h2><span class="icon" style="background:#06b6d420;color:#06b6d4">5</span> Alignement ODD</h2>
        <table>
            <tr><th>ODD</th><th>Titre</th><th>Projets</th></tr>
            {sdg_rows}
        </table>
    </div>

    <div class="section">
        <h2><span class="icon" style="background:#ec489920;color:#ec4899">6</span> Liste des Projets ({year})</h2>
        <table>
            <tr><th>Titre</th><th>Organisation</th><th>Pays</th><th>Secteur</th><th>Statut</th><th>Soumis</th></tr>
            {project_list_rows if project_list_rows else '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:24px">Aucun projet soumis cette annee</td></tr>'}
        </table>
    </div>

    <div class="section">
        <h2><span class="icon" style="background:#6366f120;color:#6366f1">7</span> Communaute & Acteurs</h2>
        <div class="kpi-grid">
            <div class="kpi-card"><div class="value">{total_users}</div><div class="label">Utilisateurs Inscrits</div></div>
            <div class="kpi-card"><div class="value">{active_users}</div><div class="label">Comptes Actifs</div></div>
            <div class="kpi-card"><div class="value">{total_stakeholders}</div><div class="label">Stakeholders</div></div>
        </div>
        <h3 style="font-size:14px;font-weight:700;margin:16px 0 8px;color:#0f172a">Stakeholders par type</h3>
        <table>{st_type_rows}</table>
    </div>

    <div class="footer">
        <p>SARAI — Stocktaking of Arab Regional AI Initiatives</p>
        <p>Ce rapport est genere automatiquement par la plateforme.</p>
        <p style="font-size:11px;color:#cbd5e1">Document genere le {now_str}</p>
    </div>
</div>
</body>
</html>"""

        return html

    except Exception as e:
        logger.error(f"[REPORT] Error generating report: {e}")
        raise
    finally:
        db.close()
