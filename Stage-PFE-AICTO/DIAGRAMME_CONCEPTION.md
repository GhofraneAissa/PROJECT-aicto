# Diagramme de Conception - SARAI Platform

## Stocktaking of Arab Regional AI Initiatives

---

## 1. Architecture Globale (Vue en Couches)

```mermaid
graph TB
    subgraph "🧑‍💻 Client (Frontend)"
        A1["React SPA<br/>Vite + TailwindCSS"]
        A2["i18n<br/>(en/fr/ar)"]
        A3["React Router<br/>12 Pages"]
    end

    subgraph "🌐 Réseau"
        B1["HTTP REST API<br/>port 8000"]
        B2["Axios HTTP Client"]
    end

    subgraph "⚙️ Backend (FastAPI)"
        C1["API Routers<br/>(12 endpoints)"]
        C2["Services<br/>(6 services)"]
        C3["Rate Limiting<br/>(slowapi)"]
        C4["JWT Auth<br/>(python-jose)"]
    end

    subgraph "🧠 Moteurs"
        D1["Moteur de Recherche<br/>Full-Text Search (FTS)"]
        D2["Recherche Sémantique<br/>sentence-transformers"]
        D3["Chatbot RAG<br/>Groq / Ollama LLM"]
    end

    subgraph "💾 Données"
        E1["PostgreSQL / SQLite<br/>(SQLAlchemy ORM)"]
        E2["Entity Embeddings<br/>(Cache mémoire)"]
        E3["Fichiers Uploadés<br/>(uploads/)"]
    end

    subgraph "📧 Services Externes"
        F1["SMTP Email<br/>(Gmail)"]
        F2["Power BI<br/>(Analytics)"]
    end

    A1 -->|"Axios"| B1
    B1 --> C1
    C1 --> C2
    C1 --> C3
    C1 --> C4
    C2 --> D1
    C2 --> D2
    C2 --> D3
    C2 --> E1
    D1 --> E1
    D2 --> E2
    D3 --> E1
    C2 -->|"Envoi emails"| F1
    A1 -->|"Power BI Embedded"| F2
```

---

## 2. Diagramme de Classes (Modèle de Données)

```mermaid
classDiagram
    class User {
        +int id
        +string organization_name
        +string organization_type
        +string email
        +string password_hash
        +string phone
        +string website
        +string country
        +string city
        +string address
        +string sector
        +string description
        +string logo
        +enum role
        +bool is_active
        +bool is_approved
        +string rejection_reason
        +string activation_token
        +string reset_token
        +datetime created_at
        +datetime updated_at
        +datetime last_login
    }

    class Project {
        +int id
        +string title
        +string organization
        +int country_id
        +int user_id
        +string sector
        +string technology
        +int sdg_id
        +string description
        +string website
        +string status
        +int year_of_implementation
        +date start_date
        +date end_date
        +string uploaded_documents
        +string rejection_reason
        +int moderated_by
        +datetime moderated_at
        +datetime submitted_at
        +datetime created_at
        +datetime updated_at
    }

    class Stakeholder {
        +int id
        +string name
        +string type
        +string category
        +string country
        +string website
        +string description
        +string contact_email
        +datetime created_at
        +datetime updated_at
    }

    class Resource {
        +int id
        +string title
        +int user_id
        +string type
        +string category
        +string language
        +string file_size
        +int downloads
        +string description
        +string file_url
        +datetime created_at
        +datetime updated_at
    }

    class Country {
        +int id
        +string country
        +decimal latitude
        +decimal longitude
        +string region
        +string icon_url
    }

    class SDG {
        +int id
        +int goal_number
        +string title
        +string color
        +string image_url
    }

    class ChatSession {
        +int id
        +string session_id
        +int user_id
        +string title
        +datetime created_at
        +datetime updated_at
    }

    class ChatMessage {
        +int id
        +string session_id
        +string role
        +string content
        +string attachments
        +datetime created_at
    }

    class ProjectStakeholderAssociation {
        +int id
        +int project_id
        +int stakeholder_id
        +string role
    }

    class EntityEmbedding {
        +int id
        +string entity_type
        +int entity_id
        +text embedding
        +text content
        +datetime updated_at
    }

    User "1" --> "*" Project : possède
    User "1" --> "*" Resource : publie
    Project "*" --> "1" Country : localisé dans
    Project "*" --> "1" SDG : aligné sur
    Project "*" --> "*" Stakeholder : via ProjectStakeholderAssociation
    Stakeholder "1" --> "*" ProjectStakeholderAssociation : participe à
    Project "1" --> "*" ProjectStakeholderAssociation : a
    User "1" --> "*" ChatSession : a
    ChatSession "1" --> "*" ChatMessage : contient
```

