from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

# ── Color palette ──
DARK_BLUE   = RGBColor(0x0B, 0x1D, 0x51)
MED_BLUE    = RGBColor(0x1A, 0x3C, 0x8A)
ACCENT_BLUE = RGBColor(0x00, 0x6D, 0xC6)
LIGHT_BLUE  = RGBColor(0xD6, 0xE8, 0xF7)
WHITE       = RGBColor(0xFF, 0xFF, 0xFF)
GOLD        = RGBColor(0xD4, 0xA8, 0x3C)
DARK_GRAY   = RGBColor(0x2D, 0x2D, 0x2D)
LIGHT_GRAY  = RGBColor(0xF0, 0xF0, 0xF0)
GREEN      = RGBColor(0x10, 0xB9, 0x81)
ORANGE     = RGBColor(0xF5, 0x9E, 0x0B)
RED        = RGBColor(0xE7, 0x4C, 0x3C)

def add_bg(slide, color=DARK_BLUE):
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = color

def add_shape_bg(slide, color, left=0, top=0, width=None, height=None):
    w = width or prs.slide_width
    h = height or prs.slide_height
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, w, h)
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()
    return shape

def add_accent_bar(slide, left, top, width, height, color=GOLD):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()
    return shape

def add_text_box(slide, left, top, width, height, text, font_size=18, color=WHITE, bold=False, alignment=PP_ALIGN.LEFT, font_name='Calibri'):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(font_size)
    p.font.color.rgb = color
    p.font.bold = bold
    p.font.name = font_name
    p.alignment = alignment
    return txBox

def add_multiline_text(slide, left, top, width, height, lines, font_size=16, color=WHITE, bold_first=False, font_name='Calibri', line_spacing=1.5):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    for i, line in enumerate(lines):
        if i == 0:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()
        p.text = line
        p.font.size = Pt(font_size)
        p.font.color.rgb = color
        p.font.name = font_name
        p.space_after = Pt(font_size * 0.4)
        if bold_first and i == 0:
            p.font.bold = True
    return txBox

def add_bullet_text(slide, left, top, width, height, items, font_size=15, color=WHITE, font_name='Calibri'):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    for i, item in enumerate(items):
        if i == 0:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()
        p.text = f"  \u2022  {item}"
        p.font.size = Pt(font_size)
        p.font.color.rgb = color
        p.font.name = font_name
        p.space_after = Pt(6)
    return txBox

