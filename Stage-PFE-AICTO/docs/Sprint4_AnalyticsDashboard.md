# Sprint 4 – Développement du tableau de bord analytique

## Corrections au plan initial

### Problèmes identifiés et corrections

1. **Ajout de la Section E (Ressources documentaires)** – Le plan omettait les visuels liés aux ressources. Ces indicateurs sont essentiels pour la gestion documentaire de la plateforme.
2. **Ajout de la Section D complète (Cycle de vie & Durée)** – Le plan mentionnait seulement « Évolution par année » sans détailler le volet « Durée d'exécution » (statistiques de durée active vs clôturée).
3. **Dashboard Users accessible aux admins uniquement** – Le plan ne précisait pas que seul l'admin peut voir le dashboard Users. Une correction de rôle a été implémentée.
4. **Uniformisation des données** – Initialement, les endpoints admin retournaient 0 pour les non-admin. Tous les endpoints `/admin/*` utilisent désormais `get_current_user` afin que tout utilisateur authentifié voie les mêmes valeurs réelles.
5. **Faute de frappe corrigée** – `total_projets` → `total_projects` dans le frontend (provoquait un affichage à 0 pour le KPI « Total projets »).

### Plan corrigé

| Section | Titre | Modifications |
|---------|-------|---------------|
| 6.4.1 | Définition des KPIs globaux | Inchangé |
| 6.4.2 | Visualisations des projets par pays et par secteur | Ajout du Funnel de conversion (B1) et Vélocité de modération (B2) |
| 6.4.3 | Analyse des SDGs et des technologies IA | Ajout du Statut des projets (C6), Durée d'exécution (D1), Ressources (E1–E4) |
| 6.5.1 | Suivi de l'activité des utilisateurs | Inchangé |
| 6.5.2 | Tableau des contributeurs les plus actifs | Inchangé |
| 6.5.3 | Analyse des organisations et des technologies utilisées | Inchangé |
| 6.6 | Description des interfaces réalisées | Deux interfaces : Overview (Projects) et Users (admin uniquement) |

---

## 6.4.1 Définition des KPIs globaux (Section A – Projects Dashboard)

| KPI | Formule / Calcul | Source de données |
|-----|------------------|-------------------|
| **Total projets** | `COUNT(projects)` | `GET /api/analytics/overview` → `total_projects` |
| **Taux d'approbation** | `approvés / (approuvés + rejetés) × 100` | `GET /api/analytics/admin/project-kpis` → `approval_rate` |
| **Délai modération** | `AVG((moderated_at - submitted_at) / 86400)` en jours | `GET /api/analytics/admin/project-kpis` → `avg_moderation_delay_days` |
| **Backlog en attente** | `COUNT(status = "pending")` | `GET /api/analytics/admin/project-kpis` → `pending_backlog` |
| **Backlog critique > 30j** | `COUNT(status = "pending" AND submitted_at < NOW() - 30 days)` | `GET /api/analytics/admin/project-kpis` → `critical_backlog_count` |
| **Couverture ODD** | `COUNT(DISTINCT sdg_id WHERE sdg_id NOT NULL) / 17 × 100` | `GET /api/analytics/admin/project-kpis` → `sdg_coverage_rate` |

---

## 6.4.2 Visualisations des projets par pays et par secteur

### B1 – Funnel de conversion

| Attribut | Description |
|----------|-------------|
| **Nom** | Funnel de conversion |
| **Type** | BarChart vertical (recharts) |
| **Rôle** | Visualiser le pipeline complet de soumission à décision |
| **Utilité** | Permet à l'admin de mesurer l'efficacité du processus de modération et d'identifier les goulets d'étranglement |
| **Équation** | `approved / submitted × 100` (taux de conversion affiché en sous-titre). Étapes : Soumis → En attente → Approuvé / Rejeté |
| **Données** | `GET /api/analytics/admin/project-funnel` → `submitted`, `pending`, `approved`, `rejected` |

### B2 – Vélocité de modération