---

## 3. Architecture du Frontend (React)

```mermaid
graph TB
    subgraph "App.jsx (Root)"
        ROOT["Router Principal"]
    end

    subgraph "Composants Partagés"
        NAV["Navbar<br/>(Navigation + Auth)"]
        FT["Footer"]
        CHAT["ChatBot<br/>(Floating RAG)"]
        TOUR["UserGuideTour<br/>(Onboarding)"]
        TOAST["ToastContainer<br/>(Notifications)"]
        SB["SearchBar"]
        CARD["Card"]
    end

    subgraph "Pages"
        HOME["Home"]
        SD["StakeholderDirectory"]
        PS["ProjectStocktaking"]
        PD["ProjectDetails"]
        KM["KnowledgeMap"]
        RL["ResourceLibrary"]
        AN["Analytics"]
        PR["Profile"]
        MP["MyProjects"]
        SG["SDGs"]
        SR["SearchResults"]
        AD["AdminDashboard"]
    end

    subgraph "État Global"
        I18N["i18n<br/>(en/fr/ar)"]
        API["config.js<br/>(API_BASE)"]
    end

    ROOT --> NAV
    ROOT --> FT
    ROOT --> CHAT
    ROOT --> TOUR
    ROOT --> TOAST
    ROOT --> HOME
    ROOT --> SD
    ROOT --> PS
    ROOT --> PD
    ROOT --> KM
    ROOT --> RL
    ROOT --> AN
    ROOT --> PR
    ROOT --> MP
    ROOT --> SG
    ROOT --> SR
    ROOT --> AD

    PS --> SB
    PS --> CARD
    SD --> SB
    SD --> CARD
    RL --> SB
    RL --> CARD

    I18N -.->|"utilise"| ALL_COMPONENTS
    API -.->|"Axios requests"| BACKEND
```

---

## 4. Architecture du Backend (FastAPI)

```mermaid
graph LR
    subgraph "Routers (API)"
        STA["/api/stakeholders"]
        PRO["/api/projects"]
        RES["/api/resources"]
        ANA["/api/analytics"]
        COU["/api/countries"]
        USE["/api/users"]
        SDG["/api/sdgs"]
        ADM["/api/admin"]
        SEA["/api/search"]
        CHA["/api/chat"]
        CON["/api/contact"]
        REP["/api/report"]
    end

    subgraph "Services"
        DOC["document_reader"]
        EMAIL["email_service"]
        EMB["embedding_service"]
        PDF["pdf_report_service"]
        RPT["report_service"]
        SRCH["search_service"]
    end

    subgraph "Modèles (ORM)"
        M_USER["User"]
        M_PROJ["Project"]
        M_STAKE["Stakeholder"]
        M_RES["Resource"]
        M_COUN["Country"]
        M_SDG["SDG"]
        M_CHAT["ChatSession/ChatMessage"]
    end

    subgraph "Database"
        DB["PostgreSQL / SQLite<br/>SQLAlchemy ORM"]
    end

    STA --> M_STAKE
    PRO --> M_PROJ
    RES --> M_RES
    ANA --> M_PROJ
    ANA --> M_STAKE
    ANA --> M_RES
    ANA --> M_USER
    ANA --> M_COUN
    COU --> M_COUN
    USE --> M_USER
    SDG --> M_SDG
    ADM --> M_USER
    ADM --> M_PROJ
    SEA --> SRCH
    SEA --> EMB
    CHA --> M_CHAT
    CON --> EMAIL
    REP --> PDF
    REP --> RPT

    SRCH --> DB
    EMB --> DB
    EMAIL --> SMTP["SMTP (Gmail)"]
    PDF --> DB

    M_USER --> DB
    M_PROJ --> DB
    M_STAKE --> DB
    M_RES --> DB
    M_COUN --> DB
    M_SDG --> DB
    M_CHAT --> DB
```