def add_icon_card(slide, left, top, width, height, icon_text, title, desc, bg_color=RGBColor(0x14, 0x2D, 0x6E)):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = bg_color
    shape.line.fill.background()
    # Icon circle
    circle = slide.shapes.add_shape(MSO_SHAPE.OVAL, left + width//2 - Inches(0.3), top + Inches(0.15), Inches(0.6), Inches(0.6))
    circle.fill.solid()
    circle.fill.fore_color.rgb = GOLD
    circle.line.fill.background()
    tf = circle.text_frame
    tf.word_wrap = False
    p = tf.paragraphs[0]
    p.text = icon_text
    p.font.size = Pt(14)
    p.font.color.rgb = DARK_BLUE
    p.font.bold = True
    p.alignment = PP_ALIGN.CENTER
    tf.paragraphs[0].space_before = Pt(2)
    # Title
    add_text_box(slide, left + Inches(0.15), top + Inches(0.85), width - Inches(0.3), Inches(0.5),
                 title, font_size=13, color=GOLD, bold=True, alignment=PP_ALIGN.CENTER)
    # Desc
    add_text_box(slide, left + Inches(0.1), top + Inches(1.3), width - Inches(0.2), Inches(1.5),
                 desc, font_size=10, color=WHITE, alignment=PP_ALIGN.CENTER)

def add_section_number(slide, number, text, left, top):
    circle = slide.shapes.add_shape(MSO_SHAPE.OVAL, left, top, Inches(0.5), Inches(0.5))
    circle.fill.solid()
    circle.fill.fore_color.rgb = GOLD
    circle.line.fill.background()
    tf = circle.text_frame
    p = tf.paragraphs[0]
    p.text = str(number)
    p.font.size = Pt(16)
    p.font.color.rgb = DARK_BLUE
    p.font.bold = True
    p.alignment = PP_ALIGN.CENTER
    tf.paragraphs[0].space_before = Pt(2)
    add_text_box(slide, left + Inches(0.65), top, Inches(10), Inches(0.5),
                 text, font_size=16, color=WHITE, bold=True)

# ════════════════════════════════════════════════════════
# SLIDE 1 — TITLE
# ════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])  # blank layout
add_bg(slide, DARK_BLUE)

# Accent shapes
add_shape_bg(slide, RGBColor(0x08, 0x15, 0x3E), left=Inches(0), top=Inches(0), width=prs.slide_width, height=Inches(7.5))
add_accent_bar(slide, Inches(0), Inches(2.8), Inches(0.12), Inches(2.2), GOLD)
add_accent_bar(slide, Inches(0), Inches(5.1), Inches(13.333), Inches(0.04), GOLD)

# Project type
add_text_box(slide, Inches(0.8), Inches(0.6), Inches(8), Inches(0.5),
             "Projet de Fin d'\u00c9tudes \u2014 Cycle d'Ing\u00e9nieur", font_size=14, color=GOLD, bold=True)

# Title
add_text_box(slide, Inches(0.8), Inches(1.3), Inches(11), Inches(1.2),
             "SARAI", font_size=54, color=WHITE, bold=True)
add_text_box(slide, Inches(0.8), Inches(2.3), Inches(11), Inches(0.8),
             "Stocktaking of Arab Regional AI Initiatives", font_size=28, color=LIGHT_BLUE)

# Subtitle
add_text_box(slide, Inches(0.8), Inches(3.4), Inches(11), Inches(0.8),
             "Plateforme Web de Recensement des Initiatives d'Intelligence Artificielle\ndans la R\u00e9gion Arabe",
             font_size=18, color=LIGHT_BLUE)

# Bottom info
add_text_box(slide, Inches(0.8), Inches(5.5), Inches(6), Inches(0.4),
             "Organisme d'accueil : AICTO (Arab ICT Organization)", font_size=14, color=WHITE)
add_text_box(slide, Inches(0.8), Inches(5.9), Inches(6), Inches(0.4),
             "Encadrant : [Nom de l'encadrant]", font_size=14, color=WHITE)
add_text_box(slide, Inches(0.8), Inches(6.3), Inches(6), Inches(0.4),
             "R\u00e9alis\u00e9 par : [Votre Nom]", font_size=14, color=WHITE)

add_text_box(slide, Inches(9), Inches(5.5), Inches(4), Inches(0.8),
             "Ann\u00e9e Universitaire\n2025/2026", font_size=14, color=GOLD, alignment=PP_ALIGN.RIGHT)

# ════════════════════════════════════════════════════════
# SLIDE 2 — PLAN
# ════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, DARK_BLUE)
add_accent_bar(slide, Inches(0), Inches(1.0), Inches(0.08), Inches(1.0), GOLD)

add_text_box(slide, Inches(0.6), Inches(0.3), Inches(8), Inches(0.6),
             "SOMMAIRE", font_size=32, color=WHITE, bold=True)

plan_items = [
    ("1", "Introduction G\u00e9n\u00e9rale"),
    ("2", "Pr\u00e9sentation de l'Organisme d'Accueil"),
    ("3", "Probl\u00e9matique & Analyse des Enjeux"),
    ("4", "\u00c9tude de l'Existant & Solution Propos\u00e9e"),
    ("5", "Besoins Fonctionnels & Non Fonctionnels"),
    ("6", "Technologies Utilis\u00e9es"),
]
for i, (num, label) in enumerate(plan_items):
    y = Inches(1.3) + Inches(i * 0.9)
    circle = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(0.8), y, Inches(0.55), Inches(0.55))
    circle.fill.solid()
    circle.fill.fore_color.rgb = GOLD if i == 0 else MED_BLUE
    circle.line.fill.background()
    tf = circle.text_frame
    p = tf.paragraphs[0]
    p.text = num
    p.font.size = Pt(18)
    p.font.color.rgb = DARK_BLUE if i == 0 else WHITE
    p.font.bold = True
    p.alignment = PP_ALIGN.CENTER
    tf.paragraphs[0].space_before = Pt(3)
    add_text_box(slide, Inches(1.6), y + Inches(0.05), Inches(8), Inches(0.5),
                 label, font_size=18, color=WHITE, bold=(i==0))

# ════════════════════════════════════════════════════════
# SLIDE 3 — INTRODUCTION GÉNÉRALE (1)
# ════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, DARK_BLUE)
add_accent_bar(slide, Inches(0), Inches(1.0), Inches(0.08), Inches(1.0), GOLD)

add_text_box(slide, Inches(0.6), Inches(0.3), Inches(10), Inches(0.6),
             "1. Introduction G\u00e9n\u00e9rale", font_size=28, color=WHITE, bold=True)

add_accent_bar(slide, Inches(0.6), Inches(0.9), Inches(4), Inches(0.04), GOLD)

lines_intro = [
    "L\u2019Intelligence Artificielle transforme aujourd\u2019hui l\u2019\u00e9conomie et la soci\u00e9t\u00e9 \u00e0 l\u2019\u00e9chelle plan\u00e9taire.",
    "Face \u00e0 cette r\u00e9volution, les pays de la r\u00e9gion arabe multiplient les initiatives et les investissements dans le domaine de l\u2019IA.",
    "Cependant, ces efforts restent dispers\u00e9s, manquant d\u2019une vision unifi\u00e9e et d\u2019un point de r\u00e9f\u00e9rence commun.",
    "Notre projet de fin d\u2019\u00e9tudes s\u2019inscrit dans cette dynamique en proposant une plateforme web d\u00e9di\u00e9e au recensement et \u00e0 la valorisation des initiatives IA dans le monde arabe."
]
add_multiline_text(slide, Inches(0.6), Inches(1.2), Inches(11.5), Inches(3.5),
                   lines_intro, font_size=17, color=WHITE)

# ════════════════════════════════════════════════════════
# SLIDE 4 — PRÉSENTATION AICTO
# ════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, DARK_BLUE)
add_accent_bar(slide, Inches(0), Inches(1.0), Inches(0.08), Inches(1.0), GOLD)