| Attribut | Description |
|----------|-------------|
| **Nom** | Vélocité de modération |
| **Type** | LineChart (recharts) |
| **Rôle** | Suivre l'évolution du délai moyen de modération par mois |
| **Utilité** | Détecter les tendances (augmentation du délai = alerte surcharge modérateurs) |
| **Équation** | `AVG(EXTRACT(EPOCH FROM moderated_at - submitted_at) / 86400)` groupé par `(year, month)` |
| **Données** | `GET /api/analytics/admin/moderation-velocity` → `month`, `avg_delay_days` |

### B3 – Volume vs Qualité

| Attribut | Description |
|----------|-------------|
| **Nom** | Volume vs Qualité |
| **Type** | ComposedChart (Bar + Line, double axe Y) |
| **Rôle** | Corréler le volume de modération (barres) avec la vélocité (ligne) |
| **Utilité** | Vérifier si un volume élevé dégrade la qualité du délai de traitement |
| **Équation** | Barres : `count` (projets modérés par mois) ; Ligne : `avg_delay_days` |
| **Données** | `GET /api/analytics/admin/moderation-velocity` |

### C1 – Carte des projets

| Attribut | Description |
|----------|-------------|
| **Nom** | Carte des projets |
| **Type** | Leaflet MapContainer + CircleMarkers |
| **Rôle** | Visualisation géographique de la répartition des projets |
| **Utilité** | Donne une vue d'ensemble immédiate de la couverture géographique par pays |
| **Équation** | Rayon du marqueur = `max(4, sqrt(project_count) × 3)` |
| **Données** | `GET /api/analytics/map-data` → `latitude`, `longitude`, `project_count`, `country` |

### C2 – Top 10 pays

| Attribut | Description |
|----------|-------------|
| **Nom** | Top 10 pays |
| **Type** | HBarList (liste horizontale personnalisée) |
| **Rôle** | Classement des pays par nombre de projets |
| **Utilité** | Identifier les pays les plus actifs et calculer l'indice de concentration HHI |
| **Équation** | HHI = `Σ((projets_pays_i / total_projets) × 100)²`. Plus HHI est élevé, plus la concentration est forte |
| **Données** | `GET /api/analytics/projects-by-country` → `country`, `projects` (top 10) |

### C3 – Secteurs

| Attribut | Description |
|----------|-------------|
| **Nom** | Distribution par secteur |
| **Type** | PieChart (donut) |
| **Rôle** | Répartition des projets par secteur d'activité |
| **Utilité** | Visualiser les secteurs dominants et l'équilibre du portefeuille de projets |
| **Équation** | `COUNT(projects)` groupé par `sector`, limité aux 6 premiers secteurs |
| **Données** | `GET /api/analytics/projects-by-sector` → `sector`, `count` |

---

## 6.4.3 Analyse des SDGs et des technologies IA

### C4 – AI Technologies

| Attribut | Description |
|----------|-------------|
| **Nom** | Top 5 technologies IA |
| **Type** | BarChart horizontal |
| **Rôle** | Classement des technologies d'intelligence artificielle utilisées dans les projets |
| **Utilité** | Identifier les tendances technologiques et les compétences dominantes |
| **Équation** | `COUNT(projects)` groupé par `technology`, limité aux 5 premières |
| **Données** | `GET /api/analytics/ai-technologies` → `technology`, `count` |

### C5 – Couverture ODD

| Attribut | Description |
|----------|-------------|
| **Nom** | Couverture des Objectifs de Développement Durable |
| **Type** | BarChart vertical |
| **Rôle** | Distribution des projets alignés sur chaque ODD |
| **Utilité** | Mesurer l'alignement du portefeuille avec les objectifs ONU, identifier les ODD sous-représentés |
| **Équation** | `COUNT(projects)` groupé par `sdg_id`, top 10 ODD. Couleurs par l'indice ODD (17 couleurs prédéfinies) |
| **Données** | `GET /api/analytics/sdg-coverage` → `goal_number`, `count` |

### C6 – Statut des projets

