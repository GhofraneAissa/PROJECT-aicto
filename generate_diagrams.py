import subprocess, os

PUML_FILES = {}

# ═══════════════════════════════════════════════
# 1. DIAGRAMME DE CAS D'UTILISATION
# ═══════════════════════════════════════════════
PUML_FILES["use_case"] = r"""
@startuml
left to right direction
actor Utilisateur as U
actor Administrateur as A
actor Visiteur as V

rectangle "Plateforme SARAI" {
  usecase "S'inscrire" as UC1
  usecase "Activer son compte" as UC2
  usecase "Se connecter" as UC3
  usecase "Gérer son profil" as UC4
  usecase "Soumettre un projet IA" as UC5
  usecase "Consulter ses projets" as UC6
  usecase "Modifier / Supprimer un projet" as UC7

  usecase "Modérer les projets" as UC8
  usecase "Modérer les utilisateurs" as UC9
  usecase "Gérer l'annuaire stakeholders" as UC10
  usecase "Gérer les ressources" as UC11
  usecase "Consulter les statistiques globales" as UC12

  usecase "Consulter la carte interactive" as UC13
  usecase "Consulter les projets publics" as UC14
  usecase "Consulter les stakeholders" as UC15
  usecase "Consulter les ressources" as UC16
  usecase "Rechercher dans la plateforme" as UC17
  usecase "Utiliser le chatbot" as UC18
  usecase "Visualiser les ODD" as UC19
  usecase "Contacter l'équipe" as UC20
  usecase "Générer un rapport PDF" as UC21
}

U --> UC1
U --> UC2
U --> UC3
U --> UC4
U --> UC5
U --> UC6
U --> UC7
U --> UC17

A --> UC8
A --> UC9
A --> UC10
A --> UC11
A --> UC12
A --> UC21

V --> UC13
V --> UC14
V --> UC15
V --> UC16
V --> UC17
V --> UC18
V --> UC19
V --> UC20

UC1 ..> UC2 : <<include>>
UC5 ..> UC8 : <<include>>
UC1 ..> UC9 : <<include>>
@enduml
"""

# ═══════════════════════════════════════════════
# 2. DIAGRAMME DE SÉQUENCE - AUTHENTIFICATION
# ═══════════════════════════════════════════════
PUML_FILES["sequence_auth"] = r"""
@startuml
actor Utilisateur as U
participant "Frontend React" as FE
participant "Backend FastAPI" as BE
database "PostgreSQL" as DB
participant "SMTP Gmail" as SMTP
actor Admin as AD

== INSCRIPTION ==
U -> FE : Remplir formulaire d'inscription
FE -> BE : POST /api/users/register\n{org_name, email, password, ...}
BE -> DB : INSERT INTO users\n(is_active=false, is_approved=false,\nactivation_token=uuid)
DB --> BE : OK
BE -> SMTP : Envoyer email avec lien d'activation
SMTP --> U : Email reçu

== ACTIVATION ==
U -> FE : Cliquer sur le lien d'activation
FE -> BE : GET /api/users/activate/{token}
BE -> DB : UPDATE users SET is_active=true
DB --> BE : OK
BE --> FE : "Compte activé avec succès"

== APPROBATION ADMIN ==
AD -> FE : Approuver l'utilisateur
FE -> BE : PUT /api/admin/users/{id}/approve
BE -> DB : UPDATE users SET is_approved=true
DB --> BE : OK
BE --> FE : "Utilisateur approuvé"
FE --> AD : Confirmation

== CONNEXION ==
U -> FE : Saisir email + mot de passe
FE -> BE : POST /api/users/login\n{email, password}
BE -> DB : SELECT * FROM users WHERE email=?
DB --> BE : user
BE -> BE : Vérifier password (bcrypt)
BE -> BE : Générer JWT (HS256, 24h)
BE --> FE : {access_token, user}
FE -> U : Session établie

== MOT DE PASSE OUBLIÉ ==
U -> FE : "Mot de passe oublié"
FE -> BE : POST /api/users/forgot-password\n{email}
BE -> DB : UPDATE users SET reset_token=uuid
BE -> SMTP : Email avec lien de reset
SMTP --> U : Email reçu
U -> FE : Saisir nouveau mot de passe
FE -> BE : POST /api/users/reset-password\n{token, new_password}
BE -> DB : SELECT * FROM users WHERE reset_token=?
BE -> BE : Hacher le nouveau password (bcrypt)
BE -> DB : UPDATE users SET password_hash=?
DB --> BE : OK
BE --> FE : "Mot de passe mis à jour"
@enduml
"""