add_text_box(slide, Inches(0.6), Inches(0.3), Inches(10), Inches(0.6),
             "2. Pr\u00e9sentation de l'Organisme d'Accueil", font_size=28, color=WHITE, bold=True)
add_accent_bar(slide, Inches(0.6), Inches(0.9), Inches(4), Inches(0.04), GOLD)

# Left column - AICTO info
add_text_box(slide, Inches(0.6), Inches(1.2), Inches(5.5), Inches(0.5),
             "AICTO \u2014 Arab ICT Organization", font_size=22, color=GOLD, bold=True)

aicto_lines = [
    "Organisation intergouvernementale fond\u00e9e en 2001.",
    "Bas\u00e9e \u00e0 Tunis, relevant de la Ligue des \u00c9tats Arabes.",
    "Membre de l'ITU (Union Internationale des T\u00e9l\u00e9communications).",
    "R\u00f4le : Coordonner les politiques TIC et promouvoir l'innovation num\u00e9rique dans la r\u00e9gion arabe.",
    "Vision : Faire du monde arabe une \u00e9conomie num\u00e9rique comp\u00e9titive.",
    "Domaines cl\u00e9s : Gouvernance num\u00e9rique, Cybers\u00e9curit\u00e9, IA, Transformation digitale."
]
add_multiline_text(slide, Inches(0.6), Inches(1.8), Inches(5.5), Inches(3.5),
                   aicto_lines, font_size=14, color=WHITE)

# Right column - Carte + Chiffres
box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(7), Inches(1.3), Inches(5.8), Inches(5.5))
box.fill.solid()
box.fill.fore_color.rgb = RGBColor(0x14, 0x2D, 0x6E)
box.line.fill.background()

add_text_box(slide, Inches(7.3), Inches(1.5), Inches(5), Inches(0.4),
             "Chiffres Cl\u00e9s", font_size=18, color=GOLD, bold=True)

aicto_stats = [
    "22 \u00c9tats membres de la Ligue Arabe",
    "24 ans d'expertise en TIC r\u00e9gionales",
    "Partenariat avec l'ITU, l'UNESCO, l'ESCWA",
    "Strat\u00e9gie Arabe Commune pour l'IA adopt\u00e9e en 2023",
    "Si\u00e8ge : Tunis, Tunisie"
]
add_bullet_text(slide, Inches(7.3), Inches(2.0), Inches(5), Inches(2.5),
                aicto_stats, font_size=14, color=WHITE)

add_text_box(slide, Inches(7.3), Inches(4.5), Inches(5), Inches(0.4),
             "Lien avec le Projet", font_size=18, color=GOLD, bold=True)

aicto_link = [
    "SARAI est une initiative phare d'AICTO",
    "Objectif : cartographier l'\u00e9cosyst\u00e8me IA r\u00e9gional",
    "Cible : chercheurs, startups, gouvernements, ONG"
]
add_bullet_text(slide, Inches(7.3), Inches(5.0), Inches(5), Inches(2.0),
                aicto_link, font_size=13, color=WHITE)

# ════════════════════════════════════════════════════════
# SLIDE 5 — PROBLÉMATIQUE
# ════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, DARK_BLUE)
add_accent_bar(slide, Inches(0), Inches(1.0), Inches(0.08), Inches(1.0), GOLD)

add_text_box(slide, Inches(0.6), Inches(0.3), Inches(10), Inches(0.6),
             "3. Probl\u00e9matique & Analyse des Enjeux", font_size=28, color=WHITE, bold=True)
add_accent_bar(slide, Inches(0.6), Inches(0.9), Inches(4), Inches(0.04), GOLD)

# Problem statement
add_text_box(slide, Inches(0.6), Inches(1.2), Inches(12), Inches(0.5),
             "Constat : Les initiatives IA dans la r\u00e9gion arabe sont fragment\u00e9es et manquent de visibilit\u00e9 centralis\u00e9e.",
             font_size=18, color=GOLD, bold=True)

# 5 problem cards
problems = [
    ("1", "Absence de r\u00e9f\u00e9rentiel unique", "Pas de point d'acc\u00e8s central pour d\u00e9couvrir les projets, acteurs et ressources IA."),
    ("2", "Manque de coordination r\u00e9gionale", "Difficult\u00e9 d'aligner les initiatives nationales avec la strat\u00e9gie arabe commune pour l'IA."),
    ("3", "Visibilit\u00e9 insuffisante", "Startups et laboratoires de recherche peinent \u00e0 se faire conna\u00eetre et \u00e0 collaborer."),
    ("4", "Donn\u00e9es non structur\u00e9es", "Absence de m\u00e9canisme standardis\u00e9 de collecte et d'analyse des donn\u00e9es IA."),
    ("5", "G\u00e9olocalisation absente", "Impossible de visualiser la r\u00e9partition g\u00e9ographique de l'activit\u00e9 IA dans la r\u00e9gion."),
]

for i, (num, title, desc) in enumerate(problems):
    col = i % 3
    row = i // 3
    x = Inches(0.5) + col * Inches(4.2)
    y = Inches(1.9) + row * Inches(2.6)
    add_icon_card(slide, x, y, Inches(3.8), Inches(2.3),
                  num, title, desc, RGBColor(0x14, 0x2D, 0x6E) if i % 2 == 0 else RGBColor(0x0E, 0x22, 0x5A))