| Attribut | Description |
|----------|-------------|
| **Nom** | Statut des projets |
| **Type** | PieChart (donut) |
| **Rôle** | Répartition par statut de décision (approuvé, en attente, rejeté) |
| **Utilité** | Vue d'ensemble du taux d'acceptation vs rejet |
| **Équation** | `COUNT(projects)` groupé par `status` (filtre `status != "draft"`). Couleurs : vert = approuvé, orange = en attente, rouge = rejeté |
| **Données** | `GET /api/analytics/status-distribution` → `status`, `count` |

### D1 – Durée d'exécution

| Attribut | Description |
|----------|-------------|
| **Nom** | Durée d'exécution |
| **Type** | PieChart (donut) + 3 cartes statistiques |
| **Rôle** | Comparaison projets actifs vs clôturés + statistiques de durée |
| **Utilité** | Mesurer la maturité du portefeuille et la durée moyenne des projets |
| **Équation** | Pie : `active_count` vs `closed_count`. Cartes : `avg_duration_days = AVG(end_date - start_date)` ; `active_rate = active_count / total_projects × 100` |
| **Données** | `GET /api/analytics/admin/project-duration-stats` |

### D2 – Évolution par année

| Attribut | Description |
|----------|-------------|
| **Nom** | Évolution par année |
| **Type** | BarChart vertical |
| **Rôle** | Tendance du nombre de projets soumis par année |
| **Utilité** | Visualiser la croissance ou déclin du pipeline de projets dans le temps |
| **Équation** | `COUNT(projects)` groupé par `year` (extrait de `submitted_at`) |
| **Données** | `GET /api/analytics/projects-timeline` → `year`, `projects` |

### E1 – Total ressources

| Attribut | Description |
|----------|-------------|
| **Nom** | Total ressources documentaires |
| **Type** | Carte KPI simple |
| **Rôle** | Indicateur du volume documentaire de la plateforme |
| **Utilité** | Donne une mesure immédiate de la richesse documentaire |
| **Équation** | `COUNT(resources)` |
| **Données** | `GET /api/analytics/admin/resource-kpis` → `total_resources` |

### E2 – Ressources par catégorie

| Attribut | Description |
|----------|-------------|
| **Nom** | Ressources par catégorie |
| **Type** | BarChart vertical |
| **Rôle** | Distribution des ressources par catégorie |
| **Utilité** | Identifier les catégories les plus pourvues et les lacunes documentaires |
| **Équation** | `COUNT(resources)` groupé par `category`, ordre décroissant |
| **Données** | `GET /api/analytics/admin/resources-by-category` → `category`, `count`, `avg_downloads`, `total_downloads` |

### E3 – Répartition par langue

| Attribut | Description |
|----------|-------------|
| **Nom** | Répartition par langue |
| **Type** | PieChart (donut) |
| **Rôle** | Distribution linguistique des ressources documentaires |
| **Utilité** | Mesurer la diversité linguistique et la couverture (arabe, français, anglais, etc.) |
| **Équation** | `COUNT(resources)` groupé par `language`, top 6 langues |
| **Données** | `GET /api/analytics/admin/resources-by-language` → `language`, `count` |

### E4 – Connectivité Projets ↔ Ressources ↔ Stakeholders

| Attribut | Description |
|----------|-------------|
| **Nom** | Connectivité de l'écosystème |
| **Type** | Cartes statistiques + HBarList |
| **Rôle** | Mesurer la densité des liens entre projets, documents et parties prenantes |
| **Utilité** | Évaluer la richesse des connexions de l'écosystème et les paires ODD × Secteur dominantes |
| **Équation** | `documented_rate = avec_documents / total_projets × 100` ; `avg_stakeholders_per_project = total_associations / total_projets` |
| **Données** | `GET /api/analytics/admin/project-connectivity` + `GET /api/analytics/admin/sdg-sector-heatmap` |

---

## 6.5.1 Suivi de l'activité des utilisateurs (Section B – Users Dashboard)

### B1 – Signup Growth

