# Plan de Travail — SARAI (Stocktaking of Arab Regional AI Initiatives)

## Contexte
- **Organisme**: AICTO (Arab ICT Organization)
- **Projet**: Plateforme web de recensement des initiatives IA dans les 22 pays de la Ligue Arabe
- **Type**: PFE (Projet de Fin d'Études) — ESPRIT
- **Référence**: RFP - Development of a Regional AI Repository Platform

---

## 1. Description du Projet

SARAI est une plateforme web centralisée pour **cartographier, documenter et promouvoir** l'écosystème d'Intelligence Artificielle dans la région arabe. Inspirée du modèle ITU Stocktaking, elle sert de **"Single Point of Truth"** pour les chercheurs, startups, gouvernements et ONG, en facilitant la découverte de cas d'usage IA, l'accès aux ressources, et l'alignement avec la **Stratégie Arabe Commune pour l'IA (2023)** et les **ODD**.

---

## 2. Problématique

Les initiatives IA dans la région arabe sont **fragmentées** et **sans visibilité centralisée** :

1. **Absence de référentiel unique** — Pas de point d'accès central pour découvrir les projets, acteurs et ressources IA.
2. **Manque de coordination régionale** — Difficulté d'aligner les initiatives nationales avec la stratégie arabe commune.
3. **Visibilité insuffisante** — Startups et labs de recherche peinent à se faire connaître.
4. **Données non structurées** — Pas de mécanisme de collecte et d'analyse standardisé.
5. **Géolocalisation absente** — Impossible de visualiser la répartition géographique de l'activité IA.

---

## 3. Analyse Écart RFP vs Réalisation

| Module RFP | Statut | Commentaire |
|---|---|---|
| **Stakeholder Directory** | ⚠️ Partiel | Interface frontend ok, mais données mock — à connecter à l'API |
| **Project Stocktaking Engine** | ✅ Complété | CRUD + filtres + upload documents + connexion API |
| **Interactive Knowledge Map** | ✅ Complété | Leaflet + marqueurs + classement pays |
| **Resource Library** | ⚠️ Partiel | Interface frontend ok, mais données mock — à connecter à l'API |
| **Analytics Dashboard** | ✅ Complété | KPIs + Recharts + tendances |
| **Base PostgreSQL + MongoDB/Elasticsearch** | ❌ Manquant | Actuellement PostgreSQL + SQLite seulement |
| **Full-text Search / Elasticsearch** | ❌ Manquant | Filtres simples seulement |

---

## 4. Fonctionnalités (par module)

### Module 1 — Authentification & Gestion Utilisateurs
- Inscription / Connexion (JWT, HS256, 24h)
- Profil organisation (logo, coordonnées, secteur)
- Rôles : admin (aicto.org) / organization
- Mot de passe oublié (email SMTP Gmail)
- Sécurité : pbkdf2_sha256

### Module 2 — Annuaire des Parties Prenantes
- Types : Research Lab, Startup, Government, University, NGO
- Filtres : pays, type, recherche textuelle
- Connexion API backend (à finaliser)

### Module 3 — Moteur de Recensement des Projets
- CRUD complet avec formulaire
- Champs : secteur, technologie IA, alignement ODD, pays, description, statut, année
- Upload de documents (multipart)
- Filtres combinés (pays, secteur, technologie, ODD)
- Statistiques (par secteur, technologie, pays)

### Module 4 — Carte de Connaissance Interactive
- Leaflet avec marqueurs positionnés par pays
- Taille des marqueurs proportionnelle au nombre de projets
- Classement latéral (Top 8 pays)
- Légende par niveau d'activité

### Module 5 — Bibliothèque de Ressources
- Types : Policy Document, White Paper, Report, Dataset
- Filtres : type, catégorie
- Compteur de téléchargements
- Connexion API backend (à finaliser)

### Module 6 — Tableau de Bord Analytics
- KPIs (projets, startups, labs, pays)
- Évolution temporelle 2020-2024 (aire)
- Projets par secteur (barres horizontales)
- Distribution technologique (donut)
- Top pays par activité (barres)
- Insights clés

### Module 7 — Objectifs de Développement Durable (ODD)
- Affichage des 17 ODD depuis l'API
- Alignement des projets avec les ODD

### Module 8 — Guide Touristique
- Visite guidée interactive (4 étapes)
- Overlay avec highlight des éléments clés

---

## 5. Technologies

| Couche | Technologie | Version |
|---|---|---|
| **Frontend** | React + Vite | 18.2 / 5.1 |
| **Routing** | react-router-dom | 6.22 |
| **Cartes** | Leaflet + react-leaflet | 1.9 / 4.2 |
| **Graphiques** | Recharts | 2.12 |
| **Icônes** | react-icons (FA, Boxicons) | 5.0 |
| **Backend** | FastAPI (Python) | 0.109 |
| **Serveur ASGI** | Uvicorn | 0.27 |
| **ORM** | SQLAlchemy | 2.0.25 |
| **Validation** | Pydantic v2 | 2.5 |
| **Auth** | JWT (python-jose + cryptography) | - |
| **Base de données** | PostgreSQL (primaire) / SQLite (fallback) | - |
| **Moteur de recherche** | À implémenter (MongoDB ou Elasticsearch) | - |
| **Email** | SMTP Gmail | - |

---

## 6. Plan de Travail Détaillé

### Phase 1 : Audit & Analyse (Semaine 1)

| Tâche | Description | Livrable |
|---|---|---|
| 1.1 | Audit du code existant (frontend + backend) | Rapport d'audit |
| 1.2 | Analyse des écarts RFP vs Réalisation | Matrice d'écarts |
| 1.3 | Spécification des exigences (SRS) | Document SRS |
| 1.4 | Diagrammes UML (Cas d'utilisation, Séquence, Classes) | Diagrammes |

### Phase 2 : Renforcement Backend (Semaine 2)

| Tâche | Description | Priorité |
|---|---|---|
| 2.1 | Finaliser CRUD Stakeholders API | Haute |
| 2.2 | Finaliser CRUD Resources API | Haute |
| 2.3 | Intégrer Elasticsearch / MongoDB pour le full-text search | Moyenne |
| 2.4 | Améliorer la recherche (filtres avancés + texte intégral) | Moyenne |

### Phase 3 : Connexion Frontend-Backend (Semaine 3)

| Tâche | Description | Priorité |
|---|---|---|
| 3.1 | Connecter StakeholderDirectory à l'API | Haute |
| 3.2 | Connecter ResourceLibrary à l'API | Haute |
| 3.3 | Tests de bout en bout (forgot password, CRUD projets) | Haute |

### Phase 4 : Documentation PFE (Semaine 4)

| Tâche | Description | Livrable |
|---|---|---|
| 4.1 | Manuel d'utilisation (User Manual) | Document PDF |
| 4.2 | Documentation API (Swagger/OpenAPI) | Swagger UI |
| 4.3 | Schéma d'architecture système + ERD | Diagrammes |
| 4.4 | Rédaction du rapport de PFE | Rapport final |
| 4.5 | Préparation de la soutenance | Slides |

### Phase 5 : Optimisation & Déploiement (Semaine 5)

| Tâche | Description | Priorité |
|---|---|---|
| 5.1 | Tests de performance et optimisation | Basse |
| 5.2 | Déploiement (Docker, hébergement) | Haute |
| 5.3 | Correction des bugs identifiés | Haute |

---

## 7. Livrables PFE (Obligatoires)

| Livrable | Statut | Fichier |
|---|---|---|
| Software Requirements Specification (SRS) | ❌ À faire | `docs/SRS.md` |
| Diagrammes UML (Use Case, Sequence, Class) | ❌ À faire | `docs/uml/` |
| Diagramme ERD | ❌ À faire | `docs/erd/` |
| Manuel d'utilisation | ❌ À faire | `docs/user-manual.md` |
| Documentation API (Swagger/OpenAPI) | ✅ Généré automatiquement | `/docs` (FastAPI) |
| Rapport de PFE / Mémoire | ❌ À faire | `docs/pfe-report.md` |
| Code source commenté | ⚠️ Partiel | - |

---

## 8. Architecture Cible (Recommandée)

```
┌──────────────────────────────────────────────────────┐
│                    Frontend                          │
│  React + Vite (port 3001)                            │
│  ├─ React SPA (BrowserRouter)                        │
│  └─ Pages standalone (auth, forgot/reset password)   │
└────────────────┬─────────────────────────────────────┘
                 │ HTTP REST (fetch)
                 ▼
┌──────────────────────────────────────────────────────┐
│                Backend (FastAPI)                      │
│  ├─ Routers : users, projects, stakeholders,         │
│  │            resources, analytics, countries, sdgs   │
│  ├─ Middleware : CORS, JWT Auth                      │
│  ├─ Services : email (SMTP), upload                  │
│  └─ Documentation : Swagger (/docs)                  │
└────────────────┬─────────────────────────────────────┘
                 │ SQLAlchemy + Elasticsearch
                 ▼
┌──────────────────────────────────────────────────────┐
│                   Data Layer                          │
│  ├─ PostgreSQL : données structurées (users,          │
│  │   projects, stakeholders, resources, pays, ODD)    │
│  └─ Elasticsearch : indexation + full-text search     │
│     (projets, ressources, parties prenantes)          │
└──────────────────────────────────────────────────────┘
```

---

## 9. Risques & Mitigation

| Risque | Impact | Mitigation |
|---|---|---|
| Elasticsearch complexe à intégrer | Moyen | Commencer par PostgreSQL full-text search (tsvector) |
| Données mock non réalistes | Faible | Générer des seeds réalistes avec Faker |
| Documentation PFE volumineuse | Moyen | Rédiger en continu, pas à la fin |
| Déploiement (coût serveur) | Moyen | Utiliser Render / Railway (gratuit) ou VPS mutualisé |