# Key question at bottom
q_bg = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(6.3), Inches(11.7), Inches(0.8))
q_bg.fill.solid()
q_bg.fill.fore_color.rgb = RGBColor(0x00, 0x6D, 0xC6)
q_bg.line.fill.background()
add_text_box(slide, Inches(1.0), Inches(6.4), Inches(11.3), Inches(0.6),
             "Question centrale : Comment cr\u00e9er une plateforme unique centralis\u00e9e pour recenser, documenter et promouvoir les initiatives IA dans les 22 pays arabes ?",
             font_size=15, color=WHITE, bold=True, alignment=PP_ALIGN.CENTER)

# ════════════════════════════════════════════════════════
# SLIDE 6 — ÉTUDE EXISTANT + SOLUTION
# ════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, DARK_BLUE)
add_accent_bar(slide, Inches(0), Inches(1.0), Inches(0.08), Inches(1.0), GOLD)

add_text_box(slide, Inches(0.6), Inches(0.3), Inches(10), Inches(0.6),
             "4. \u00c9tude de l'Existant & Solution Propos\u00e9e", font_size=28, color=WHITE, bold=True)
add_accent_bar(slide, Inches(0.6), Inches(0.9), Inches(4), Inches(0.04), GOLD)

# Left: Existing solutions
add_text_box(slide, Inches(0.6), Inches(1.2), Inches(5.5), Inches(0.5),
             "\u00c9tude de l'Existant", font_size=20, color=GOLD, bold=True)

existing = [
    "ITU AI for Good Initiative : Plateforme mondiale de recensement des projets IA, mais couverture globale, pas sp\u00e9cifique au monde arabe.",
    "OECD.AI Policy Observatory : R\u00e9f\u00e9rentiel de politiques IA, ax\u00e9 sur les pays membres de l'OCDE.",
    "AI4D (Afrique) : Initiative pour le d\u00e9veloppement de l'IA en Afrique, focus limit\u00e9 sur les pays africains anglophones.",
    "Portails nationaux isol\u00e9s : Chaque pays arabe a ses propres initiatives sans interop\u00e9rabilit\u00e9 r\u00e9gionale."
]
add_multiline_text(slide, Inches(0.6), Inches(1.8), Inches(5.5), Inches(3.5),
                   existing, font_size=12, color=WHITE)

# Divider vertical
div = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(6.5), Inches(1.2), Inches(0.04), Inches(4.5))
div.fill.solid()
div.fill.fore_color.rgb = GOLD
div.line.fill.background()

# Right: Proposed solution
add_text_box(slide, Inches(7), Inches(1.2), Inches(6), Inches(0.5),
             "Solution Propos\u00e9e : SARAI", font_size=20, color=GOLD, bold=True)

solution = [
    "Plateforme web centralis\u00e9e \u00ab Single Point of Truth \u00bb d\u00e9di\u00e9e \u00e0 la r\u00e9gion arabe.",
    "5 modules fonctionnels int\u00e9gr\u00e9s : Annuaire, Recensement, Carte interactive, Biblioth\u00e8que, Analytics.",
    "Architecture modulaire et scalable (React + FastAPI + PostgreSQL).",
    "Support multilingue (Anglais, Fran\u00e7ais, Arabe) avec interface RTL.",
    "Alignement avec les ODD (Objectifs de D\u00e9veloppement Durable) et la Strat\u00e9gie Arabe Commune IA."
]
add_multiline_text(slide, Inches(7), Inches(1.8), Inches(6), Inches(3.5),
                   solution, font_size=13, color=WHITE)

# Bottom comparison table
table_bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.3), Inches(5.7), Inches(12.7), Inches(1.7))
table_bg.fill.solid()
table_bg.fill.fore_color.rgb = RGBColor(0x14, 0x2D, 0x6E)
table_bg.line.fill.background()

add_text_box(slide, Inches(0.5), Inches(5.8), Inches(12), Inches(0.3),
             "Comparaison : Solutions Existantes vs SARAI", font_size=13, color=GOLD, bold=True, alignment=PP_ALIGN.CENTER)

comp_cols = [
    ("Crit\u00e8re", "ITU AI for Good", "OECD.AI", "AI4D (Afrique)", "SARAI"),
    ("Couverture", "Globale", "OCDE (pays d\u00e9velopp\u00e9s)", "Afrique anglophone", "22 pays arabes"),
    ("Cible", "Projets IA mondiaux", "Politiques publiques IA", "D\u00e9veloppement IA Afrique", "Initiatives IA r\u00e9gion arabe"),
    ("Carte interactive", "Limit\u00e9e", "Non", "Non", "Oui (Leaflet)"),
    ("Multilingue AR/FR/EN", "Non", "Non", "Non", "Oui (i18n + RTL)"),
    ("Annuaire stakeholders", "Partiel", "Non", "Non", "Oui (cat\u00e9goris\u00e9)"),
    ("ODD Alignment", "Oui", "Non", "Partiel", "Oui (int\u00e9gr\u00e9)"),
]