# ═══════════════════════════════════════════════
# 3. DIAGRAMME DE SÉQUENCE - SOUMISSION PROJET
# ═══════════════════════════════════════════════
PUML_FILES["sequence_submission"] = r"""
@startuml
actor Utilisateur as U
participant "Frontend React" as FE
participant "Backend FastAPI" as BE
database "PostgreSQL" as DB
actor Admin as AD

== SOUMISSION D'UN PROJET ==
U -> FE : Remplir le formulaire projet\n(titre, secteur, technologie, ODD,\n pays, description, documents)
FE -> BE : POST /api/projects/\navec fichiers (multipart)
BE -> BE : Vérifier JWT token
BE -> DB : INSERT INTO projects\n(status='pending')
DB --> BE : project_id
BE --> FE : 201 Created\n{project, message}
FE -> U : "Projet soumis avec succès,\n en attente de modération"

== MODÉRATION PAR L'ADMIN ==
AD -> FE : Consulter les projets en attente
FE -> BE : GET /api/admin/projects/pending
BE -> DB : SELECT * FROM projects\nWHERE status='pending'
DB --> BE : Liste des projets
BE --> FE : [{projets en attente}]
FE -> AD : Affiche la liste

AD -> FE : Cliquer sur un projet
FE -> BE : GET /api/projects/{id}
BE -> DB : SELECT * FROM projects WHERE id=?
DB --> BE : Détails du projet
BE --> FE : {project details}
FE -> AD : Consulter les détails

== APPROBATION ==
AD -> FE : Approuver le projet
FE -> BE : PUT /api/projects/{id}/moderate\n{status='approved'}
BE -> DB : UPDATE projects SET\nstatus='approved',\nmoderated_by=admin_id,\nmoderated_at=NOW()
DB --> BE : OK
BE --> FE : 200 OK
FE -> AD : "Projet approuvé"
note right FE : Le projet devient visible\nsur la carte interactive,\nles analytics et les filtres

== REJET ==
AD -> FE : Rejeter le projet
FE -> BE : PUT /api/projects/{id}/moderate\n{status='rejected', reason='...'}
BE -> DB : UPDATE projects SET\nstatus='rejected', rejection_reason='...'
DB --> BE : OK
BE --> FE : 200 OK
FE -> AD : "Projet rejeté"
FE -> U : Notification de rejet + motif
@enduml
"""

# ═══════════════════════════════════════════════
# 4. DIAGRAMME DE CLASSES
# ═══════════════════════════════════════════════
PUML_FILES["class_diagram"] = r"""
@startuml
skinparam classAttributeIconSize 0

class User {
  - id: Integer
  - organization_name: String
  - organization_type: String
  - email: String
  - password_hash: String
  - phone: String
  - website: String
  - country: String
  - city: String
  - address: String
  - sector: String
  - description: Text
  - logo: Text
  - role: Enum(admin, organization)
  - is_active: Boolean
  - is_approved: Boolean
  - activation_token: String
  - reset_token: String
  - reset_token_expiry: DateTime
  - created_at: DateTime
  - last_login: DateTime
  --
  + to_dict(): Dict
}

class Project {
  - id: Integer
  - title: Text
  - organization: String
  - country_id: Integer
  - user_id: Integer
  - sector: String
  - technology: String
  - sdg_id: Integer
  - description: Text
  - website: String
  - status: String
  - year_of_implementation: Integer
  - start_date: Date
  - end_date: Date
  - uploaded_documents: Text
  - rejection_reason: Text
  - moderated_by: Integer
  - moderated_at: DateTime
  - submitted_at: DateTime
  - created_at: DateTime
  - updated_at: DateTime
}

class Stakeholder {
  - id: Integer
  - name: String
  - type: String
  - category: String
  - country: String
  - website: String
  - description: Text
  - contact_email: String
  - created_at: DateTime
}

class Resource {
  - id: Integer
  - title: String
  - type: String
  - category: String
  - language: String
  - file_size: String
  - downloads: Integer
  - description: Text
  - file_url: String
  - created_at: DateTime
}

class Country {
  - id: Integer
  - country: String
  - latitude: Numeric
  - longitude: Numeric
  - region: String
  - icon_url: String
}

class SDG {
  - id: Integer
  - goal_number: Integer
  - title: Text
  - color: String
  - image_url: Text
}

class ProjectStakeholderAssociation {
  - id: Integer
  - project_id: Integer
  - stakeholder_id: Integer
  - role: String
}

User "1" -- "*" Project : possède
User "1" -- "0..*" Project : modère
Country "1" -- "*" Project : localisé dans
SDG "1" -- "*" Project : aligné sur
Project "*" -- "*" Stakeholder : associe à
ProjectStakeholderAssociation "1" -- "1" Project
ProjectStakeholderAssociation "1" -- "1" Stakeholder
note "Table d'association\nN:N" as N
ProjectStakeholderAssociation .. N
@enduml
"""