---

## 5. Schéma Relationnel de la Base de Données

```mermaid
erDiagram
    USERS ||--o{ PROJECTS : "possède"
    USERS ||--o{ RESOURCES : "publie"
    USERS ||--o{ CHAT_SESSIONS : "initie"

    PROJECTS }o--|| COUNTRIES : "localisé dans"
    PROJECTS }o--|| SDG : "aligné sur"
    PROJECTS ||--o{ PROJECT_STAKEHOLDERS : "a"

    STAKEHOLDERS ||--o{ PROJECT_STAKEHOLDERS : "participe à"

    CHAT_SESSIONS ||--o{ CHAT_MESSAGES : "contient"

    ENTITY_EMBEDDINGS }o--|| "projects / stakeholders / resources" : "indexe"

    USERS {
        int id PK
        string organization_name
        enum organization_type
        string email UK
        string password_hash
        string phone
        string website
        string country
        string city
        string sector
        text description
        text logo
        enum role
        bool is_active
        bool is_approved
        string activation_token
        string reset_token
        datetime created_at
    }

    PROJECTS {
        int id PK
        string title
        string organization
        int country_id FK
        int user_id FK
        string sector
        string technology
        int sdg_id FK
        text description
        string status
        int year_of_implementation
        date start_date
        date end_date
        datetime created_at
    }

    STAKEHOLDERS {
        int id PK
        string name
        string type
        string category
        string country
        string website
        text description
        string contact_email
        datetime created_at
    }

    RESOURCES {
        int id PK
        string title
        int user_id FK
        string type
        string category
        string language
        string file_size
        int downloads
        text description
        string file_url
        datetime created_at
    }

    COUNTRIES {
        int id PK
        string country
        decimal latitude
        decimal longitude
        string region
        string icon_url
    }

    SDG {
        int id PK
        int goal_number
        string title
        string color
        string image_url
    }

    PROJECT_STAKEHOLDERS {
        int id PK
        int project_id FK
        int stakeholder_id FK
        string role
    }

    CHAT_SESSIONS {
        int id PK
        string session_id UK
        int user_id FK
        string title
        datetime created_at
    }

    CHAT_MESSAGES {
        int id PK
        string session_id FK
        string role
        text content
        text attachments
        datetime created_at
    }
```

---

## 6. Diagramme de Flux - Authentification & Inscription

```mermaid
sequenceDiagram
    actor User as Utilisateur
    participant FE as Frontend (React)
    participant API as Backend (FastAPI)
    participant DB as Database
    participant Email as SMTP Email

    Note over User,Email: 📝 Inscription
    User->>FE: Remplit formulaire d'inscription
    FE->>API: POST /api/users/register
    API->>DB: Crée User (is_active=false, is_approved=false)
    API->>DB: Génère activation_token
    API->>Email: send_activation_email()
    Email-->>User: 📧 Email d'activation
    API-->>FE: {message: "Veuillez activer votre compte"}
    FE-->>User: ✅ Message de confirmation

    Note over User,Email: 🔑 Activation
    User->>FE: Clique sur lien d'activation
    FE->>API: GET /api/users/activate?token=XXX
    API->>DB: Vérifie & active le compte
    API-->>FE: ✅ Compte activé
    FE-->>User: 🔓 Page de confirmation

    Note over User,Email: 👤 Connexion
    User->>FE: Email + Mot de passe
    FE->>API: POST /api/users/login
    API->>DB: Vérifie credentials
    API->>DB: Vérifie is_active & is_approved
    API-->>FE: {access_token, user}
    FE->>FE: Stocke JWT (localStorage)
    FE-->>User: 🏠 Redirige vers Dashboard

    Note over User,Email: 🔄 Password Reset
    User->>FE: Demande reset
    FE->>API: POST /api/users/forgot-password
    API->>DB: Génère reset_token (15min)
    API->>Email: send_reset_email()
    Email-->>User: 📧 Lien de reset
    User->>FE: Nouveau mot de passe
    FE->>API: POST /api/users/reset-password
    API->>DB: Met à jour password_hash
    API-->>FE: ✅ Mot de passe modifié
```