for ci, col_vals in enumerate(comp_cols):
    for ri, val in enumerate(col_vals):
        x = Inches(0.4) + Inches(ri * 2.55)
        y = Inches(6.15) + Inches(ci * 0.2)
        c = GOLD if ri == 0 else WHITE
        b = ci == 0
        add_text_box(slide, x, y, Inches(2.5), Inches(0.25),
                     val, font_size=9, color=c, bold=b, alignment=PP_ALIGN.CENTER)

# ════════════════════════════════════════════════════════
# SLIDE 7 — BESOINS FONCTIONNELS
# ════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, DARK_BLUE)
add_accent_bar(slide, Inches(0), Inches(1.0), Inches(0.08), Inches(1.0), GOLD)

add_text_box(slide, Inches(0.6), Inches(0.3), Inches(10), Inches(0.6),
             "5. Besoins Fonctionnels", font_size=28, color=WHITE, bold=True)
add_accent_bar(slide, Inches(0.6), Inches(0.9), Inches(4), Inches(0.04), GOLD)

modules = [
    ("Annuaire des Parties Prenantes", [
        "Base de donn\u00e9es cat\u00e9goris\u00e9e (Startups, Labs, Gouvernements, ONG, Universit\u00e9s)",
        "Filtres par pays, type, recherche textuelle",
        "Profils organisationnels avec logo et coordonn\u00e9es"
    ]),
    ("Moteur de Recensement des Projets", [
        "CRUD complet avec formulaire de soumission",
        "Champs : secteur, technologie IA, ODD, pays, description",
        "Upload de documents (multipart)",
        "Filtres combin\u00e9s avanc\u00e9s"
    ]),
    ("Carte de Connaissance Interactive", [
        "Visualisation g\u00e9ospatiale (Leaflet)",
        "Marqueurs proportionnels \u00e0 l'activit\u00e9 IA",
        "Classement des pays par nombre de projets",
        "L\u00e9gende par niveau d'activit\u00e9"
    ]),
    ("Biblioth\u00e8que de Ressources", [
        "Documents : Policy Documents, White Papers, Reports, Datasets",
        "T\u00e9l\u00e9chargement avec compteur",
        "Filtres par type et cat\u00e9gorie"
    ]),
    ("Tableau de Bord Analytics", [
        "KPIs : projets, startups, labs, pays",
        "\u00c9volution temporelle (graphiques Recharts)",
        "Distribution sectorielle et technologique",
        "Top pays par activit\u00e9 IA"
    ]),
]

for i, (title, items) in enumerate(modules):
    col = i % 3
    row = i // 3
    x = Inches(0.3) + col * Inches(4.3)
    y = Inches(1.2) + row * Inches(3.0)

    # Card header
    hdr = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(4.0), Inches(0.45))
    hdr.fill.solid()
    hdr.fill.fore_color.rgb = ACCENT_BLUE
    hdr.line.fill.background()
    add_text_box(slide, x + Inches(0.1), y + Inches(0.02), Inches(3.8), Inches(0.4),
                 title, font_size=13, color=WHITE, bold=True, alignment=PP_ALIGN.CENTER)

    # Card body
    body = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y + Inches(0.45), Inches(4.0), Inches(2.3))
    body.fill.solid()
    body.fill.fore_color.rgb = RGBColor(0x14, 0x2D, 0x6E)
    body.line.fill.background()
    add_bullet_text(slide, x + Inches(0.15), y + Inches(0.55), Inches(3.7), Inches(2.1),
                    items, font_size=11, color=WHITE)

# ════════════════════════════════════════════════════════
# SLIDE 8 — BESOINS NON FONCTIONNELS
# ════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, DARK_BLUE)
add_accent_bar(slide, Inches(0), Inches(1.0), Inches(0.08), Inches(1.0), GOLD)

add_text_box(slide, Inches(0.6), Inches(0.3), Inches(10), Inches(0.6),
             "5. Besoins Non Fonctionnels", font_size=28, color=WHITE, bold=True)
add_accent_bar(slide, Inches(0.6), Inches(0.9), Inches(4), Inches(0.04), GOLD)

nfr_items = [
    ("Performance", [
        "Temps de r\u00e9ponse API < 500ms",
        "Requ\u00eates simultan\u00e9es : 100+ utilisateurs",
        "Mise en cache des donn\u00e9es fr\u00e9quentes"
    ]),
    ("S\u00e9curit\u00e9", [
        "Authentification JWT (HS256, 24h d'expiration)",
        "Mots de passe hash\u00e9s (pbkdf2_sha256)",
        "Protection CSRF/CORS configur\u00e9e",
        "Rate limiting (SlowAPI)",
        "Validation des entr\u00e9es (Pydantic)"
    ]),
    ("Disponibilit\u00e9 & Scalabilit\u00e9", [
        "Architecture client-serveur RESTful",
        "Base de donn\u00e9es PostgreSQL scalable",
        "D\u00e9ploiement conteneuris\u00e9 (Docker-ready)",
        "Backup automatique des donn\u00e9es"
    ]),
    ("Maintenabilit\u00e9", [
        "Code modulaire (routes FastAPI s\u00e9par\u00e9es)",
        "Documentation API auto-g\u00e9n\u00e9r\u00e9e (Swagger/OpenAPI)",
        "Logs applicatifs centralis\u00e9s",
        "Tests unitaires et d'int\u00e9gration"
    ]),
    ("Utilisabilit\u00e9", [
        "Interface responsive (React + Tailwind CSS)",
        "Support multilingue (AR/FR/EN) avec i18n",
        "Support RTL pour l'arabe",
        "Guide touristique interactif int\u00e9gr\u00e9",
        "Notifications (toasts) en temps r\u00e9el"
    ]),
    ("Interop\u00e9rabilit\u00e9", [
        "API RESTful avec endpoints standardis\u00e9s",
        "Format JSON pour les \u00e9changes de donn\u00e9es",
        "CORS configur\u00e9 pour acc\u00e8s multi-origines",
        "Int\u00e9gration Power BI possible"
    ]),
]

