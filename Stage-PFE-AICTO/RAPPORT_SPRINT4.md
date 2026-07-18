# Chapitre 6 : Développement du tableau de bord analytique

## Introduction

Le tableau de bord analytique constitue un module stratégique de la plateforme SARAI. Il a pour objectif de fournir aux décideurs, aux chercheurs et aux parties prenantes une vue synthétique et interactive de l'état des projets d'intelligence artificielle dans le monde arabe. Ce sprint s'inscrit dans la continuité des travaux précédents en apportant une couche décisionnelle à la plateforme, permettant de passer de la simple consultation de données à leur analyse approfondie.

La conception de ce module a été guidée par trois principes fondamentaux : la pertinence des indicateurs, la clarté des visualisations et l'adaptabilité aux différents profils d'utilisateurs (administrateurs, organisations, visiteurs).

---

## 6.1 Objectif du sprint

L'objectif principal de ce sprint est de développer un module d'analytics complet offrant :

- Une vue d'ensemble des projets avec des indicateurs clés de performance (KPIs)

- Un suivi de l'activité des utilisateurs et des contributeurs
- Une séparation claire entre les vues publique et administrateur
- Une interface responsive et professionnelle adaptée à un usage décisionnel

Ce sprint vise à transformer les données brutes stockées dans la base en informations actionnables, facilitant ainsi la prise de décision pour les gestionnaires de la plateforme.

---

## 6.2 Sprint backlog

| Tâche | Description | Priorité | Statut |
|-------|-------------|----------|--------|
| S4.1 | Conception et implémentation des endpoints analytics backend | Haute | ✓ |
| S4.2 | Définition des KPIs globaux (projets, pays, parties prenantes) | Haute | ✓ |
| S4.3 | Visualisation cartographique des projets par pays | Haute | ✓ |
| S4.4 | Diagrammes de répartition sectorielle et technologique | Haute | ✓ |
| S4.5 | Analyse des Objectifs de Développement Durable (SDGs) | Moyenne | ✓ |
| S4.6 | Dashboard Users : suivi des inscriptions et contributeurs | Haute | ✓ |
| S4.7 | Dashboard Admin : indicateurs avancés et modération | Haute | ✓ |
| S4.8 | Refonte des composants avec hooks et mémoïsation | Moyenne | ✓ |
| S4.9 | Optimisation des performances et correction des bugs | Moyenne | ✓ |

---

## 6.3 Analyse des indicateurs et besoins décisionnels

Avant de concevoir les interfaces, une analyse approfondie des besoins a été réalisée auprès des parties prenantes potentielles :

**Besoins identifiés :**

1. **Suivi de la croissance** — Évolution du nombre de projets dans le temps, répartition par pays et par secteur
2. **Mesure de l'impact** — Contribution aux SDGs, adoption des technologies IA
3. **Gouvernance** — Statut des projets (approuvé/en attente/rejeté), qualité des soumissions
4. **Engagement** — Activité des utilisateurs, taux d'activation, organisations les plus actives
5. **Modération** — File d'attente de validation, taux d'approbation, historique des décisions

Ces besoins ont été traduits en **indicateurs clés de performance (KPIs)** et en **visualisations** spécifiques, organisés en deux tableaux de bord distincts.

---

## 6.4 Conception du dashboard Overview

Le dashboard Overview est conçu pour offrir une vue macro des projets IA dans la région arabe. Il s'adresse à tous les types d'utilisateurs (visiteurs, organisations, administrateurs).

### 6.4.1 Définition des KPIs globaux

Six indicateurs clés sont affichés en haut du tableau de bord sous forme de cartes modernes :

| KPI | Description | Source de données |
|-----|-------------|-------------------|
| Total Projects | Nombre total de projets enregistrés | `GET /api/analytics/overview` |
| Active Countries | Pays participants avec au moins un projet | `GET /api/analytics/overview` |
| Total Stakeholders | Total des parties prenantes impliquées | `GET /api/analytics/overview` |
| Total Resources | Ressources téléchargées ou liées aux projets | `GET /api/analytics/overview` |
| Approved Projects | Projets approuvés par les modérateurs | `GET /api/analytics/overview` |
| AI Technologies | Nombre de technologies IA distinctes recensées | `GET /api/analytics/ai-technologies` |

Chaque carte affiche la valeur actuelle, une icône représentative et une couleur distinctive (`primary`, `secondary`, `success`, `warning`, `info`, `danger`).

### 6.4.2 Visualisations des projets par pays et par secteur

**Carte interactive (Leaflet) :**

Une carte des pays de la Ligue arabe est rendue avec `react-leaflet`. Chaque pays est représenté par un `CircleMarker` dont le rayon est proportionnel au nombre de projets. Les couleurs suivent un dégradé du jaune clair au rouge foncé selon l'intensité. Le survol affiche une infobulle avec le nom du pays et le nombre de projets.

**Top 10 Countries (BarChart vertical) :**

Un diagramme à barres vertical présente les 10 pays les plus actifs, avec des barres colorées individuellement via des `Cell` components. L'axe X affiche les noms des pays, l'axe Y le nombre de projets.

**Sector Distribution (PieChart avec labels) :**

Un diagramme circulaire (donut) montre la répartition des projets par secteur (ex. Santé, Éducation, Agriculture, Finance...). Chaque secteur est étiqueté avec son nom et son pourcentage. Les couleurs sont définies par une palette sectorielle (`SECTOR_COLORS`).

### 6.4.3 Analyse des SDGs et des technologies IA

**SDG Coverage (BarChart horizontal) :**