# ═══════════════════════════════════════════════
# 5. DIAGRAMME DE DÉPLOIEMENT
# ═══════════════════════════════════════════════
PUML_FILES["deployment"] = r"""
@startuml
skinparam componentStyle rectangle

node "Client (Navigateur Web)" {
  [React SPA - Port 3001] as FRONT
  file "auth.html" as AUTH
  file "forgot-password.html" as FPWD
  file "reset-password.html" as RPWD
}

node "Serveur Backend (Uvicorn - Port 8000)" {
  [FastAPI Application] as API

  package "Routers" {
    [Users Router] as R1
    [Projects Router] as R2
    [Stakeholders Router] as R3
    [Resources Router] as R4
    [Analytics Router] as R5
    [Countries Router] as R6
    [SDGs Router] as R7
    [Search Router] as R8
    [Admin Router] as R9
    [Chat Router] as R10
    [Contact Router] as R11
    [Report Router] as R12
  }

  package "Services" {
    [Email Service] as S1
    [PDF Report Service] as S2
    [Search Service] as S3
    [Embedding Service] as S4
    [Document Reader] as S5
  }

  database "PostgreSQL\n(SARAI_DB)" as PG
  database "SQLite\n(sarai.db fallback)" as SQ

  API --> R1
  API --> R2
  API --> R3
  API --> R4
  API --> R5
  API --> R6
  API --> R7
  API --> R8
  API --> R9
  API --> R10
  API --> R11
  API --> R12

  R2 --> S2
  R8 --> S3
  R8 --> S4
  R10 --> S4
  R10 --> S5
  R12 --> S2

  R1 --> S1
  R12 --> S1

  API --> PG : SQLAlchemy ORM
  API --> SQ : fallback dev
}

node "Services Externes" {
  [SMTP Gmail] as SMTP
  [Swagger UI (/docs)] as SWAGGER
}

FRONT --> API : HTTP REST (JSON)
AUTH --> API : Pages statiques
FPWD --> API
RPWD --> API
API --> SMTP : Activation / Reset / Report
API --> SWAGGER : OpenAPI 3.0
@enduml
"""

# ═══════════════════════════════════════════════
# 6. DIAGRAMME ENTITÉ-RELATION (ERD)
# ═══════════════════════════════════════════════
PUML_FILES["erd"] = r"""
@startuml
!define table(x) entity x <<T, #F5F5DC>>

table(users) {
  * id : INTEGER <<PK>>
  --
  * organization_name : VARCHAR(255)
  * organization_type : VARCHAR(50)
  * email : VARCHAR(255) <<UNIQUE>>
  * password_hash : VARCHAR(255)
  o phone : VARCHAR(50)
  o website : VARCHAR(500)
  o country : VARCHAR(100)
  o city : VARCHAR(100)
  o address : VARCHAR(500)
  o sector : VARCHAR(150)
  o description : TEXT
  o logo : TEXT
  * role : ENUM(admin, organization)
  * is_active : BOOLEAN
  * is_approved : BOOLEAN
  o rejection_reason : TEXT
  o activation_token : VARCHAR(100) <<UNIQUE>>
  o reset_token : VARCHAR(100) <<UNIQUE>>
  o reset_token_expiry : TIMESTAMP
  o last_login : TIMESTAMP
  * created_at : TIMESTAMP
}

table(projects) {
  * id : INTEGER <<PK>>
  --
  * title : TEXT
  * organization : VARCHAR(255)
  * country_id : INTEGER <<FK>>
  * user_id : INTEGER <<FK>>
  * sector : VARCHAR(100)
  o technology : VARCHAR(100)
  o sdg_id : INTEGER <<FK>>
  o description : TEXT
  o website : VARCHAR(500)
  o status : VARCHAR(50)
  o year_of_implementation : INTEGER
  o start_date : DATE
  o end_date : DATE
  o uploaded_documents : TEXT
  o rejection_reason : TEXT
  o moderated_by : INTEGER <<FK>>
  o moderated_at : TIMESTAMP
  o submitted_at : TIMESTAMP
  * created_at : TIMESTAMP
}

table(stakeholders) {
  * id : INTEGER <<PK>>
  --
  * name : VARCHAR(255)
  * type : VARCHAR(100)
  o category : VARCHAR(100)
  o country : VARCHAR(100)
  o website : VARCHAR(500)
  o description : TEXT
  o contact_email : VARCHAR(255)
  o created_at : TIMESTAMP
}

table(resources) {
  * id : INTEGER <<PK>>
  --
  * title : VARCHAR(255)
  * type : VARCHAR(100)
  * category : VARCHAR(100)
  o language : VARCHAR(50)
  o file_size : VARCHAR(50)
  o downloads : INTEGER
  o description : TEXT
  o file_url : VARCHAR(500)
  o created_at : TIMESTAMP
}

table(countries) {
  * id : INTEGER <<PK>>
  --
  * country : VARCHAR(80)
  o latitude : NUMERIC(9,6)
  o longitude : NUMERIC(9,6)
  o region : VARCHAR(60)
  o icon_url : VARCHAR(500)
}

table(sdg) {
  * id : INTEGER <<PK>>
  --
  * goal_number : INTEGER
  * title : TEXT
  * color : VARCHAR(10)
  * image_url : TEXT
}

table(project_stakeholders) {
  * id : INTEGER <<PK>>
  --
  * project_id : INTEGER <<FK>>
  * stakeholder_id : INTEGER <<FK>>
  o role : VARCHAR(50)
}

users ||--o{ projects : "user_id"
users ||--o{ projects : "moderated_by"
countries ||--o{ projects : "country_id"
sdg ||--o{ projects : "sdg_id"
projects ||--o{ project_stakeholders : "project_id"
stakeholders ||--o{ project_stakeholders : "stakeholder_id"

note top of users : 22 pays\nRôles: admin/organization\nActivation + Reset token
note top of projects : Statut: pending/approved/rejected\nModération par admin
note top of project_stakeholders : Table d'association N:N\nentre projets et stakeholders
@enduml
"""