for i, (title, items) in enumerate(nfr_items):
    col = i % 3
    row = i // 3
    x = Inches(0.3) + col * Inches(4.3)
    y = Inches(1.2) + row * Inches(3.0)
    hdr = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(4.0), Inches(0.4))
    hdr.fill.solid()
    hdr.fill.fore_color.rgb = GOLD
    hdr.line.fill.background()
    add_text_box(slide, x + Inches(0.1), y + Inches(0.02), Inches(3.8), Inches(0.35),
                 title, font_size=13, color=DARK_BLUE, bold=True, alignment=PP_ALIGN.CENTER)
    body = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y + Inches(0.4), Inches(4.0), Inches(2.3))
    body.fill.solid()
    body.fill.fore_color.rgb = RGBColor(0x14, 0x2D, 0x6E)
    body.line.fill.background()
    add_bullet_text(slide, x + Inches(0.15), y + Inches(0.5), Inches(3.7), Inches(2.1),
                    items, font_size=11, color=WHITE)

# ════════════════════════════════════════════════════════
# SLIDE 9 — ARCHITECTURE LOGIQUE
# ════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, DARK_BLUE)
add_accent_bar(slide, Inches(0), Inches(1.0), Inches(0.08), Inches(1.0), GOLD)

add_text_box(slide, Inches(0.6), Inches(0.3), Inches(10), Inches(0.6),
             "6. Architecture Logique du Projet", font_size=28, color=WHITE, bold=True)
add_accent_bar(slide, Inches(0.6), Inches(0.9), Inches(4), Inches(0.04), GOLD)

# ── LAYER 1: Frontend (top) ──
y_start = Inches(1.2)
# Layer 1 - Frontend
box1 = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.4), y_start, Inches(12.5), Inches(1.6))
box1.fill.solid()
box1.fill.fore_color.rgb = RGBColor(0x1E, 0x3A, 0x7A)
box1.line.color.rgb = ACCENT_BLUE
box1.line.width = Pt(2)
add_text_box(slide, Inches(0.6), y_start + Inches(0.05), Inches(3), Inches(0.35),
             "COUCHE PR\u00c9SENTATION", font_size=11, color=GOLD, bold=True)
add_text_box(slide, Inches(0.6), y_start + Inches(0.35), Inches(2), Inches(0.3),
             "Frontend", font_size=18, color=WHITE, bold=True)

front_comp = [
    ("React 18 + Vite 5", "SPA, composants, HMR"),
    ("React Router DOM 6", "Routage c\u00f4t\u00e9 client"),
    ("Tailwind CSS", "Styles responsives"),
]
for fi, (name, desc) in enumerate(front_comp):
    x = Inches(3.5) + Inches(fi * 3.5)
    c = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y_start + Inches(0.3), Inches(3.1), Inches(0.6))
    c.fill.solid()
    c.fill.fore_color.rgb = RGBColor(0x14, 0x2D, 0x6E)
    c.line.fill.background()
    add_text_box(slide, x + Inches(0.1), y_start + Inches(0.32), Inches(2.9), Inches(0.3),
                 name, font_size=11, color=WHITE, bold=True)
    add_text_box(slide, x + Inches(0.1), y_start + Inches(0.58), Inches(2.9), Inches(0.25),
                 desc, font_size=9, color=LIGHT_BLUE)

# Pages list
pages_str = "Pages : Home | Stakeholders | Projects | KnowledgeMap | Resources | Analytics | SDGs | Profile | Admin | Search"
add_text_box(slide, Inches(0.6), y_start + Inches(0.85), Inches(12), Inches(0.3),
             pages_str, font_size=9, color=LIGHT_BLUE)
add_text_box(slide, Inches(0.6), y_start + Inches(1.1), Inches(12), Inches(0.3),
             "Libraries : Leaflet (carto) | Recharts (graphiques) | react-i18next (i18n) | react-toastify (notifications) | react-icons",
             font_size=9, color=LIGHT_BLUE)

# Down arrow
add_text_box(slide, Inches(5.8), y_start + Inches(1.55), Inches(1.5), Inches(0.4),
             "\u25BC", font_size=16, color=GOLD, alignment=PP_ALIGN.CENTER)

