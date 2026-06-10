# Guide Power BI — SARAI Analytics Dashboard

## 1. Prérequis

- **Power BI Desktop** (gratuit) : [télécharger](https://powerbi.microsoft.com/fr-fr/downloads/)
- **Backend SARAI** en cours d'exécution sur `http://localhost:8000`

## 2. Connexion à l'API REST

Dans Power BI Desktop :

1. **Obtenir des données** → **Web**
2. Entrer : `http://localhost:8000/api/analytics/overview`
3. Cliquer sur OK
4. Dans le **Power Query Editor**, transformer la réponse JSON en tableau

## 3. Script Power Query M complet

Dans Power BI Desktop : **Obtenir des données** → **Requête vide** → **Éditeur avancé** → coller le code ci-dessous.

Chaque endpoint devient une table dans le modèle de données.

```powerquery
// SARAI — Power Query M Script
// Colle chaque bloc dans une requête vide séparée

// ═══════════════════════════════════════════════
// Toutes les requêtes en un seul script
// ═══════════════════════════════════════════════
// 1. Crée une nouvelle "Requête vide"
// 2. Ouvre l'éditeur avancé
// 3. Remplace tout le contenu par le bloc correspondant
// 4. Renomme la requête avec le nom indiqué

// Pour exécuter les 20+ requêtes, répète l'opération pour chaque section.
// Option recommandée : regroupe tout dans un dossier "SARAI API"

// ───────────────────────────────────────────────
// REQUÊTE : Overview
// ───────────────────────────────────────────────
let
    Source = Json.Document(Web.Contents("http://localhost:8000/api/analytics/overview")),
    #"Converti en tableau" = Record.ToTable(Source),
    #"Colonne renommée" = Table.RenameColumns(#"Converti en tableau", {{"Name", "Metric"}, {"Value", "Value"}}),
    #"Type modifié" = Table.TransformColumnTypes(#"Colonne renommée", {{"Value", type text}})
in
    #"Type modifié"

// ───────────────────────────────────────────────
// REQUÊTE : StatusDistribution
// ───────────────────────────────────────────────
let
    Source = Json.Document(Web.Contents("http://localhost:8000/api/analytics/status-distribution")),
    #"Converti en tableau" = Table.FromList(Source, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    #"Colonnes développées" = Table.ExpandRecordColumn(#"Converti en tableau", "Column1", {"status", "count"}),
    #"Type modifié" = Table.TransformColumnTypes(#"Colonnes développées", {{"count", Int64.Type}})
in
    #"Type modifié"

// ───────────────────────────────────────────────
// REQUÊTE : StatusBreakdown
// ───────────────────────────────────────────────
let
    Source = Json.Document(Web.Contents("http://localhost:8000/api/analytics/status-breakdown")),
    // Approval Pipeline
    ApprovalPipeline = Source[approvalPipeline],
    #"Pipeline en tableau" = Table.FromList(ApprovalPipeline, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    #"Pipeline développé" = Table.ExpandRecordColumn(#"Pipeline en tableau", "Column1", {"status", "count", "label", "color"}),
    #"Type Pipeline" = Table.TransformColumnTypes(#"Pipeline développé", {{"count", Int64.Type}}),
    // Activity Status
    ActivityStatus = Source[activityStatus],
    #"Activity en tableau" = Table.FromList(ActivityStatus, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    #"Activity développé" = Table.ExpandRecordColumn(#"Activity en tableau", "Column1", {"status", "count", "label", "color"}),
    #"Type Activity" = Table.TransformColumnTypes(#"Activity développé", {{"count", Int64.Type}})
in
    #"Type Pipeline"
// Note: crée 2 requêtes séparées pour Pipeline et Activity

// ───────────────────────────────────────────────
// REQUÊTE : ProjectsBySector
// ───────────────────────────────────────────────
let
    Source = Json.Document(Web.Contents("http://localhost:8000/api/analytics/projects-by-sector")),
    #"Converti en tableau" = Table.FromList(Source, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    #"Colonnes développées" = Table.ExpandRecordColumn(#"Converti en tableau", "Column1", {"sector", "count"}),
    #"Type modifié" = Table.TransformColumnTypes(#"Colonnes développées", {{"count", Int64.Type}})
in
    #"Type modifié"

// ───────────────────────────────────────────────
// REQUÊTE : AiTechnologies
// ───────────────────────────────────────────────
let
    Source = Json.Document(Web.Contents("http://localhost:8000/api/analytics/ai-technologies")),
    #"Converti en tableau" = Table.FromList(Source, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    #"Colonnes développées" = Table.ExpandRecordColumn(#"Converti en tableau", "Column1", {"technology", "count"}),
    #"Type modifié" = Table.TransformColumnTypes(#"Colonnes développées", {{"count", Int64.Type}})
in
    #"Type modifié"

// ───────────────────────────────────────────────
// REQUÊTE : ProjectsByCountry
// ───────────────────────────────────────────────
let
    Source = Json.Document(Web.Contents("http://localhost:8000/api/analytics/projects-by-country")),
    #"Converti en tableau" = Table.FromList(Source, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    #"Colonnes développées" = Table.ExpandRecordColumn(#"Converti en tableau", "Column1", {"country", "projects"}),
    #"Type modifié" = Table.TransformColumnTypes(#"Colonnes développées", {{"projects", Int64.Type}})
in
    #"Type modifié"

// ───────────────────────────────────────────────
// REQUÊTE : SubmissionsByMonth
// ───────────────────────────────────────────────
let
    Source = Json.Document(Web.Contents("http://localhost:8000/api/analytics/submissions-by-month")),
    #"Converti en tableau" = Table.FromList(Source, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    #"Colonnes développées" = Table.ExpandRecordColumn(#"Converti en tableau", "Column1", {"year", "month", "count"}),
    // Créer une colonne date
    #"Type modifié" = Table.TransformColumnTypes(#"Colonnes développées", {{"year", Int64.Type}, {"month", Int64.Type}, {"count", Int64.Type}}),
    #"Date ajoutée" = Table.AddColumn(#"Type modifié", "Date", each #date([year], [month], 1)),
    #"Colonne Label" = Table.AddColumn(#"Date ajoutée", "Label", each Text.From([year]) & "-" & Text.PadStart(Text.From([month]), 2, "0"))
in
    #"Colonne Label"

// ───────────────────────────────────────────────
// REQUÊTE : ApprovedRejectedByMonth
// ───────────────────────────────────────────────
let
    Source = Json.Document(Web.Contents("http://localhost:8000/api/analytics/approved-rejected-by-month")),
    #"Converti en tableau" = Table.FromList(Source, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    #"Colonnes développées" = Table.ExpandRecordColumn(#"Converti en tableau", "Column1", {"month", "approved", "rejected", "top_rejection_reason"}),
    #"Type modifié" = Table.TransformColumnTypes(#"Colonnes développées", {{"approved", Int64.Type}, {"rejected", Int64.Type}})
in
    #"Type modifié"

// ───────────────────────────────────────────────
// REQUÊTE : ModerationQueue
// ───────────────────────────────────────────────
let
    Source = Json.Document(Web.Contents("http://localhost:8000/api/analytics/moderation-queue")),
    #"Converti en tableau" = Table.FromList(Source, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    #"Colonnes développées" = Table.ExpandRecordColumn(#"Converti en tableau", "Column1", {"id", "title", "organization", "country", "sector", "submitted_at"}),
    #"Type modifié" = Table.TransformColumnTypes(#"Colonnes développées", {{"id", Int64.Type}})
in
    #"Type modifié"

// ───────────────────────────────────────────────
// REQUÊTE : SdgCoverage
// ───────────────────────────────────────────────
let
    Source = Json.Document(Web.Contents("http://localhost:8000/api/analytics/sdg-coverage")),
    #"Converti en tableau" = Table.FromList(Source, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    #"Colonnes développées" = Table.ExpandRecordColumn(#"Converti en tableau", "Column1", {"goal_number", "title", "color", "count"}),
    #"Type modifié" = Table.TransformColumnTypes(#"Colonnes développées", {{"goal_number", Int64.Type}, {"count", Int64.Type}})
in
    #"Type modifié"

// ───────────────────────────────────────────────
// REQUÊTE : ProjectsByRegion
// ───────────────────────────────────────────────
let
    Source = Json.Document(Web.Contents("http://localhost:8000/api/analytics/projects-by-region")),
    #"Converti en tableau" = Table.FromList(Source, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    #"Colonnes développées" = Table.ExpandRecordColumn(#"Converti en tableau", "Column1", {"region", "count"}),
    #"Type modifié" = Table.TransformColumnTypes(#"Colonnes développées", {{"count", Int64.Type}})
in
    #"Type modifié"

// ───────────────────────────────────────────────
// REQUÊTE : RegionSdgDominant
// ───────────────────────────────────────────────
let
    Source = Json.Document(Web.Contents("http://localhost:8000/api/analytics/region-sdg-dominant")),
    #"Converti en tableau" = Table.FromList(Source, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    #"Colonnes développées" = Table.ExpandRecordColumn(#"Converti en tableau", "Column1", {"region", "dominant_sdg", "dominant_sdg_title", "dominant_sdg_color", "project_count"}),
    #"Type modifié" = Table.TransformColumnTypes(#"Colonnes développées", {{"dominant_sdg", Int64.Type}, {"project_count", Int64.Type}})
in
    #"Type modifié"

// ───────────────────────────────────────────────
// REQUÊTE : TechBySector (Technology-by-Sector)
// ───────────────────────────────────────────────
let
    Source = Json.Document(Web.Contents("http://localhost:8000/api/analytics/technology-by-sector")),
    #"Converti en tableau" = Table.FromList(Source, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    #"Colonnes développées" = Table.ExpandRecordColumn(#"Converti en tableau", "Column1", {"sector", "technology", "count"}),
    #"Type modifié" = Table.TransformColumnTypes(#"Colonnes développées", {{"count", Int64.Type}})
in
    #"Type modifié"

// ───────────────────────────────────────────────
// REQUÊTE : DurationVsSdg
// ───────────────────────────────────────────────
let
    Source = Json.Document(Web.Contents("http://localhost:8000/api/analytics/duration-vs-sdg")),
    #"Converti en tableau" = Table.FromList(Source, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    #"Colonnes développées" = Table.ExpandRecordColumn(#"Converti en tableau", "Column1", {"project_id", "title", "sector", "duration_days", "sdg_count"}),
    #"Type modifié" = Table.TransformColumnTypes(#"Colonnes développées", {{"project_id", Int64.Type}, {"duration_days", Int64.Type}, {"sdg_count", Int64.Type}})
in
    #"Type modifié"

// ───────────────────────────────────────────────
// REQUÊTE : ActiveTimeline
// ───────────────────────────────────────────────
let
    Source = Json.Document(Web.Contents("http://localhost:8000/api/analytics/projects-active-timeline")),
    #"Converti en tableau" = Table.FromList(Source, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    #"Colonnes développées" = Table.ExpandRecordColumn(#"Converti en tableau", "Column1", {"id", "title", "sector", "country", "start_date", "end_date"}),
    #"Type modifié" = Table.TransformColumnTypes(#"Colonnes développées", {{"id", Int64.Type}, {"start_date", type date}, {"end_date", type date}}),
    #"Durée ajoutée" = Table.AddColumn(#"Type modifié", "duration_days", each Duration.Days([end_date] - [start_date]), Int64.Type)
in
    #"Durée ajoutée"

// ───────────────────────────────────────────────
// REQUÊTE : UserSignups
// ───────────────────────────────────────────────
let
    Source = Json.Document(Web.Contents("http://localhost:8000/api/analytics/user-signups")),
    #"Converti en tableau" = Table.FromList(Source, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    #"Colonnes développées" = Table.ExpandRecordColumn(#"Converti en tableau", "Column1", {"year", "month", "count", "cumulative"}),
    #"Type modifié" = Table.TransformColumnTypes(#"Colonnes développées", {{"year", Int64.Type}, {"month", Int64.Type}, {"count", Int64.Type}, {"cumulative", Int64.Type}}),
    #"Date ajoutée" = Table.AddColumn(#"Type modifié", "Date", each #date([year], [month], 1))
in
    #"Date ajoutée"

// ───────────────────────────────────────────────
// REQUÊTE : UsersByOrgType
// ───────────────────────────────────────────────
let
    Source = Json.Document(Web.Contents("http://localhost:8000/api/analytics/users-by-organization-type")),
    #"Converti en tableau" = Table.FromList(Source, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    #"Colonnes développées" = Table.ExpandRecordColumn(#"Converti en tableau", "Column1", {"type", "count"}),
    #"Type modifié" = Table.TransformColumnTypes(#"Colonnes développées", {{"count", Int64.Type}})
in
    #"Type modifié"

// ───────────────────────────────────────────────
// REQUÊTE : UsersByCountry
// ───────────────────────────────────────────────
let
    Source = Json.Document(Web.Contents("http://localhost:8000/api/analytics/users-by-country")),
    #"Converti en tableau" = Table.FromList(Source, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    #"Colonnes développées" = Table.ExpandRecordColumn(#"Converti en tableau", "Column1", {"country", "count"}),
    #"Type modifié" = Table.TransformColumnTypes(#"Colonnes développées", {{"count", Int64.Type}})
in
    #"Type modifié"

// ───────────────────────────────────────────────
// REQUÊTE : StakeholdersByCategory
// ───────────────────────────────────────────────
let
    Source = Json.Document(Web.Contents("http://localhost:8000/api/analytics/stakeholders-by-category")),
    #"Converti en tableau" = Table.FromList(Source, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    #"Colonnes développées" = Table.ExpandRecordColumn(#"Converti en tableau", "Column1", {"category", "count"}),
    #"Type modifié" = Table.TransformColumnTypes(#"Colonnes développées", {{"count", Int64.Type}})
in
    #"Type modifié"

// ───────────────────────────────────────────────
// REQUÊTE : StakeholdersByType
// ───────────────────────────────────────────────
let
    Source = Json.Document(Web.Contents("http://localhost:8000/api/analytics/stakeholders-by-type")),
    #"Converti en tableau" = Table.FromList(Source, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    #"Colonnes développées" = Table.ExpandRecordColumn(#"Converti en tableau", "Column1", {"type", "count"}),
    #"Type modifié" = Table.TransformColumnTypes(#"Colonnes développées", {{"count", Int64.Type}})
in
    #"Type modifié"

// ───────────────────────────────────────────────
// REQUÊTE : ProjectsPerUser
// ───────────────────────────────────────────────
let
    Source = Json.Document(Web.Contents("http://localhost:8000/api/analytics/projects-per-user")),
    Distribution = Source[distribution],
    Average = Source[average],
    #"Distribution tableau" = Table.FromList(Distribution, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    #"Colonnes développées" = Table.ExpandRecordColumn(#"Distribution tableau", "Column1", {"range", "count"}),
    #"Type modifié" = Table.TransformColumnTypes(#"Colonnes développées", {{"count", Int64.Type}})
in
    #"Type modifié"

// ───────────────────────────────────────────────
// REQUÊTE : RecentUsers
// ───────────────────────────────────────────────
let
    Source = Json.Document(Web.Contents("http://localhost:8000/api/analytics/recent-users")),
    #"Converti en tableau" = Table.FromList(Source, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    #"Colonnes développées" = Table.ExpandRecordColumn(#"Converti en tableau", "Column1", {"id", "organization_name", "organization_type", "country", "role", "is_active", "last_login", "created_at"}),
    #"Type modifié" = Table.TransformColumnTypes(#"Colonnes développées", {{"id", Int64.Type}, {"is_active", type logical}})
in
    #"Type modifié"
```

## 4. Correspondance visualisations ↔ données

### Dashboard 1 — Vue d'ensemble des projets

| Visuel Power BI | Table source | Configuration |
|---|---|---|
| **Cartes KPI (x6)** | Overview | Valeur = Value, Catégorie = Metric (filtrer par métrique) |
| **Donut - Pipeline approbation** | StatusBreakdown (ApprovalPipeline) | Légende = label, Valeurs = count |
| **Donut - Actifs/Terminés** | StatusBreakdown (ActivityStatus) | Légende = label, Valeurs = count |
| **Histogramme - Projets par pays** | ProjectsByCountry | Axe X = country, Axe Y = projects |
| **Barre horizontale - Projets par secteur** | ProjectsBySector | Axe Y = sector, Axe X = count |
| **Aire - Soumissions par mois** | SubmissionsByMonth | Axe X = Date, Axe Y = count |
| **Barre verticale - Technologies** | AiTechnologies | Axe X = technology, Axe Y = count |
| **Histogramme groupe - Approuvés vs Rejetés** | ApprovedRejectedByMonth | Axe X = month, Axe Y = approved & rejected |
| **Tableau - File de modération** | ModerationQueue | Colonnes : title, organization, country, sector, submitted_at |

### Dashboard 2 — Impact & ODD Stratégique

| Visuel Power BI | Table source | Configuration |
|---|---|---|
| **Radar - Couverture ODD** | SdgCoverage | Catégorie = goal_number, Valeurs = count |
| **Histogramme - Top ODD** | SdgCoverage | Axe Y = goal_number, Axe X = count (filtrer top 10) |
| **Treemap - Technologies × Secteurs** | TechBySector | Catégorie = technology, Détails = sector, Valeurs = count |
| **Histogramme - Projets par région** | ProjectsByRegion | Axe X = region, Axe Y = count |
| **Nuage de points - Durée vs ODD** | DurationVsSdg | Axe X = duration_days, Axe Y = sdg_count, Détails = title |
| **Barre - Durée des projets** | ActiveTimeline | Axe X = title, Axe Y = duration_days, Légende = sector |

### Dashboard 3 — Communauté & Acteurs

| Visuel Power BI | Table source | Configuration |
|---|---|---|
| **Histogramme + Ligne - Inscrits** | UserSignups | Barres = count, Ligne = cumulative, Axe X = Date |
| **Donut - Type organisation** | UsersByOrgType | Légende = type, Valeurs = count |
| **Barre horizontale - Stakeholders par catégorie** | StakeholdersByCategory | Axe Y = category, Axe X = count |
| **Histogramme - Utilisateurs par pays** | UsersByCountry | Axe X = country, Axe Y = count |
| **Histogramme - Distribution projets/utilisateur** | ProjectsPerUser | Axe X = range, Axe Y = count |
| **Tableau - Utilisateurs récents** | RecentUsers | Colonnes : organization_name, organization_type, country, role, is_active, last_login |

## 5. Création des mesures DAX (optionnel)

Quelques mesures DAX utiles à ajouter dans le modèle :

```dax
// Taux d'approbation global
Approval Rate = 
    DIVIDE(
        CALCULATE(SUM('ApprovedRejectedByMonth'[approved])),
        CALCULATE(SUM('ApprovedRejectedByMonth'[approved])) + 
        CALCULATE(SUM('ApprovedRejectedByMonth'[rejected]))
    ) * 100

// Projets actifs (end_date > today)
Active Projects = 
    CALCULATE(
        COUNTROWS('ActiveTimeline'),
        'ActiveTimeline'[end_date] >= TODAY()
    )

// Projets terminés
Completed Projects = 
    CALCULATE(
        COUNTROWS('ActiveTimeline'),
        'ActiveTimeline'[end_date] < TODAY()
    )
```

## 6. Actualisation des données

- **Actualisation manuelle** : bouton Actualiser dans Power BI Desktop
- **Actualisation programmée** : publier sur le **Power BI Service** et configurer une passerelle (gateway) vers `localhost:8000`
- Pour une solution sans passerelle, déployer le backend sur un serveur public ou utiliser **Power BI Dataflows** avec un connecteur Web

## 7. Export vers le fichier pfe.pbix

Une fois les requêtes et visualisations créées :
1. **Fichier → Enregistrer** → `pfe.pbix` dans le dossier racine du projet
2. Le fichier contiendra tout : modèle de données, relations, mesures, visuels

---
*Document généré le 22/05/2026 pour le projet SARAI - AICTO*