---

## 7. Pipeline de Recherche Hybride

```mermaid
flowchart TB
    Q["🔍 Requête Utilisateur"] --> PARSE["parse_query()"]
    
    PARSE -->|"Expansion sémantique"| SYN["expand_synonyms()"]
    PARSE -->|"Classification d'intention"| INTENT["classify_intent()"]
    PARSE -->|"Extraction entités"| ENT["Country / Sector / Technology"]
    
    SYN --> FTS["Full-Text Search<br/>(PostgreSQL GIN Index)"]
    SYN --> SEM["Recherche Sémantique<br/>(sentence-transformers)"]
    
    FTS -->|"ts_rank()"| MERGE["Fusion & Score<br/>_rank_hybrid_results()"]
    SEM -->|"cosine_similarity()"| MERGE
    
    ENT --> FILTER["Filtrage<br/>(pays/secteur/technologie)"]
    FILTER --> MERGE
    
    MERGE -->|"Score > 0.3"| R1["Résultats Hybrides"]
    
    MERGE -->|"Aucun résultat"| FALLBACK1["Fallback: Derniers items<br/>_fallback_recent()"]
    FALLBACK1 -->|"Toujours vide"| FALLBACK2["Fuzzy Matching<br/>pg_trgm similarity"]
    FALLBACK2 --> R2["Résultats approximatifs"]
    
    FALLBACK1 --> R3["Items récents"]
    
    R1 --> FINAL["Résultats Finaux<br/>(triés par score)"]
    R2 --> FINAL
    R3 --> FINAL

    subgraph "Suggestions Auto-complétion"
        SUGG_INPUT["Utilisateur tape"] --> SUGG["suggest()<br/>(3 entités)"]
        SUGG --> SUGG_RES["Top suggestions<br/>projets/stakeholders/ressources"]
    end
```

---

## 8. Architecture du Chatbot RAG

```mermaid
sequenceDiagram
    actor User as Utilisateur
    participant FE as Frontend (ChatBot)
    participant API as /api/chat
    participant SRCH as Search Service
    participant EMB as Embedding Service
    participant DB as Database
    participant LLM as Groq / Ollama

    User->>FE: Tape un message
    FE->>API: POST /api/chat/message
    
    API->>DB: Sauvegarde message utilisateur
    
    API->>SRCH: hybrid_search(query)
    SRCH->>EMB: generate_embedding(query)
    SRCH->>DB: FTS + Semantic Search
    DB-->>SRCH: Résultats (projets/stakeholders/resources)
    SRCH-->>API: Contexte récupéré

    Note over API,LLM: Construction du prompt RAG
    API->>LLM: Prompt + Contexte + Historique
    
    alt Groq API
        LLM->>API: Réponse via Groq (LLaMA/Mixtral)
    else Ollama (local)
        LLM->>API: Réponse via Ollama
    end

    API->>DB: Sauvegarde réponse
    API-->>FE: {response, sources[]}
    FE-->>User: ✅ Affiche réponse + sources

    Note over User,FE: Gestion des sessions
    FE->>API: GET /api/chat/sessions
    API-->>FE: Liste des conversations
    User->>FE: Nouveau chat
    FE->>API: POST /api/chat/sessions/new
    API-->>FE: Nouvelle session_id
```

---

## 9. Diagramme de Déploiement