# ── LAYER 2: Backend (middle) ──
y_start2 = Inches(3.2)
box2 = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.4), y_start2, Inches(12.5), Inches(1.7))
box2.fill.solid()
box2.fill.fore_color.rgb = RGBColor(0x1E, 0x3A, 0x7A)
box2.line.color.rgb = ACCENT_BLUE
box2.line.width = Pt(2)
add_text_box(slide, Inches(0.6), y_start2 + Inches(0.05), Inches(3), Inches(0.35),
             "COUCHE API / M\u00c9TIER", font_size=11, color=GOLD, bold=True)
add_text_box(slide, Inches(0.6), y_start2 + Inches(0.35), Inches(2), Inches(0.3),
             "Backend (FastAPI)", font_size=18, color=WHITE, bold=True)

# Routers
routers_list = [
    ("/api/users", "Authentification, Profils"),
    ("/api/projects", "CRUD Projets + Mod\u00e9ration"),
    ("/api/stakeholders", "Annuaire parties prenantes"),
    ("/api/resources", "Biblioth\u00e8que ressources"),
    ("/api/analytics", "Statistiques & KPIs"),
    ("/api/countries", "Donn\u00e9es g\u00e9ographiques"),
    ("/api/sdgs", "Objectifs D\u00e9veloppement Durable"),
    ("/api/search", "Recherche full-text"),
    ("/api/admin", "Administration"),
    ("/api/chat", "Chatbot int\u00e9gr\u00e9"),
    ("/api/contact", "Formulaire de contact"),
    ("/api/report", "G\u00e9n\u00e9ration rapports PDF"),
]
for ri, (route, desc) in enumerate(routers_list):
    col = ri % 4
    row = ri // 4
    x = Inches(3.2) + Inches(col * 2.6)
    y = y_start2 + Inches(0.25) + Inches(row * 0.5)
    add_text_box(slide, x, y, Inches(2.4), Inches(0.2),
                 route, font_size=8, color=GOLD, bold=True)
    add_text_box(slide, x, y + Inches(0.18), Inches(2.4), Inches(0.2),
                 desc, font_size=8, color=WHITE)

# Middleware line
add_text_box(slide, Inches(0.6), y_start2 + Inches(1.3), Inches(12), Inches(0.3),
             "Middleware : CORS | JWT Auth (HS256) | Rate Limiting (SlowAPI) | Validation (Pydantic v2) | Upload fichiers",
             font_size=9, color=LIGHT_BLUE)

# Down arrow
add_text_box(slide, Inches(5.8), y_start2 + Inches(1.65), Inches(1.5), Inches(0.4),
             "\u25BC", font_size=16, color=GOLD, alignment=PP_ALIGN.CENTER)

# ── LAYER 3: Data (bottom) ──
y_start3 = Inches(5.2)
box3 = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.4), y_start3, Inches(12.5), Inches(1.6))
box3.fill.solid()
box3.fill.fore_color.rgb = RGBColor(0x1E, 0x3A, 0x7A)
box3.line.color.rgb = ACCENT_BLUE
box3.line.width = Pt(2)
add_text_box(slide, Inches(0.6), y_start3 + Inches(0.05), Inches(3), Inches(0.35),
             "COUCHE DONN\u00c9ES", font_size=11, color=GOLD, bold=True)
add_text_box(slide, Inches(0.6), y_start3 + Inches(0.35), Inches(2), Inches(0.3),
             "Base de donn\u00e9es", font_size=18, color=WHITE, bold=True)

# DB details
db_items = [
    ("PostgreSQL (ou SQLite en dev)", "Base relationnelle principale"),
    ("6 tables : users, projects, stakeholders, resources, countries, sdg", "Mod\u00e8le relationnel"),
    ("SQLAlchemy 2.0 (ORM)", "Mapping objet-relationnel + migrations"),
    ("Jointures : projet\u2194stakeholder (N:N)", "Table d'association project_stakeholders"),
]
for di, (title, desc) in enumerate(db_items):
    x = Inches(3.2) + Inches(di * 2.6)
    if di >= 4:
        break
    c = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y_start3 + Inches(0.3), Inches(2.5), Inches(0.9))
    c.fill.solid()
    c.fill.fore_color.rgb = RGBColor(0x14, 0x2D, 0x6E)
    c.line.fill.background()
    add_text_box(slide, x + Inches(0.1), y_start3 + Inches(0.32), Inches(2.3), Inches(0.4),
                 title, font_size=10, color=WHITE, bold=True)
    add_text_box(slide, x + Inches(0.1), y_start3 + Inches(0.65), Inches(2.3), Inches(0.4),
                 desc, font_size=9, color=LIGHT_BLUE)

# Services
add_text_box(slide, Inches(0.6), y_start3 + Inches(1.2), Inches(12), Inches(0.3),
             "Services : Email (SMTP Gmail) | G\u00e9n\u00e9ration PDF (ReportLab) | Embedding (recherche s\u00e9mantique) | Document Reader",
             font_size=9, color=LIGHT_BLUE)

# ════════════════════════════════════════════════════════
# SLIDE 10 — TECHNOLOGIES UTILISÉES (remplace l'ancien slide 9)
# ════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, DARK_BLUE)
add_accent_bar(slide, Inches(0), Inches(1.0), Inches(0.08), Inches(1.0), GOLD)

add_text_box(slide, Inches(0.6), Inches(0.3), Inches(10), Inches(0.6),
             "7. Technologies Utilis\u00e9es", font_size=28, color=WHITE, bold=True)
