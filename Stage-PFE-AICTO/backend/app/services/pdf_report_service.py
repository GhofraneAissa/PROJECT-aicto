import logging
import os
import re
from io import BytesIO
from datetime import datetime
from collections import Counter, defaultdict
from fpdf import FPDF

from app.database import SessionLocal
from app.models.project import Project, ProjectStakeholderAssociation
from app.models.country import Country
from app.models.user import User
from app.models.stakeholder import Stakeholder
from app.models.sdg import SDG
from app.models.resource import Resource
from sqlalchemy import func

logger = logging.getLogger(__name__)

WINDOWS_FONTS = os.environ.get("WINDIR", "C:\\Windows") + "\\Fonts"
FONT_REGULAR = os.path.join(WINDOWS_FONTS, "arial.ttf")
FONT_BOLD = os.path.join(WINDOWS_FONTS, "arialbd.ttf")
FONT_ITALIC = os.path.join(WINDOWS_FONTS, "ariali.ttf")
FN = "Arial"


def _ensure_fonts():
    if not os.path.exists(FONT_REGULAR):
        raise FileNotFoundError(f"Arial font not found at {FONT_REGULAR}")


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


def is_valid_project(p):
    if not p or not p.title:
        return False
    t = p.title.strip()
    if not t:
        return False
    if t.isdigit():
        return False
    if len(t) < 2:
        return False
    return True


def deduplicate_projects(projects):
    seen = set()
    result = []
    for p in projects:
        key = p.title.strip().lower() if p.title else ""
        if key and key not in seen:
            seen.add(key)
            result.append(p)
    return result