| Attribut | Description |
|----------|-------------|
| **Nom** | Évolution des inscriptions |
| **Type** | ComposedChart (Area + Line, double axe Y) |
| **Rôle** | Suivi des inscriptions mensuelles et cumulées |
| **Utilité** | Mesurer la croissance de la base d'utilisateurs et l'efficacité de l'acquisition |
| **Équation** | `COUNT(users)` groupé par `(year, month)`. Cumul = somme glissante en Python |
| **Données** | `GET /api/analytics/admin/user-signups` → `month`, `count`, `cumulative` |

### B2 – Approbation dans le temps

| Attribut | Description |
|----------|-------------|
| **Nom** | Taux d'approbation mensuel |
| **Type** | LineChart |
| **Rôle** | Évolution du taux d'approbation des organisations par mois |
| **Utilité** | Détecter les variations dans la qualité des inscriptions ou la sévérité de la modération |
| **Équation** | `approval_rate = approved / total × 100` groupé par `(year, month)` |
| **Données** | `GET /api/analytics/admin/approval-timeline` → `month`, `approval_rate` |

---

## 6.5.2 Tableau des contributeurs les plus actifs (Section F – Users Dashboard)

### F1 – Top 3 utilisateurs actifs

| Attribut | Description |
|----------|-------------|
| **Nom** | Top 3 utilisateurs actifs |
| **Type** | Table HTML avec avatars et badges (or/argent/bronze) |
| **Rôle** | Identifier les organisations les plus engagées |
| **Utilité** | Gamification et reconnaissance des contributeurs majeurs |
| **Équation** | Tri par `last_login` DESC. `total_engagement = projects_owned + projects_as_stakeholder`. Rang 1 = or, 2 = argent, 3 = bronze |
| **Données** | `GET /api/analytics/admin/user-engagement` |

---

## 6.5.3 Analyse des organisations et des technologies utilisées (Section C – Users Dashboard)

### C1 – Par type d'organisation

| Attribut | Description |
|----------|-------------|
| **Nom** | Répartition par type d'organisation |
| **Type** | HBarList |
| **Rôle** | Distribution des organisations par type (gouvernement, ONG, privé, académique, etc.) |
| **Utilité** | Comprendre la composition de l'écosystème et adapter les stratégies d'engagement |
| **Équation** | `COUNT(users)` groupé par `organization_type` |
| **Données** | `GET /api/analytics/users-by-organization-type` → `type`, `count` |

### C2 – Par secteur

| Attribut | Description |
|----------|-------------|
| **Nom** | Répartition par secteur d'activité |
| **Type** | HBarList |
| **Rôle** | Distribution des organisations par secteur d'activité |
| **Utilité** | Identifier les secteurs dominants parmi les organisations membres |
| **Équation** | `COUNT(users)` groupé par `sector` |
| **Données** | `GET /api/analytics/admin/users-by-sector` → `sector`, `count` |

### C3 – Par pays

| Attribut | Description |
|----------|-------------|
| **Nom** | Répartition par pays |
| **Type** | HBarList |
| **Rôle** | Distribution géographique des organisations |
| **Utilité** | Mesurer la couverture géographique de la plateforme |
| **Équation** | `COUNT(users)` groupé par `country` |
| **Données** | `GET /api/analytics/users-by-country` → `country`, `count` |

---

## 6.7 Apport du module Analytics

1. **Uniformisation des données** – Tous les utilisateurs authentifiés (admin ou non) accèdent aux mêmes données réelles via les endpoints `/admin/*` rendus accessibles avec `get_current_user`.
2. **Dashboard admin restreint** – L'onglet « Users & Stakeholders » est exclusivement réservé aux administrateurs.
3. **Vision globale et opérationnelle** – 6 KPIs et 13 visuels dans le dashboard Projects donnent une vision complète du pipeline, de la qualité, de la couverture géographique/thématique et des ressources.
4. **KPIs de gestion utilisateurs** – 6 KPIs et 6 visuels dans le dashboard Users permettent de piloter la croissance, l'engagement et la santé de la base d'organisations.
5. **Performance** – Tous les appels API utilisent `safeFetch` avec fallbacks pour garantir une expérience fluide même en cas d'erreur de chargement.