Un graphique à barres présente la contribution des projets aux 17 Objectifs de Développement Durable. Chaque barre est colorée selon la couleur officielle du SDG correspondant. Permet d'évaluer l'alignement des projets IA avec les priorités de développement durable.

**Status Distribution (PieChart avec labels) :**

Un diagramme donut illustre la répartition des projets selon leur statut : **Approuvé** (vert), **En attente** (orange), **Rejeté** (rouge). Les labels affichent le nom du statut et son pourcentage.

**Evolution by Year (BarChart) :**

Un graphique en barres montre l'évolution du nombre de projets soumis par année, permettant d'identifier les tendances et la croissance de la plateforme.

**AI Technologies (BarChart horizontal - Top 5) :**

Un diagramme horizontal liste les 5 technologies IA les plus utilisées dans les projets, avec des barres colorées individuellement. Les noms des technologies (NLP, Computer Vision, Robotics, etc.) sont affichés sur l'axe Y.

---

## 6.5 Conception du dashboard Users

Le dashboard Users est réservé aux **administrateurs** de la plateforme (visible uniquement pour le rôle admin). Il fournit des insights sur l'activité des utilisateurs et la gouvernance de la plateforme.

### 6.5.1 Suivi de l'activité des utilisateurs

**Signup Growth (AreaChart) :**

Un graphique en aires montre l'évolution mensuelle des inscriptions. Permet de visualiser les pics d'adoption et les tendances de croissance.

**KPIs utilisateurs :**

| KPI | Description |
|-----|-------------|
| Total Signups | Nombre total d'inscriptions |
| Organization Types | Types d'organisations distincts recensés |
| Activation Rate | Taux d'activation des comptes |
| Active Users | Nombre d'utilisateurs actifs vs total |

### 6.5.2 Tableau des contributeurs les plus actifs

Un tableau avec les colonnes suivantes liste les 3 utilisateurs les plus récents :

- **Organization** — Nom de l'organisation avec logo/avatar
- **Email** — Adresse email du contributeur
- **Country** — Pays d'origine
- **Role** — Rôle sur la plateforme (`admin`, `user`) avec badge coloré
- **Status** — Statut du compte (`Active`/`Inactive`) avec indicateur lumineux
- **Projects** — Nombre de projets soumis

### 6.5.3 Analyse des organisations et des technologies utilisées

**Organization Types (HBarList) :**

Une liste horizontale avec barres de progression montre la répartition des organisations par type (Université, Startup, ONG, Gouvernement, etc.).

**Stakeholders by Category (HBarList) :**

Répartition des parties prenantes par catégorie, avec barres de progression proportionnelles.

---

## 6.6 Description des interfaces réalisées

### 6.6.1 Interface Overview

L'interface Overview est structurée comme suit :

1. **En-tête professionnel** — Barre blanche avec titre "Analytics Dashboard", sous-titre et horodatage en direct avec indicateur vert (point animé)
2. **Bouton Refresh** — Permet de recharger les données à la demande
3. **6 cartes KPI** — Disposées en grille 3×2 avec icônes et couleurs distinctives
4. **Section "Geographic & Sector"** — Carte Leaflet + Top 10 Countries + Sector Distribution
5. **Section "Trends & Technologies"** — Evolution by Year + AI Technologies Top 5
6. **Section "Impact & Quality"** — SDG Coverage + Status Distribution

Le design utilise un fond `#F1F5F9`, des cartes blanches aux angles arrondis (`border-radius: 16px`), des ombres légères et une palette de couleurs cohérente.

### 6.6.2 Interface Users

L'interface Users (admin uniquement) est organisée ainsi :

1. **KPIs utilisateurs** — 4 cartes : Total Signups, Organization Types, Activation Rate, Active Users
2. **Section "Growth & Distribution"** — Signup Growth (AreaChart) + Organization Types (HBarList)
3. **Section "Engagement & Activity"** — Stakeholders by Category (HBarList) + Top 3 Users (tableau)
4. **Contrôle d'accès** — L'onglet est invisible pour les utilisateurs non-admin

---

## 6.7 Apport du module Analytics

Le module Analytics apporte une valeur ajoutée significative à la plateforme SARAI :

1. **Aide à la décision** — Les KPIs et visualisations permettent aux décideurs de comprendre rapidement l'état de l'écosystème IA arabe
2. **Transparence** — La répartition par statut et par secteur offre une visibilité claire sur la qualité et la diversité des projets
3. **Suivi temporel** — L'évolution par année et la croissance des inscriptions permettent de mesurer l'impact de la plateforme
4. **Ciblage géographique** — La carte interactive et le classement par pays aident à identifier les régions actives et celles nécessitant plus d'engagement
5. **Gouvernance** — Le dashboard admin fournit les outils nécessaires à la modération et à la gestion de la qualité
6. **Séparation des rôles** — La distinction entre vue publique et vue admin garantit que chaque utilisateur voit les informations pertinentes à son rôle

---

## Conclusion

Le sprint 4 a permis de doter la plateforme SARAI d'un module analytique complet et professionnel. Les deux tableaux de bord (Overview et Users) répondent aux besoins identifiés en offrant des visualisations pertinentes, une navigation intuitive et une adaptation aux profils utilisateurs. L'architecture modulaire des composants React et l'utilisation de Recharts pour les graphiques garantissent une maintenabilité et une évolutivité à long terme.

Les prochains développements pourront inclure l'export de rapports PDF, l'ajout de filtres temporels avancés et l'intégration de prédictions basées sur l'IA pour anticiper les tendances futures.

---

*Fin du chapitre 6*