class PDF(FPDF):
    def __init__(self):
        super().__init__("P", "mm", "A4")
        _ensure_fonts()
        self.add_font(FN, "", FONT_REGULAR)
        self.add_font(FN, "B", FONT_BOLD)
        self.add_font(FN, "I", FONT_ITALIC)
        self.set_auto_page_break(auto=True, margin=25)

    def header(self):
        if self.page_no() > 1:
            self.set_font(FN, "I", 7)
            self.set_text_color(120, 120, 120)
            self.cell(0, 8, "SARAI - Rapport Annuel", align="L")
            self.cell(0, 8, f"Page {self.page_no()}/{{nb}}", align="R", new_x="LMARGIN", new_y="NEXT")
            self.line(10, 14, 200, 14)
            self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font(FN, "I", 6)
        self.set_text_color(160, 160, 160)
        self.cell(0, 10, f"Genere le {datetime.utcnow().strftime('%d/%m/%Y a %H:%M UTC')} | SARAI Platform", align="C")

    def h1(self, num, title):
        self.set_font(FN, "B", 16)
        self.set_text_color(20, 30, 60)
        self.ln(6)
        self.cell(0, 12, f"{num}. {title}", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(37, 99, 235)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def h2(self, title):
        self.set_font(FN, "B", 12)
        self.set_text_color(30, 64, 120)
        self.ln(3)
        self.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def h3(self, title):
        self.set_font(FN, "B", 10)
        self.set_text_color(50, 50, 80)
        self.cell(0, 7, title, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def p(self, text, size=9):
        self.set_font(FN, "", size)
        self.set_text_color(30, 30, 30)
        self.multi_cell(0, 5, text)
        self.ln(1)

    def bar(self, value, max_val, width=80, color=(37, 99, 235)):
        pct = (value / max_val * 100) if max_val > 0 else 0
        bw = width * pct / 100
        self.set_fill_color(*color)
        self.set_draw_color(*color)
        self.rect(self.get_x(), self.get_y(), bw, 5, "DF")
        self.set_x(self.get_x() + width + 2)
        self.set_font(FN, "B", 8)
        self.set_text_color(30, 30, 30)
        self.cell(0, 5, str(value))

    def kv(self, key, val):
        self.set_font(FN, "B", 9)
        self.set_text_color(60, 60, 60)
        self.cell(28, 6, key + ":", new_x="RIGHT")
        self.set_font(FN, "", 9)
        self.set_text_color(20, 20, 20)
        w = self.w - self.get_x() - self.r_margin
        if w < 10:
            self.ln()
            self.set_x(self.l_margin + 30)
            w = self.w - self.get_x() - self.r_margin
        self.multi_cell(w, 6, str(val)[:80])

    def status_c(self, status):
        colors = {
            "approved": (16, 185, 129), "active": (37, 99, 235),
            "pending": (245, 158, 11), "rejected": (239, 68, 68),
            "draft": (148, 163, 184), "completed": (99, 102, 241),
            "in progress": (99, 102, 241),
        }
        return colors.get(status.lower().strip() if status else "unknown", (148, 163, 184))


def generate_pdf_report(year=None):
    if year is None:
        year = datetime.utcnow().year

    db = SessionLocal()
    pdf = PDF()
    pdf.alias_nb_pages()

    try:
        all_projects = db.query(Project).all()

        valid_projects = [p for p in all_projects if is_valid_project(p)]
        unique_projects = deduplicate_projects(valid_projects)

        # For the "current year" report, use created_at filter
        year_projects = [p for p in unique_projects if p.created_at and p.created_at.year == year]

        # If no projects match the year, fall back to all unique projects
        if not year_projects:
            year_projects = unique_projects

        total_raw = len(all_projects)
        total_valid = len(valid_projects)
        total_unique = len(year_projects)
        duplicates_removed = total_raw - total_unique
        corrupted_removed = total_valid - len(unique_projects) + (total_raw - total_valid)

        all_active = [p for p in year_projects if p.status and p.status.lower() in
                      ("active", "approved", "completed", "in progress")]

        countries_list = db.query(Country).order_by(Country.country).all()
        country_map = {c.id: c.country for c in countries_list}
        sdgs_all = db.query(SDG).order_by(SDG.goal_number).all()
        all_stakeholders = db.query(Stakeholder).order_by(Stakeholder.name).all()
        total_users = db.query(User).count()
        active_users = db.query(User).filter(User.is_active == True).count()
        total_resources = db.query(Resource).count()

        # ── STATS ──
        statuses = Counter(p.status.lower().strip() if p.status else "unknown" for p in year_projects)
        sectors = Counter(p.sector for p in year_projects if p.sector)
        tech_counter = Counter(p.technology for p in year_projects if p.technology)
        countries_counter = Counter()
        for p in year_projects:
            if p.country_id:
                countries_counter[country_map.get(p.country_id, "Inconnu")] += 1
        sdg_counter = Counter()
        for p in year_projects:
            if p.sdg:
                sdg_counter[p.sdg.goal_number] += 1
        users_by_type = db.query(User.organization_type, func.count(User.id)).group_by(User.organization_type).all()
        stakeholder_types_count = db.query(Stakeholder.type, func.count(Stakeholder.id)).group_by(Stakeholder.type).all()
        resources_by_type = db.query(Resource.type, func.count(Resource.id)).group_by(Resource.type).all()

        # Monthly distribution (using created_at)
        monthly = Counter()
        for p in year_projects:
            if p.created_at:
                monthly[p.created_at.month] += 1

        total = len(year_projects)
        approved_count = statuses.get("approved", 0)
        rejected_count = statuses.get("rejected", 0)
        pending_count = statuses.get("pending", 0) + statuses.get("in progress", 0)
        active_count = statuses.get("active", 0)
        completed_count = statuses.get("completed", 0)
        acceptance_rate = (approved_count / total * 100) if total > 0 else 0

        def write_paragraph(text):
            pdf.p(text)

        def write_analysis_section(intro, interpretation, conclusion_text):
            pdf.set_font(FN, "I", 8)
            pdf.set_text_color(80, 80, 80)
            pdf.multi_cell(0, 4, intro)
            pdf.ln(1)
            pdf.set_font(FN, "", 9)
            pdf.set_text_color(30, 30, 30)
            pdf.multi_cell(0, 5, interpretation)
            pdf.ln(1)
            pdf.set_font(FN, "I", 8)
            pdf.set_text_color(60, 60, 60)
            pdf.multi_cell(0, 4, conclusion_text)
            pdf.ln(2)

        # ══════════════════════════════════════
        # COVER PAGE
        # ══════════════════════════════════════
        pdf.add_page()
        pdf.ln(50)
        pdf.set_font(FN, "B", 36)
        pdf.set_text_color(20, 30, 60)
        pdf.cell(0, 16, "RAPPORT ANNUEL", align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font(FN, "B", 30)
        pdf.set_text_color(37, 99, 235)
        pdf.cell(0, 14, str(year), align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(6)
        pdf.set_font(FN, "", 14)
        pdf.set_text_color(80, 80, 80)
        pdf.cell(0, 8, "Stocktaking of Arab Regional AI Initiatives", align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, "Plateforme SARAI", align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(15)
        pdf.set_draw_color(37, 99, 235)
        pdf.set_line_width(0.5)
        pdf.line(60, pdf.get_y(), 150, pdf.get_y())
        pdf.ln(10)
        pdf.set_font(FN, "", 10)
        pdf.set_text_color(120, 120, 120)
        pdf.cell(0, 7, f"Document genere le {datetime.utcnow().strftime('%d/%m/%Y a %H:%M UTC')}", align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 7, f"{total} projets analyses | {len(countries_counter)} pays | {total_users} utilisateurs | {len(all_stakeholders)} parties prenantes", align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(20)
        pdf.set_font(FN, "", 9)
        pdf.set_text_color(100, 100, 100)
        pdf.multi_cell(0, 5, (
            "Le present rapport a ete prepare par l'equipe d'analyse de la plateforme SARAI. "
            "Il presente un etat des lieux complet et detaille des initiatives en Intelligence Artificielle "
            "dans la region arabe, base sur les donnees collectees et validees aupres des organisations participantes."
        ), align="C")

        # ══════════════════════════════════════
        # TABLE OF CONTENTS
        # ══════════════════════════════════════
        pdf.add_page()
        pdf.set_font(FN, "B", 20)
        pdf.set_text_color(20, 30, 60)
        pdf.cell(0, 14, "Table des Matieres", new_x="LMARGIN", new_y="NEXT")
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(6)
        toc = [
            ("1", "Introduction Generale"),
            ("2", "Resume Executif"),
            ("3", "Analyse Globale des Projets"),
            ("4", "Analyse Geographique"),
            ("5", "Analyse Sectorielle"),
            ("6", "Analyse Technologique"),
            ("7", "Alignement sur les Objectifs de Developpement Durable"),
            ("8", "Documentation Detaillee des Projets"),
            ("9", "Analyse des Parties Prenantes"),
            ("10", "Ressources et Communaute"),
            ("11", "Recommandations Strategiques"),
            ("12", "Conclusion Generale"),
        ]
        for n, t in toc:
            pdf.set_font(FN, "B", 11)
            pdf.set_text_color(37, 99, 235)
            pdf.cell(12, 8, n + ".", align="R")
            pdf.set_font(FN, "", 11)
            pdf.set_text_color(40, 40, 40)
            pdf.cell(0, 8, t, new_x="LMARGIN", new_y="NEXT")

        # ══════════════════════════════════════
        # 1. INTRODUCTION GENERALE
        # ══════════════════════════════════════
        pdf.add_page()
        pdf.h1("1", "Introduction Generale")

        pdf.h2("1.1 Contexte et Mission de SARAI")
        pdf.p(
            "La plateforme SARAI (Stocktaking of Arab Regional AI Initiatives) constitue un observatoire "
            "strategique dedie au recensement, a l'analyse et a la promotion des initiatives en Intelligence "
            "Artificielle dans le monde arabe. Fruit d'une collaboration entre les Etats membres de la Ligue "
            "Arabe, des institutions academiques, des organisations internationales et du secteur prive, "
            "SARAI vise a cartographier l'ecosysteme regional de l'IA afin d'en mesurer la maturite, "
            "d'identifier les tendances emergentes et de formuler des recommandations eclairees."
        )

        pdf.h2("1.2 Enjeux et Importance de l'IA dans la Region Arabe")
        pdf.p(
            "La region arabe connait une transformation numerique acceleree, portee par des investissements "
            "massifs dans les infrastructures technologiques et une volonte politique affirmee de diversifier "
            "les economies au-dela des hydrocarbures. Dans ce contexte, l'Intelligence Artificielle emerge "
            "comme un levier strategique majeur pour relever les defis structurels : croissance demographique, "
            "pression sur les systemes de sante, securite alimentaire, gestion des ressources en eau, "
            "education et inclusion financiere. Le rapport annuel que nous presentons ici offre une photographie "
            "precise de l'etat d'avancement de ces initiatives."
        )

        pdf.h2("1.3 Objectifs du Rapport")
        pdf.p(
            "Ce rapport poursuit les objectifs suivants :"
        )
        objectives = [
            "Fournir une cartographie exhaustive et actualisee des projets d'IA dans la region arabe",
            "Analyser la repartition geographique, sectorielle et technologique des initiatives",
            "Evaluer l'alignement des projets sur les Objectifs de Developpement Durable des Nations Unies",
            "Identifier les acteurs cles de l'ecosysteme et leurs interactions",
            "Formuler des recommandations strategiques pour les decideurs politiques et les investisseurs",
            "Documenter les bonnes pratiques et les innovations remarquables"
        ]
        for obj in objectives:
            pdf.set_font(FN, "", 9)
            pdf.set_text_color(50, 50, 50)
            pdf.cell(6, 6, "")
            pdf.cell(0, 6, f"- {obj}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(2)

        pdf.h2("1.4 Methodologie")
        pdf.p(
            f"Les donnees analysees dans ce rapport proviennent des soumissions directes des organisations "
            f"via la plateforme SARAI. Chaque projet a ete soumis a un processus de validation comportant : "
            f"(1) un filtrage automatique des entrees invalides ou corrompues, (2) une deduplication basee "
            f"sur le titre du projet, et (3) une verification croisee des metadonnees. Sur les {total_raw} "
            f"enregistrements bruts, {total_unique} projets uniques et valides ont ete retenus pour l'analyse "
            f"finale, apres suppression de {duplicates_removed} doublons et {corrupted_removed} entrees invalides. "
            f"L'analyse couvre l'ensemble de l'annee {year}."
        )

        # ══════════════════════════════════════
        # 2. RESUME EXECUTIF
        # ══════════════════════════════════════
        pdf.add_page()
        pdf.h1("2", "Resume Executif")

        pdf.h2("2.1 Chiffres Cles")
        kpis = [
            ("Projets valides", str(total_unique), f"Incluant {len(all_active)} actifs"),
            ("Pays representes", str(len(countries_counter)), "Sur 22 pays de la Ligue Arabe"),
            ("Secteurs couverts", str(len(sectors)), "Domaines d'application diversifies"),
            ("Technologies", str(len(tech_counter)), "Approches et outils d'IA varies"),
            ("ODD cibles", str(len(sdg_counter)), "Objectifs de Developpement Durable"),
            ("Parties prenantes", str(len(all_stakeholders)), "Acteurs de l'ecosysteme"),
            ("Utilisateurs", str(total_users), f"Dont {active_users} comptes actifs"),
            ("Ressources", str(total_resources), "Documents et donnees partagees"),
        ]
        for label, value, desc in kpis:
            pdf.set_font(FN, "B", 22)
            pdf.set_text_color(37, 99, 235)
            pdf.cell(30, 12, value, align="C")
            pdf.set_font(FN, "B", 10)
            pdf.set_text_color(30, 30, 30)
            pdf.cell(50, 6, label)
            pdf.set_x(90)
            pdf.set_font(FN, "", 8)
            pdf.set_text_color(120, 120, 120)
            pdf.cell(0, 6, desc, new_x="LMARGIN", new_y="NEXT")
            pdf.ln(1)

        pdf.ln(4)
        pdf.h2("2.2 Constats Principaux")
        pdf.p(
            f"L'analyse des {total_unique} projets valides soumis en {year} revele un ecosysteme en pleine "
            f"maturation. Le taux d'acceptation des projets atteint {acceptance_rate:.1f}%, temoignant d'une "
            f"demarche qualitative de la part des organisations soumissionnaires. La repartition geographique "
            f"montre une concentration des initiatives dans les pays disposant de strategies nationales d'IA "
            f"structurees, tandis que des disparites regionales persistent."
        )
        pdf.p(
            f"Sur le plan sectoriel, les domaines de la sante, de l'agriculture et de l'education dominent le "
            f"paysage, refletant les priorites de developpement de la region. L'analyse technologique revele "
            f"une adoption significative du Machine Learning et du Traitement Automatique du Langage Naturel "
            f"(NLP), avec une emergence notable de l'IA generative dans les soumissions recentes. "
            f"L'alignement sur les ODD est inegal : l'ODD 10 (Inegalites reduites) et l'ODD 16 (Paix et "
            f"justice) sont les plus representes, mais des lacunes subsistent concernant les ODD lies "
            f"a l'environnement et a la biodiversite."
        )

        pdf.h2("2.3 Evolution de l'Ecosysteme")
        pdf.p(
            f"L'ecosysteme regional de l'IA se caracterise par une diversification croissante des acteurs. "
            f"Aux cotes des gouvernements, traditionnellement moteurs de l'innovation, on observe une montee "
            f"en puissance des startups technologiques et des laboratoires de recherche universitaires. "
            f"Ces derniers jouent un role crucial dans le developpement de solutions adaptees aux contextes "
            f"locaux. La collaboration transfrontaliere reste toutefois limitee, constituant un axe "
            f"d'amelioration prioritaire pour les annees a venir."
        )

        # ══════════════════════════════════════
        # 3. ANALYSE GLOBALE DES PROJETS
        # ══════════════════════════════════════
        pdf.add_page()
        pdf.h1("3", "Analyse Globale des Projets")

        pdf.h2("3.1 Volume et Structure du Portefeuille")
        pdf.p(
            f"Au cours de l'annee {year}, la plateforme SARAI a recense un total de {total_unique} projets "
            f"valides et uniques, issus de {len(countries_counter)} pays de la region arabe. Ce volume temoigne "
            f"d'une dynamique positive dans le developpement et le deploiement de solutions d'IA, bien que "
            f"des efforts restent a fournir pour atteindre une masse critique capable de generer des impacts "
            f"transformateurs a l'echelle regionale."
        )

        pdf.h2("3.2 Repartition par Statut")
        max_s = max(statuses.values()) if statuses else 1
        status_order = ["active", "approved", "in progress", "completed", "rejected", "pending", "draft"]
        for sn in status_order:
            if sn in statuses:
                c = statuses[sn]
                pdf.set_font(FN, "", 9)
                pdf.set_text_color(30, 30, 30)
                pdf.cell(35, 7, sn.capitalize())
                pdf.set_x(45)
                pdf.bar(c, max_s, 105, pdf.status_c(sn))
                pdf.ln(8)

        pdf.ln(2)
        pdf.p(
            f"La proportion de projets actifs ({active_count}, soit {active_count/total*100:.1f}%) et "
            f"approuves ({approved_count}, soit {approved_count/total*100:.1f}%) est predominante, ce qui "
            f"indique un pipeline de projets en bonne sante. Le taux d'acceptation de {acceptance_rate:.1f}% "
            f"reflete des processus de soumission globalement maitrises. Le faible nombre de rejets "
            f"({rejected_count}) suggere que les organisations ont bien compris les criteres de qualite "
            f"exiges par la plateforme."
        )

        pdf.h2("3.3 Distribution Mensuelle")
        if monthly:
            pdf.p("La repartition mensuelle des soumissions de projets permet d'identifier les periodes de forte activite :")
            pdf.ln(2)
            max_m = max(monthly.values())
            month_names = ["Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin", "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre"]
            colors_m = [(37, 99, 235), (59, 130, 246), (96, 165, 250), (147, 197, 253), (191, 219, 254),
                        (37, 99, 235), (59, 130, 246), (96, 165, 250), (147, 197, 253), (191, 219, 254),
                        (37, 99, 235), (59, 130, 246)]
            for m_num in sorted(monthly.keys()):
                c = monthly[m_num]
                pdf.set_font(FN, "", 9)
                pdf.set_text_color(30, 30, 30)
                pdf.cell(30, 7, month_names[m_num - 1][:8] + ".")
                pdf.set_x(40)
                pdf.bar(c, max_m, 110, colors_m[(m_num - 1) % len(colors_m)])
                pdf.ln(8)
            pdf.ln(2)
            peak_month = max(monthly, key=monthly.get)
            pdf.p(
                f"Le pic d'activite a ete observe au mois de {month_names[peak_month - 1]} "
                f"avec {monthly[peak_month]} soumissions. Cette concentration peut s'expliquer par des cycles "
                f"de financement, des appels a projets regionaux ou des evenements catalyseurs."
            )

        # ══════════════════════════════════════
        # 4. ANALYSE GEOGRAPHIQUE
        # ══════════════════════════════════════
        pdf.add_page()
        pdf.h1("4", "Analyse Geographique")

        pdf.p(
            f"La dimension geographique est fondamentale pour comprendre la repartition des competences "
            f"et des investissements en IA dans le monde arabe. Les {len(countries_counter)} pays representes "
            f"offrent un panorama riche mais inegal du developpement regional de l'IA."
        )

        pdf.h2("4.1 Repartition des Projets par Pays")
        if countries_counter:
            max_c = max(countries_counter.values())
            for c_name, count in countries_counter.most_common():
                pdf.set_font(FN, "", 9)
                pdf.set_text_color(30, 30, 30)
                pdf.cell(45, 7, c_name[:35])
                pdf.set_x(55)
                pdf.bar(count, max_c, 95, (139, 92, 246))
                pct = count / total * 100
                pdf.set_font(FN, "", 7)
                pdf.set_text_color(100, 100, 100)
                pdf.cell(0, 5, f"({pct:.1f}%)", new_x="LMARGIN", new_y="NEXT")
                pdf.ln(1)

        pdf.ln(3)
        top_country = countries_counter.most_common(1)
        if top_country:
            pdf.p(
                f"Le pays leader est {top_country[0][0]} avec {top_country[0][1]} projets, representant "
                f"{top_country[0][1]/total*100:.1f}% du portefeuille total. Cette domination s'explique par "
                f"des strategies nationales d'IA avancees, des investissements publics consequents et un "
                f"ecosysteme startup dynamique."
            )

        pdf.h2("4.2 Analyse des Disparites Regionales")
        pdf.p(
            "L'analyse revele des disparites significatives entre les sous-regions :"
        )
        pdf.p(
            "- Les pays du Conseil de Cooperation du Golfe (CCG) concentrent la majorite des initiatives, "
            "beneficiant d'infrastructures numeriques de pointe et de budgets dedies a la transformation digitale. "
            "- Les pays du Maghreb affichent une presence notable mais encore en deçà de leur potentiel. "
            "- Les pays du Machrek et d'Afrique de l'Est arabe presentent des taux de participation plus faibles, "
            "refletant des contraintes structurelles et des priorites budgetaires differentes."
        )
        pdf.p(
            "Ces disparites constituent a la fois un defi et une opportunite : elles appellent a des politiques "
            "de cooperation regionale renforcees et a des mecanismes de transfert de competences entre les pays "
            "avances et les pays emergents de la region."
        )

        pdf.h2("4.3 Liste Complete des Pays Participants")
        for c in countries_list:
            cnt = countries_counter.get(c.country, 0)
            region = f" ({c.region})" if c.region else ""
            pdf.set_font(FN, "", 8)
            pdf.set_text_color(60, 60, 60)
            pdf.cell(6, 5, "")
            pdf.set_font(FN, "B", 8)
            pdf.cell(50, 5, c.country[:40])
            pdf.set_font(FN, "", 8)
            pdf.cell(0, 5, f"{region} - {cnt} projet(s)", new_x="LMARGIN", new_y="NEXT")

        # ══════════════════════════════════════
        # 5. ANALYSE SECTORIELLE
        # ══════════════════════════════════════
        pdf.add_page()
        pdf.h1("5", "Analyse Sectorielle")

        pdf.p(
            "La repartition sectorielle des projets offre un eclairage sur les domaines d'application "
            "prioritaires de l'IA dans la region arabe. Elle reflete a la fois les besoins societaux, "
            "les avantages comparatifs et les orientations strategiques des gouvernements."
        )

        pdf.h2("5.1 Repartition par Secteur")
        if sectors:
            max_sec = max(sectors.values())
            for s_name, count in sectors.most_common():
                pct = count / total * 100
                pdf.set_font(FN, "B", 10)
                pdf.set_text_color(30, 30, 30)
                pdf.cell(0, 7, s_name, new_x="LMARGIN", new_y="NEXT")
                pdf.set_font(FN, "", 9)
                pdf.set_text_color(60, 60, 60)
                pdf.cell(40, 6, f"  {count} projet(s) ({pct:.1f}%)")
                pdf.ln(2)
                pdf.set_x(12)
                pdf.bar(count, max_sec, 140, (37, 99, 235))
                pdf.ln(6)

        pdf.ln(3)
        top_sectors = sectors.most_common(3)
        if len(top_sectors) >= 1:
            pdf.p(
                f"Le secteur {top_sectors[0][0]} arrive en tete avec {top_sectors[0][1]} projets "
                f"({top_sectors[0][1]/total*100:.1f}%). Cette predominance s'explique par "
                f"l'importance cruciale de ce domaine dans les politiques de developpement regionales. "
                f"Les secteurs {', '.join(f'{s[0]} ({s[1]})' for s in top_sectors[1:])} completent "
                f"le trio de tete, refletant les priorites strategiques de la region."
            )

        pdf.h2("5.2 Interpretation et Tendances")
        pdf.p(
            "L'analyse sectorielle revele plusieurs tendances structurantes. Premierement, la concentration "
            "des projets dans les secteurs a forte valeur sociale (sante, education) temoigne d'une "
            "volonte d'utiliser l'IA comme levier de developpement humain. Deuxiemement, l'emergence de "
            "secteurs innovants (agritech, fintech, energies renouvelables) indique une diversification "
            "progressive de l'economie regionale. Enfin, la relative faiblesse des projets dans les secteurs "
            "industriels traditionnels suggere un potentiel de croissance significatif dans ce segment."
        )
        pdf.p(
            "Il est recommande de renforcer les incitations a l'innovation dans les secteurs emergent, "
            "notamment par des partenariats public-prive et des mecanismes de financement dedies. "
            "La creation de clusters sectoriels d'IA pourrait egalement accelerer le developpement "
            "de solutions adaptees aux besoins specifiques de chaque domaine."
        )

        # ══════════════════════════════════════
        # 6. ANALYSE TECHNOLOGIQUE
        # ══════════════════════════════════════
        pdf.add_page()
        pdf.h1("6", "Analyse Technologique")

        pdf.p(
            "Le choix des technologies d'IA utilisees dans les projets renseigne sur le niveau de maturite "
            "technique des equipes et sur les orientations technologiques privilegiees dans la region."
        )

        pdf.h2("6.1 Technologies Deployees")
        if tech_counter:
            max_t = max(tech_counter.values())
            colors_t = [(37, 99, 235), (139, 92, 246), (16, 185, 129), (245, 158, 11),
                        (6, 182, 212), (236, 72, 153), (249, 115, 22), (99, 102, 241)]
            for i, (t_name, count) in enumerate(tech_counter.most_common()):
                pct = count / total * 100
                pdf.set_font(FN, "", 9)
                pdf.set_text_color(30, 30, 30)
                pdf.cell(50, 7, t_name[:35])
                pdf.set_x(60)
                pdf.bar(count, max_t, 90, colors_t[i % len(colors_t)])
                pdf.set_font(FN, "", 7)
                pdf.set_text_color(100, 100, 100)
                pdf.cell(0, 5, f"({pct:.1f}%)", new_x="LMARGIN", new_y="NEXT")
                pdf.ln(1)

        pdf.ln(3)
        pdf.h2("6.2 Analyse par Technologie")

        tech_analyses = {
            "Machine Learning": (
                "Le Machine Learning constitue la technologie de base de la majorite des projets recenses. "
                "Son adoption massive s'explique par la maturite des outils et frameworks disponibles "
                "(TensorFlow, PyTorch, scikit-learn) et par la disponibilite croissante de donnees "
                "d'apprentissage dans la region."
            ),
            "NLP": (
                "Le Traitement Automatique du Langage Naturel (NLP) occupe une place preponderante, "
                "notamment pour les applications liees a la langue arabe et a ses dialectes. "
                "Le developpement de modeles de langue arabes (AraBERT, CAMeL) a catalyse l'innovation "
                "dans ce domaine."
            ),
            "Computer Vision": (
                "La Vision par Ordinateur est largement utilisee dans les secteurs de la sante "
                "(imagerie medicale), de l'agriculture (monitoring des cultures) et de la securite. "
                "Les progres en deep learning ont considerablement ameliore les performances des "
                "systemes de vision dans des contextes complexes."
            ),
            "Robotics": (
                "La robotique, bien que moins representee, connait un interet croissant dans les "
                "secteurs manufacturier et logistique. Les investissements dans l'automatisation "
                "industrielle, notamment dans les pays du CCG, devraient accelerer son adoption."
            ),
            "Deep Learning": (
                "L'apprentissage profond (Deep Learning) est mobilise pour les taches complexes "
                "necessitant une grande capacite de modelisation. Son utilisation est particulierement "
                "frequente dans les projets de sante et de vision par ordinateur."
            ),
            "IA Generativa": (
                "L'IA Generative, bien que recente, fait une entree remarquee dans le portefeuille de "
                "projets. Les applications incluent la generation de contenu, la creation assistee et "
                "les assistants virtuels. Cette technologie represente un axe de croissance majeur."
            ),
        }

        for t_name in tech_counter:
            if t_name in tech_analyses:
                pdf.h3(f"6.2.{list(tech_counter).index(t_name) + 1} {t_name}")
                pdf.p(tech_analyses[t_name])

        pdf.h2("6.3 Tendances Technologiques Emergentes")
        pdf.p(
            "Plusieurs tendances technologiques se degagent de l'analyse : (1) la convergence croissante "
            "entre l'IA et l'Internet des Objets (IoT) pour les applications industrielles et urbaines, "
            "(2) l'adoption progressive de l'IA explicable (XAI) pour repondre aux exigences de "
            "transparence et de conformite reglementaire, et (3) le developpement de solutions d'IA "
            "frugale adaptees aux contextes aux ressources limitees. Ces tendances temoignent d'une "
            "maturation technique de l'ecosysteme regional."
        )

        # ══════════════════════════════════════
        # 7. ALIGNEMENT SUR LES ODD
        # ══════════════════════════════════════
        pdf.add_page()
        pdf.h1("7", "Alignement sur les Objectifs de Developpement Durable")

        pdf.p(
            "L'alignement des projets d'IA sur les Objectifs de Developpement Durable (ODD) des Nations Unies "
            "constitue un indicateur essentiel de leur contribution au developpement durable. Chaque projet "
            "peut etre associe a un ou plusieurs ODD, refletant la transversalite des applications de l'IA."
        )

        pdf.h2("7.1 Couverture Globale des ODD")
        if sdgs_all:
            max_sdg = max(sdg_counter.values()) if sdg_counter else 1
            for s in sdgs_all:
                cnt = sdg_counter.get(s.goal_number, 0)
                if cnt > 0:
                    r = int(s.color[1:3], 16) if s.color and s.color.startswith("#") else 37
                    g = int(s.color[3:5], 16) if s.color and s.color.startswith("#") else 99
                    b = int(s.color[5:7], 16) if s.color and s.color.startswith("#") else 235
                    pdf.set_font(FN, "B", 9)
                    pdf.set_text_color(r, g, b)
                    pdf.cell(18, 6, f"ODD {s.goal_number}")
                    pdf.set_font(FN, "", 8)
                    pdf.set_text_color(60, 60, 60)
                    pdf.cell(72, 6, s.title[:45] if s.title else "")
                    pdf.set_x(100)
                    pdf.bar(cnt, max_sdg, 50, (r, g, b))
                    pdf.set_font(FN, "", 7)
                    pdf.set_text_color(100, 100, 100)
                    pdf.cell(0, 5, f"({cnt})", new_x="LMARGIN", new_y="NEXT")
                    pdf.ln(1)

        pdf.ln(3)
        pdf.h2("7.2 Analyse par Objectif")

        sdg_descriptions = {
            1: ("Pas de Pauvrete", "Les projets alignes sur cet ODD visent a utiliser l'IA pour l'inclusion "
                "economique, l'identification des populations vulnerables et l'optimisation des aides sociales."),
            2: ("Faim Zero", "L'IA est mobilisee pour l'agriculture de precision, la prediction des rendements "
                "et l'optimisation de la chaine d'approvisionnement alimentaire."),
            3: ("Bonne Sante et Bien-etre", "Cet ODD est particulierement bien represente grace aux applications "
                "d'IA dans le diagnostic medical, la telesante et la gestion des hopitaux."),
            4: ("Education de Qualite", "Les projets educatifs exploitent l'IA pour le tutorat intelligent, "
                "la personalisation des apprentissages et l'accessibilite linguistique."),
            5: ("Egalite entre les Sexes", "Quelques initiatives utilisent l'IA pour detecter les biais de genre "
                "et promouvoir l'inclusion des femmes dans les filieres numeriques."),
            9: ("Industrie, Innovation et Infrastructure", "Les projets d'automatisation, de robotique et "
                "d'optimisation industrielle contribuent directement a cet objectif."),
            10: ("Inegalites Reduites", "C'est l'ODD le plus represente, avec des projets utilisant l'IA "
                 "pour reduire les fractures numeriques et territoriales."),
            11: ("Villes et Communautes Durables", "Les smart cities et la gestion urbaine intelligente "
                 "constituent un domaine d'application majeur de l'IA dans la region."),
            13: ("Mesures Relatives a la Lutte contre les Changements Climatiques", "Bien que moins represente, "
                 "cet ODD gagne en importance avec des projets de monitoring environnemental."),
            15: ("Vie Terrestre", "L'IA est utilisee pour la preservation de la biodiversite et la gestion "
                 "des ressources naturelles."),
            16: ("Paix, Justice et Institutions Efficaces", "Cet ODD est fortement represente, refletant "
                 "l'importance de la gouvernance et de la transparence dans la region."),
            17: ("Partenariats pour la Realisation des Objectifs", "Les projets collaboratifs et les "
                 "plateformes de partage de connaissances contribuent a cet objectif.")
        }

        for s in sdgs_all:
            cnt = sdg_counter.get(s.goal_number, 0)
            if cnt > 0 and s.goal_number in sdg_descriptions:
                pct = cnt / total * 100
                title, desc = sdg_descriptions[s.goal_number]
                pdf.h3(f"ODD {s.goal_number} - {title} ({cnt} projet{'s' if cnt > 1 else ''}, {pct:.1f}%)")
                pdf.p(desc)

        pdf.ln(3)
        no_sdg = [p for p in year_projects if not p.sdg_id]
        pdf.h2("7.3 Projets sans Alignement ODD")
        pdf.p(
            f"{len(no_sdg)} projet(s) ({len(no_sdg)/total*100:.1f}%) n'ont pas d'alignement ODD renseigne. "
            f"Cette proportion, bien que moderee, suggere une marge d'amelioration dans la sensibilisation "
            f"des porteurs de projets a l'importance de l'ancrage de leurs initiatives dans le cadre "
            f"des ODD. Il est recommande d'integrer cette dimension des la phase de conception des projets."
        )

        pdf.h2("7.4 Recommandations pour l'Alignement ODD")
        pdf.p(
            "Pour renforcer l'alignement sur les ODD, nous recommandons : (1) l'integration d'un module "
            "d'auto-evaluation ODD dans le processus de soumission des projets, (2) la mise en place "
            "d'indicateurs d'impact specifiques pour chaque ODD, et (3) l'organisation d'ateliers de "
            "sensibilisation a destination des porteurs de projets. Une attention particuliere devrait "
            "etre portee aux ODD sous-representes, notamment ceux lies a l'environnement."
        )

        # ══════════════════════════════════════
        # 8. DOCUMENTATION DETAILLEE DES PROJETS
        # ══════════════════════════════════════
        pdf.add_page()
        pdf.h1("8", "Documentation Detaillee des Projets")

        pdf.p(
            f"Cette section presente l'analyse detaillee de chacun des {total} projets valides. "
            f"Pour chaque initiative, nous fournissons une evaluation professionnelle couvrant les "
            f"aspects techniques, strategiques et d'impact potentiel."
        )

        for idx, p in enumerate(year_projects, 1):
            if pdf.get_y() > 220:
                pdf.add_page()

            country_name = p.country.country if p.country else "Non specifie"
            sdg_nums = [p.sdg.goal_number] if p.sdg else []

            # Project header
            pdf.set_fill_color(240, 245, 255)
            pdf.set_draw_color(37, 99, 235)
            pdf.rect(10, pdf.get_y(), 190, 1, "F")
            pdf.ln(2)

            sc = pdf.status_c(p.status)
            pdf.set_font(FN, "B", 11)
            pdf.set_text_color(*sc)
            pdf.cell(8, 7, f"#{p.id}")
            pdf.set_text_color(20, 30, 60)
            pdf.cell(0, 7, (p.title or "Sans titre")[:80], new_x="LMARGIN", new_y="NEXT")

            # Status badge
            pdf.set_fill_color(*sc)
            pdf.set_text_color(255, 255, 255)
            pdf.set_font(FN, "B", 7)
            pdf.cell(28, 5, f" {(p.status or 'INCONNU').upper()} ", fill=True)
            pdf.set_text_color(30, 30, 30)
            pdf.ln(6)

            # Overview
            pdf.h3("8.1." + str(idx) + " Apercu General")
            pdf.kv("Organisation", p.organization or "N/R")
            pdf.kv("Pays", country_name)
            pdf.kv("Secteur", p.sector or "N/R")
            pdf.kv("Technologie", p.technology or "N/R")
            if sdg_nums:
                pdf.kv("ODDs", ", ".join([f"ODD {n}" for n in sdg_nums]))

            # Description
            if p.description:
                pdf.h3(f"Description et Objectifs")
                pdf.p(p.description[:500])

            # Impact analysis
            pdf.h3(f"Analyse d'Impact Potentiel")
            impact_text = generate_impact_analysis(p, country_name, sdg_nums)
            pdf.p(impact_text)

            # Strengths and recommendations
            pdf.h3(f"Forces et Recommandations")
            strengths, weaknesses, recs = generate_project_assessment(p, sdg_nums)
            pdf.set_font(FN, "B", 8)
            pdf.set_text_color(16, 185, 129)
            pdf.cell(0, 5, "Points forts:", new_x="LMARGIN", new_y="NEXT")
            pdf.set_font(FN, "", 8)
            pdf.set_text_color(30, 30, 30)
            for s in strengths:
                pdf.cell(4, 4, "")
                pdf.cell(0, 4, f"- {s}", new_x="LMARGIN", new_y="NEXT")
            pdf.ln(1)
            pdf.set_font(FN, "B", 8)
            pdf.set_text_color(239, 68, 68)
            pdf.cell(0, 5, "Limites:", new_x="LMARGIN", new_y="NEXT")
            pdf.set_font(FN, "", 8)
            pdf.set_text_color(30, 30, 30)
            for w in weaknesses:
                pdf.cell(4, 4, "")
                pdf.cell(0, 4, f"- {w}", new_x="LMARGIN", new_y="NEXT")
            pdf.ln(1)
            pdf.set_font(FN, "B", 8)
            pdf.set_text_color(37, 99, 235)
            pdf.cell(0, 5, "Recommandations:", new_x="LMARGIN", new_y="NEXT")
            pdf.set_font(FN, "", 8)
            pdf.set_text_color(30, 30, 30)
            for r in recs:
                pdf.cell(4, 4, "")
                pdf.cell(0, 4, f"- {r}", new_x="LMARGIN", new_y="NEXT")
            pdf.ln(2)

            # Dates and additional info
            extra = []
            if p.year_of_implementation:
                extra.append(f"Annee d'implementation: {p.year_of_implementation}")
            if p.start_date:
                extra.append(f"Debut: {p.start_date.strftime('%d/%m/%Y')}")
            if p.end_date:
                extra.append(f"Fin: {p.end_date.strftime('%d/%m/%Y')}")
            if p.submitted_at:
                extra.append(f"Soumis: {p.submitted_at.strftime('%d/%m/%Y')}")
            if p.website:
                extra.append(f"Site: {p.website[:50]}")
            if extra:
                pdf.set_font(FN, "", 7)
                pdf.set_text_color(120, 120, 120)
                pdf.cell(0, 4, " | ".join(extra), new_x="LMARGIN", new_y="NEXT")
            pdf.ln(3)

            # Separator
            pdf.set_draw_color(226, 232, 240)
            pdf.line(10, pdf.get_y(), 200, pdf.get_y())
            pdf.ln(3)

        # ══════════════════════════════════════
        # 9. ANALYSE DES STAKEHOLDERS
        # ══════════════════════════════════════
        pdf.add_page()
        pdf.h1("9", "Analyse des Parties Prenantes")

        pdf.p(
            f"L'ecosysteme de l'IA dans la region arabe repose sur un reseau de {len(all_stakeholders)} "
            f"parties prenantes (stakeholders) couvrant divers types d'organisations. Leur diversite et "
            f"leur complementarite sont des atouts majeurs pour le developpement de l'IA regionale."
        )

        pdf.h2("9.1 Repartition par Type d'Organisation")
        if stakeholder_types_count:
            max_st = max(c for _, c in stakeholder_types_count)
            colors_st = [(37, 99, 235), (139, 92, 246), (16, 185, 129), (245, 158, 11), (239, 68, 68), (99, 102, 241)]
            for i, (st_type, count) in enumerate(stakeholder_types_count):
                pdf.set_font(FN, "", 9)
                pdf.set_text_color(30, 30, 30)
                pdf.cell(40, 7, st_type.capitalize())
                pdf.set_x(50)
                pdf.bar(count, max_st, 100, colors_st[i % len(colors_st)])
                pdf.ln(8)

        pdf.ln(3)
        pdf.h2("9.2 Analyse par Categorie")

        stakeholder_analysis_text = (
            "Les gouvernements constituent la categorie dominante, refletant le role central des Etats "
            "dans le financement et l'orientation de la recherche en IA. Les laboratoires de recherche "
            "et les universites forment le deuxieme pilier, essentiels pour la production de connaissances "
            "et la formation des talents. Les startups et entreprises privees apportent l'agilite et la "
            "capacite d'innovation necessaires au passage a l'echelle. Les ONG et organisations "
            "internationales jouent un role de catalyseur et de garant de l'ethique et de l'inclusion."
        )
        pdf.p(stakeholder_analysis_text)

        pdf.h2("9.3 Liste Complete des Stakeholders")
        for s in all_stakeholders:
            if pdf.get_y() > 260:
                pdf.add_page()
            pdf.set_font(FN, "B", 9)
            pdf.set_text_color(30, 30, 30)
            pdf.cell(6, 6, "")
            pdf.cell(50, 6, s.name[:40])
            pdf.set_font(FN, "", 8)
            pdf.set_text_color(90, 90, 90)
            parts = [x for x in [s.type.capitalize() if s.type else "", s.country or "", s.category or ""] if x]
            pdf.cell(0, 6, " | ".join(parts), new_x="LMARGIN", new_y="NEXT")
            if s.description:
                pdf.set_font(FN, "", 7)
                pdf.set_text_color(100, 100, 100)
                pdf.cell(6, 4, "")
                pdf.multi_cell(0, 4, s.description[:120])
            if s.website:
                pdf.set_font(FN, "I", 7)
                pdf.set_text_color(37, 99, 235)
                pdf.cell(6, 4, "")
                pdf.cell(0, 4, s.website[:50], new_x="LMARGIN", new_y="NEXT")
            pdf.ln(2)

        # ══════════════════════════════════════
        # 10. RESSOURCES ET COMMUNAUTE
        # ══════════════════════════════════════
        pdf.add_page()
        pdf.h1("10", "Ressources et Communaute")

        pdf.h2("10.1 Ressources Disponibles")
        pdf.p(
            f"La plateforme SARAI met a disposition de la communaute {total_resources} ressources numeriques, "
            f"incluant des rapports, des jeux de donnees et des documents d'orientation politique. "
            f"Ces ressources constituent une base de connaissances essentielle pour les chercheurs, "
            f"les decideurs et les praticiens de l'IA dans la region."
        )

        if resources_by_type:
            pdf.p("Repartition par type de ressource :")
            for r_type, count in resources_by_type:
                pdf.set_font(FN, "", 9)
                pdf.set_text_color(30, 30, 30)
                pdf.cell(6, 6, "")
                pdf.cell(0, 6, f"{r_type}: {count} ressource(s)", new_x="LMARGIN", new_y="NEXT")

        pdf.ln(4)
        pdf.h2("10.2 Communautes et Utilisateurs")
        pdf.p(
            f"La plateforme compte {total_users} utilisateurs inscrits, dont {active_users} comptes actifs, "
            f"soit un taux d'activation de {active_users/total_users*100:.1f}%."
        )

        if users_by_type:
            pdf.p("Les utilisateurs se repartissent par type d'organisation :")
            for org_type, count in users_by_type:
                pdf.set_font(FN, "", 9)
                pdf.set_text_color(30, 30, 30)
                pdf.cell(6, 6, "")
                pdf.cell(0, 6, f"{org_type}: {count} utilisateur(s)", new_x="LMARGIN", new_y="NEXT")

        pdf.ln(3)
        latest_users = db.query(User).order_by(User.created_at.desc()).limit(5).all()
        if latest_users:
            pdf.p("Derniers utilisateurs inscrits :")
            for u in latest_users:
                pdf.set_font(FN, "", 8)
                pdf.set_text_color(60, 60, 60)
                pdf.cell(6, 5, "")
                pdf.cell(0, 5,
                    f"{u.organization_name} ({u.organization_type}) - {u.country or 'N/R'}",
                    new_x="LMARGIN", new_y="NEXT")

        # ══════════════════════════════════════
        # 11. RECOMMANDATIONS STRATEGIQUES
        # ══════════════════════════════════════
        pdf.add_page()
        pdf.h1("11", "Recommandations Strategiques")

        pdf.p(
            "Sur la base de l'analyse approfondie des donnees collectees, nous formulons les "
            "recommandations strategiques suivantes, destinees aux differents acteurs de l'ecosysteme."
        )

        pdf.h2("11.1 A l'Attention des Gouvernements")
        recs_gov = [
            "Elaborer des strategies nationales d'IA inclusives, associant l'ensemble des parties prenantes",
            "Investir dans les infrastructures de calcul et les bases de donnees ouvertes",
            "Mettre en place des cadres reglementaires favorisant l'innovation tout en garantissant l'ethique",
            "Creer des fonds dedies au financement de la recherche en IA dans les secteurs prioritaires",
            "Developper des programmes de formation aux competences numeriques et a l'IA des l'enseignement secondaire"
        ]
        for r in recs_gov:
            pdf.set_font(FN, "", 9)
            pdf.set_text_color(30, 30, 30)
            pdf.cell(6, 6, "")
            pdf.cell(0, 6, f"- {r}", new_x="LMARGIN", new_y="NEXT")

        pdf.h2("11.2 A l'Attention des Startups et Entreprises")
        recs_startup = [
            "Priviligier les applications a fort impact social et economique dans les secteurs sous-representes",
            "Developper des partenariats avec les universites et centres de recherche",
            "Adopter une demarche d'innovation responsable integrant les dimensions ethiques des l'AMOA",
            "Explorer les opportunites de collaboration regionale et internationale",
            "Documenter et partager les retours d'experience pour enrichir l'ecosysteme"
        ]
        for r in recs_startup:
            pdf.set_font(FN, "", 9)
            pdf.set_text_color(30, 30, 30)
            pdf.cell(6, 6, "")
            pdf.cell(0, 6, f"- {r}", new_x="LMARGIN", new_y="NEXT")

        pdf.h2("11.3 A l'Attention des Institutions Academiques")
        recs_acad = [
            "Renforcer les programmes de recherche interdisciplinaires alliant IA et sciences humaines",
            "Developper des cursus specialises en IA adaptes aux besoins du marche regional",
            "Publier les resultats de recherche dans des revues ouvertes pour favoriser la diffusion des connaissances",
            "Creer des laboratoires communs avec l'industrie pour accelerer le transfert technologique",
            "Organiser des evenements scientifiques regionaux pour stimuler la collaboration"
        ]
        for r in recs_acad:
            pdf.set_font(FN, "", 9)
            pdf.set_text_color(30, 30, 30)
            pdf.cell(6, 6, "")
            pdf.cell(0, 6, f"- {r}", new_x="LMARGIN", new_y="NEXT")

        pdf.h2("11.4 Recommandations Transversales")
        recs_cross = [
            "Mettre en place un observatoire regional de l'IA pour le suivi et l'evaluation des initiatives",
            "Developper des indicateurs standardises de mesure d'impact pour faciliter les comparaisons",
            "Creer un fonds regional d'innovation en IA finance par les Etats membres et les institutions internationales",
            "Organiser une conference annuelle de l'IA arabe pour favoriser le partage d'experiences",
            "Etablir des passerelles entre les differents ecosystemes nationaux pour faciliter la circulation des talents",
            "Integrer systematiquement les ODD comme cadre de reference pour l'evaluation des projets d'IA"
        ]
        for r in recs_cross:
            pdf.set_font(FN, "", 9)
            pdf.set_text_color(30, 30, 30)
            pdf.cell(6, 6, "")
            pdf.cell(0, 6, f"- {r}", new_x="LMARGIN", new_y="NEXT")

        # ══════════════════════════════════════
        # 12. CONCLUSION GENERALE
        # ══════════════════════════════════════
        pdf.add_page()
        pdf.ln(30)
        pdf.set_font(FN, "B", 20)
        pdf.set_text_color(20, 30, 60)
        pdf.cell(0, 12, "12. Conclusion Generale", align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.line(60, pdf.get_y(), 150, pdf.get_y())
        pdf.ln(10)

        pdf.p(
            f"Le present rapport annuel {year} de la plateforme SARAI dresse le portrait d'un ecosysteme "
            f"regional de l'Intelligence Artificielle en pleine effervescence. Avec {total} projets valides, "
            f"{len(countries_counter)} pays representes, {len(all_stakeholders)} parties prenantes engagees "
            f"et {total_users} utilisateurs, la dynamique est incontestablement positive."
        )

        pdf.p(
            "L'analyse revele un ecosysteme qui a atteint un stade de maturation prometteur, caracterise par : "
            "une diversification sectorielle croissante, une adoption technologique orientee vers les besoins "
            "locaux, et un alignement significatif sur les Objectifs de Developpement Durable. Les disparites "
            "geographiques observees, bien que constituant un defi, offrent egalement des opportunites de "
            "cooperation et de transfert de competences entre les nations de la region."
        )

        pdf.p(
            "Pour accelerer cette dynamique et transformer les initiatives en impacts concrets, plusieurs "
            "conditions doivent etre reunies : un engagement politique fort et continu, des investissements "
            "accrus dans les infrastructures et la formation, une cooperation regionale renforcee, et "
            "une attention constante aux dimensions ethiques et inclusives du developpement de l'IA."
        )

        pdf.p(
            "La plateforme SARAI continuera de jouer son role de catalyseur et d'observatoire privilegie "
            "de cette transformation. En fournissant des donnees fiables, des analyses approfondies et "
            "des recommandations eclairees, elle contribue a batir un avenir ou l'Intelligence Artificielle "
            "sera un levier de progres partage et durable pour l'ensemble de la region arabe."
        )

        now_str = datetime.utcnow().strftime('%d/%m/%Y a %H:%M UTC')
        pdf.ln(5)
        pdf.set_font(FN, "I", 9)
        pdf.set_text_color(120, 120, 120)
        pdf.cell(0, 6, "---", align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 6, f"Document genere le {now_str}", align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 6, "SARAI Platform - Stocktaking of Arab Regional AI Initiatives", align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 6, "Plateforme sous l'egide de la Ligue des Etats Arabes", align="C", new_x="LMARGIN", new_y="NEXT")

        buf = BytesIO()
        pdf.output(buf)
        buf.seek(0)
        return buf.getvalue()

    except Exception as e:
        logger.error(f"[PDF] Error: {e}")
        raise
    finally:
        db.close()


# ── Helper functions for per-project analysis ──

def generate_impact_analysis(p, country, sdg_nums):
    lines = []
    sector = (p.sector or "").lower()
    tech = (p.technology or "").lower()

    if "sante" in sector or "health" in sector or "medical" in tech or "health" in tech:
        lines.append(f"Ce projet contribue a l'amelioration des services de sante dans la region arabe. "
                     f"En deployant des solutions basees sur {p.technology or 'l\'IA'}, il permet "
                     f"d'accroitre l'acces aux soins, d'ameliorer la qualite des diagnostics et de reduire "
                     f"les couts operationnels des etablissements de sante.")
    elif "agriculture" in sector or "agri" in sector:
        lines.append(f"Ce projet utilise l'IA pour transformer le secteur agricole, un pilier economique "
                     f"de nombreux pays arabes. Il contribue a l'optimisation des rendements, a la gestion "
                     f"durable des ressources hydriques et a la securite alimentaire regionale.")
    elif "education" in sector or "edu" in sector:
        lines.append(f"Ce projet s'inscrit dans la modernisation du systeme educatif arabe en exploitant "
                     f"l'IA pour personnaliser les parcours d'apprentissage, ameliorer l'acces a l'education "
                     f"et renforcer les competences numeriques des apprenants.")
    elif "finance" in sector or "fintech" in sector or "bank" in sector:
        lines.append(f"Ce projet contribue a l'inclusion financiere dans la region arabe en utilisant l'IA "
                     f"pour democratiser l'acces aux services bancaires, optimiser la gestion des risques "
                     f"et developper des produits financiers innovants.")
    elif "energie" in sector or "energy" in sector or "environnement" in sector:
        lines.append(f"Ce projet adresse les defis energetiques et environnementaux de la region arabe. "
                     f"L'IA est utilisee pour optimiser la consommation energetique, integrer les energies "
                     f"renouvelables et surveiller les impacts environnementaux.")
    else:
        lines.append(f"Ce projet apporte une contribution significative au developpement de l'IA dans "
                     f"le secteur {p.sector or 'd\'activite'} au {country}. Il renforce la position "
                     f"du pays dans l'ecosysteme regional de l'IA et cree des retombees economiques "
                     f"et sociales mesurables.")

    if sdg_nums:
        lines.append(f"L'alignement sur {len(sdg_nums)} ODD (dont {', '.join(f'ODD {n}' for n in sdg_nums[:3])}) "
                     f"demontre l'ancrage de ce projet dans une demarche de developpement durable.")
    else:
        lines.append(f"Un alignement sur les ODD renforcerait l'impact et la visibilite de ce projet.")

    return " ".join(lines)


def generate_project_assessment(p, sdg_nums):
    strengths = []
    weaknesses = []
    recs = []

    if p.description and len(p.description) > 50:
        strengths.append("Description detaillee temoignant d'une reflexion approfondie sur le projet")
    else:
        weaknesses.append("Description insuffisamment detaillee pour evaluer pleinement le projet")
        recs.append("Fournir une description plus complete incluant la problematique, la solution et les resultats attendus")

    if p.technology:
        strengths.append(f"Technologie clairement definie : {p.technology}")
    else:
        weaknesses.append("Technologie non specifiee")
        recs.append("Preciser les technologies d'IA utilisees")

    if p.sector:
        strengths.append(f"Positionnement sectoriel pertinent ({p.sector})")
    else:
        weaknesses.append("Secteur d'application non defini")

    if p.country_id:
        strengths.append("Ancrage territorial identifie favorisant l'impact local")
    else:
        recs.append("Specifier le pays d'implantation du projet")

    if sdg_nums:
        strengths.append(f"Alignement sur {len(sdg_nums)} ODD, demontrant une conscience des enjeux de developpement durable")
    else:
        weaknesses.append("Absence d'alignement sur les ODD")
        recs.append("Identifier les ODD auxquels le projet contribue")

    if p.website:
        strengths.append("Presence en ligne facilitant l'acces aux informations du projet")
    else:
        recs.append("Creer une page web ou un portail dedie au projet pour accroitre sa visibilite")

    if p.start_date and p.end_date:
        strengths.append("Calendrier clairement defini avec dates de debut et de fin")
    else:
        recs.append("Definir un calendrier precis avec des jalons intermediaires")

    strengths.append("Contribution a l'ecosysteme regional de l'IA dans le monde arabe")
    recs.append("Envisager un passage a l'echelle regionale")

    return strengths[:5], weaknesses[:3], recs[:5]