add_accent_bar(slide, Inches(0.6), Inches(0.9), Inches(4), Inches(0.04), GOLD)

# Three columns for technologies
layers = [
    ("Frontend", [
        ("React 18", "Biblioth\u00e8que UI",
         ["Composants r\u00e9utilisables", "Hooks, Router SPA"]),
        ("Vite 5", "Build tool",
         ["HMR rapide", "Optimisation production"]),
        ("Tailwind CSS", "Styles",
         ["Responsive", "Design system"]),
        ("Leaflet", "Cartographie interactive",
         ["react-leaflet", "Marqueurs pays"]),
        ("Recharts", "Graphiques",
         ["KPIs, tendances, distributions"]),
        ("i18next", "Internationalisation",
         ["FR/EN/AR", "Support RTL"]),
    ]),
    ("Backend", [
        ("FastAPI", "Framework Python",
         ["ASGI (Uvicorn)", "Doc auto (Swagger)"]),
        ("SQLAlchemy 2.0", "ORM",
         ["Mod\u00e8les de donn\u00e9es", "Migrations"]),
        ("JWT (python-jose)", "Authentification",
         ["HS256", "24h expiration"]),
        ("Pydantic v2", "Validation",
         ["Schemas, s\u00e9rialisation"]),
        ("SlowAPI", "Rate Limiting",
         ["Protection anti-DoS"]),
        ("SMTP (Gmail)", "Email",
         ["Reset password", "Rapports"]),
    ]),
    ("BDD & Outils", [
        ("PostgreSQL", "Base relationnelle",
         ["Donn\u00e9es structur\u00e9es", "SQLAlchemy ORM"]),
        ("SQLite", "Fallback dev",
         ["D\u00e9veloppement local"]),
        ("ReportLab", "G\u00e9n\u00e9ration PDF",
         ["Rapports automatiques"]),
        ("Swagger UI", "Doc API",
         ["Endpoints testables", "OpenAPI 3.0"]),
        ("Git", "Versioning",
         ["Gitflow", "Code review"]),
        ("Render / VPS", "H\u00e9bergement",
         ["D\u00e9ploiement cloud"]),
    ]),
]

for li, layer in enumerate(layers):
    title, techs = layer
    x_base = Inches(0.3) + Inches(li * 4.3)
    lt = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x_base, Inches(1.2), Inches(4.0), Inches(0.5))
    lt.fill.solid()
    lt.fill.fore_color.rgb = ACCENT_BLUE
    lt.line.fill.background()
    add_text_box(slide, x_base + Inches(0.1), Inches(1.22), Inches(3.8), Inches(0.45),
                 title, font_size=18, color=WHITE, bold=True, alignment=PP_ALIGN.CENTER)
    for ti, (tech_name, tech_role, details) in enumerate(techs):
        y = Inches(1.85) + Inches(ti * 0.85)
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x_base, y, Inches(4.0), Inches(0.75))
        card.fill.solid()
        card.fill.fore_color.rgb = RGBColor(0x14, 0x2D, 0x6E)
        card.line.fill.background()
        add_text_box(slide, x_base + Inches(0.15), y + Inches(0.02), Inches(2.5), Inches(0.3),
                     tech_name, font_size=12, color=GOLD, bold=True)
        add_text_box(slide, x_base + Inches(0.15), y + Inches(0.28), Inches(3.7), Inches(0.2),
                     tech_role, font_size=9, color=LIGHT_BLUE)
        add_text_box(slide, x_base + Inches(0.15), y + Inches(0.48), Inches(3.7), Inches(0.2),
                     " | ".join(details), font_size=9, color=WHITE)

# ════════════════════════════════════════════════════════
# SLIDE 11 — MERCI / FIN PARTIE 1
# ════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, DARK_BLUE)

add_accent_bar(slide, Inches(0), Inches(2.8), Inches(0.12), Inches(2.0), GOLD)
add_accent_bar(slide, Inches(0), Inches(5.0), Inches(13.333), Inches(0.04), GOLD)

add_text_box(slide, Inches(1), Inches(1.5), Inches(11), Inches(1.0),
             "Fin de la Premi\u00e8re Partie", font_size=20, color=GOLD, bold=True, alignment=PP_ALIGN.CENTER)

add_text_box(slide, Inches(1), Inches(2.5), Inches(11), Inches(1.5),
             "Questions ?", font_size=48, color=WHITE, bold=True, alignment=PP_ALIGN.CENTER)

add_text_box(slide, Inches(1), Inches(4.2), Inches(11), Inches(0.6),
             "Prochaine partie : Architecture, R\u00e9alisation & D\u00e9monstration", font_size=16, color=LIGHT_BLUE, alignment=PP_ALIGN.CENTER)

add_text_box(slide, Inches(1), Inches(5.5), Inches(11), Inches(0.4),
             "Merci pour votre attention", font_size=20, color=WHITE, bold=True, alignment=PP_ALIGN.CENTER)

# Save
prs.save("Presentation_PFE_SARAI_Partie1.pptx")
print("Presentation_PFE_SARAI_Partie1.pptx generated successfully!")
print(f"Total slides: {len(prs.slides)}")