# ═══════════════════════════════════════════════
# 7. DIAGRAMME DE SÉQUENCE - RECHERCHE & CHATBOT
# ═══════════════════════════════════════════════
PUML_FILES["sequence_search"] = r"""
@startuml
actor Utilisateur as U
participant "Frontend React" as FE
participant "Backend FastAPI" as BE
database "PostgreSQL" as DB

== RECHERCHE AVEC SUGGESTIONS ==
U -> FE : Taper dans la barre de recherche
FE -> FE : Debounce 300ms
FE -> BE : GET /api/search/suggestions?q=IA
BE -> DB : SELECT * FROM projects\nWHERE title ILIKE '%IA%'\nUNION\nSELECT * FROM stakeholders\nWHERE name ILIKE '%IA%'
DB --> BE : [{suggestions}]
BE --> FE : [{id, type, title, ...}]
FE -> U : Afficher les suggestions dropdown

== RECHERCHE COMPLÈTE ==
U -> FE : Appuyer sur Entrée
FE -> BE : GET /api/search/?q=IA&sector=Health&country=tunisia
BE -> DB : SELECT avec filtres combinés
DB --> BE : [{resultats combinés}]
BE --> FE : {projects: [...], stakeholders: [...], resources: [...]}
FE -> U : Afficher les résultats par catégorie

== UTILISATION DU CHATBOT ==
U -> FE : "Quels sont les projets IA en Tunisie ?"
FE -> BE : POST /api/chat/\n{message, session_id}
BE -> BE : Embedding de la question
BE -> DB : Recherche sémantique (similarité)
DB --> BE : {contexte pertinent}
BE -> BE : Générer réponse (template)
BE --> FE : {response, sources}
FE -> U : "Voici les projets IA en Tunisie : ..."
@enduml
"""

# ═══════════════════════════════════════════════
# GENERATE ALL DIAGRAMS
# ═══════════════════════════════════════════════
os.makedirs("docs/uml", exist_ok=True)

for name, puml_content in PUML_FILES.items():
    puml_path = f"docs/uml/{name}.puml"
    png_path = f"docs/uml/{name}.png"

    with open(puml_path, "w", encoding="utf-8") as f:
        f.write(puml_content.strip())
    print(f"[PUML] Written: {puml_path}")

    result = subprocess.run(
        ["java", "-jar", "plantuml.jar", puml_path, "-tpng", "-o", os.path.abspath("docs/uml")],
        capture_output=True, text=True, timeout=60000
    )
    # PlantUML writes output to the same directory as the input by default
    # Let's try specifying output directly
    result2 = subprocess.run(
        ["java", "-jar", "plantuml.jar", puml_path, "-tpng"],
        capture_output=True, text=True, timeout=60000, cwd=os.path.abspath("docs/uml")
    )

    if os.path.exists(puml_path.replace(".puml", ".png")):
        print(f"[PNG] Generated: {puml_path.replace('.puml', '.png')}")
    elif os.path.exists(f"docs/uml/{name}.png"):
        print(f"[PNG] Generated: docs/uml/{name}.png")
    else:
        print(f"[ERROR] PNG not found for {name}")
        print(f"  stdout: {result2.stdout}")
        print(f"  stderr: {result2.stderr}")

print("\n=== All diagrams generated ===")