```mermaid
graph TB
    subgraph "Machine Serveur"
        subgraph "Docker / Bare Metal"
            API["FastAPI Server<br/>port 8000"]
            STATIC["Static Files<br/>(Frontend build)"]
            UPLOADS["uploads/"]
            
            subgraph "Base de Données"
                DB["PostgreSQL<br/>ou SQLite"]
            end
            
            subgraph "Services"
                SMTP["SMTP Client"]
                GROQ["Groq API Client"]
                OLLAMA["Ollama (Local LLM)"]
            end
        end
    end

    subgraph "Client"
        BROWSER["Browser<br/>React SPA"]
        PBI["Power BI Desktop"]
    end

    subgraph "Externe"
        GMAIL["Gmail SMTP<br/>smtp.gmail.com:587"]
        GROQ_CLOUD["Groq Cloud<br/>API"]
    end

    BROWSER -->|"HTTP :8000"| API
    BROWSER -->|"Static"| STATIC
    API --> DB
    API --> UPLOADS
    API -->|"SMTP"| GMAIL
    API -->|"GROQ_API"| GROQ_CLOUD
    API --> OLLAMA
    PBI -->|"DB Connection"| DB
```

---

## 10. Légende des Technologies

| Couche | Technologie | Rôle |
|--------|------------|------|
| **Frontend** | React 18 + Vite 5 | Framework UI + Build tool |
| **Frontend** | TailwindCSS 4 | Styling utilitaire |
| **Frontend** | React Router DOM 6 | Routing côté client |
| **Frontend** | react-i18next | Internationalisation (en/fr/ar) |
| **Frontend** | Axios | Client HTTP |
| **Backend** | FastAPI | Framework REST API (Python) |
| **Backend** | SQLAlchemy | ORM (Object Relational Mapping) |
| **Backend** | Pydantic | Validation de données (schemas) |
| **Backend** | python-jose | JWT Authentication |
| **Backend** | slowapi | Rate Limiting |
| **Backend** | sentence-transformers | Embeddings sémantiques |
| **Backend** | Groq SDK / Ollama | LLM pour Chatbot RAG |
| **Backend** | fpdf2 | Génération PDF (rapports) |
| **Database** | PostgreSQL (prod) / SQLite (dev) | Base de données |
| **DevOps** | Docker (optionnel) | Conteneurisation |
| **BI** | Power BI | Tableaux de bord analytiques |

---

## 11. Routes API (Endpoints)

### Projets
- `GET /api/projects` - Liste tous les projets
- `GET /api/projects/{id}` - Détail d'un projet
- `POST /api/projects` - Créer un projet
- `PUT /api/projects/{id}` - Modifier un projet
- `DELETE /api/projects/{id}` - Supprimer un projet

### Utilisateurs
- `POST /api/users/register` - Inscription
- `POST /api/users/login` - Connexion
- `GET /api/users/me` - Profil connecté
- `PUT /api/users/me` - Modifier profil
- `POST /api/users/forgot-password` - Mot de passe oublié
- `POST /api/users/reset-password` - Réinitialiser mot de passe
- `GET /api/users/activate` - Activer compte

### Recherche
- `GET /api/search` - Recherche hybride (FTS + sémantique)
- `GET /api/search/suggest` - Auto-complétion
- `GET /api/search/reindex` - Reconstruire index

### Chat
- `GET /api/chat/sessions` - Liste sessions
- `POST /api/chat/sessions/new` - Nouvelle session
- `POST /api/chat/message` - Envoyer message (RAG)
- `DELETE /api/chat/sessions/{id}` - Supprimer session

### Admin
- `GET /api/admin/pending-projects` - Projets en attente
- `POST /api/admin/approve-project` - Approuver projet
- `POST /api/admin/reject-project` - Rejeter projet
- `GET /api/admin/users` - Gérer utilisateurs
- `POST /api/admin/approve-user` - Approuver organisation
- `POST /api/admin/reject-user` - Rejeter organisation

### Autres
- `GET/POST/PUT/DELETE /api/stakeholders` - CRUD parties prenantes
- `GET/POST/PUT/DELETE /api/resources` - CRUD ressources
- `GET /api/countries` - Liste pays (22 ligue arabe)
- `GET /api/sdgs` - Objectifs de développement durable
- `GET /api/analytics/*` - Statistiques et métriques
- `POST /api/contact` - Formulaire de contact
- `GET /api/report/download` - Télécharger rapport PDF annuel
