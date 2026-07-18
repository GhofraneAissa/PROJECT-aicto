# Session Memory

## Goal
Build and maintain the SARAI platform — a web app for cataloguing AI projects across the Arab League, with AI‑powered extraction from LinkedIn posts, LinkedIn OAuth, account activation via code, role‑based moderation, and a Power BI‑style analytics dashboard with separate Public and Admin views.

## Key Changes by Session

### Session: Professional Dashboard Rewrite (Public + Admin)

**Backend (`backend/app/routers/analytics.py`):**
- Added 3 new admin endpoints: `GET /admin/notifications`, `/admin/last-logins`, `/admin/downloads-timeline`
- Added `approved_orgs`, `pending_orgs`, `total_downloads` to `/admin/overview` response
- Added `Notification` model import

**Frontend (`frontend/src/pages/Analytics.jsx`):**
- COMPLETE REWRITE: Professional 3-tab public dashboard with:
  - 6 KPIs: Total Projects, Active Countries, Total Stakeholders, Total Resources, Approved Projects, AI Technologies
  - Visual 1: Leaflet interactive Arab map with CircleMarkers sized by project count
  - Visual 2: Top 10 Countries horizontal BarChart
  - Visual 3: Sector Distribution donut + HBarList
  - Visual 4: AI Technologies Treemap (recharts)
  - Visual 5: Evolution by Year AreaChart
  - Visual 6: SDG Distribution horizontal BarChart (colored by SDG)
  - Visual 7: Organization Types donut (stakeholders-by-type)
  - Visual 8: Project Status donut (approved/pending/rejected)
  - SDG & Geography tab: full SDG bar chart, projects by region, country detail table
  - Users & Stakeholders tab: signup growth, org types, stakeholders by category/type, resources by type
  - Leaflet integration with `react-leaflet` and `leaflet/dist/leaflet.css`

**Frontend (`frontend/src/pages/AdminDashboard.jsx`):**
- COMPLETE REWRITE: Professional admin dashboard with:
  - 10 KPIs: Registered Users, Approved Orgs, Pending Orgs, Activated Accounts, Pending Projects, Rejected Projects, Approval Rate, Total Downloads, Unread Notifications, Last Login
  - 8 Admin Visuals: User Registration (LineChart), Project Submission (AreaChart), Validation Workflow funnel (ComposedChart), Org Status (donut), Top Organizations (horizontal BarChart), Most Downloaded Resources (horizontal BarChart), Activity by Country (BarChart), Users by Type (donut)
  - User Management tab: users by country, account status, users by role, latest registrations, most active users tables
  - Moderation tab: pending queue with approve/reject, recently approved/rejected, submission trends
  - Platform tab: resource/download KPIs, top resources table, downloads timeline
  - Reports tab: 7 export items with CSV/JSON download
  - Fixed: all `useMemo`/`useCallback` calls at top level (no hooks inside nested render functions — fixes blank page bug)
  - Fetches from 10 admin endpoints including new `/admin/notifications`, `/admin/last-logins`, `/admin/downloads-timeline`

**Context (`frontend/src/context/AuthContext.jsx`):**
- Created AuthContext — reads user/token from localStorage/sessionStorage, exposes `user`, `token`, `role`, `isAdmin`, `isLoggedIn`, `login()`, `logout()`

**App (`frontend/src/App.jsx`):**
- Wrapped with `<AuthProvider>`

**Styles (`frontend/src/styles/admin.css`):**
- `.at-dashboard-selector`, `.at-ds-btn`, `.at-modal-overlay`, `.at-modal`, `.at-btn-sm`, `.at-btn-approve`, `.at-btn-reject`, `.at-spin`

### Session: Anti-Hallucination Triple Fix

**Both notebooks — applied to `test_chatbot_sarai.ipynb` and `test_chatbot_sarai_mistral.ipynb`:**
- **Fix 1 — Stricter prompts**: EN & FR SYSTEM_PROMPT rules 5+6 rewritten. Rule 5: "Report ONLY fields that have values. If stakeholders, objectives, results, or metrics are not present, do NOT mention them. Report status exactly as shown (e.g. 'Draft'). Never invent percentages." New rule 6: "Never fabricate metrics, percentages, or quantitative results."
- **Fix 2 — Empty markers**: `format_detail_context()` now emits `Stakeholders: (none)` when the stakeholder list is empty, so the LLM sees an explicit signal rather than a missing section it might fill.
- **Fix 3 — Percentage detection**: `chat()` validation rejects LLM responses containing `\d+%` when the context has none (even in `detail_mode`, which previously skipped all count checks). Catches invented metrics like "20% reduction".

### Session: GPT-4.1 Benchmark Notebook

**Created `chatbot/test_chatbot_sarai_GPT-4.1.ipynb`** — copy of `test_chatbot_sarai.ipynb` with:
- **Primary model**: GPT-4.1 (via OpenAI) instead of Groq
- **Provider chain**: `openai` (OpenAIProvider) → `groq` (fallback) → `ollama` → `template`
- **OpenAIProvider class**: uses `openai` library, inherits `LLMProvider`, supports context/history/image
- All features preserved: RAG, Rolling Summary Memory, intent/detail/lang detection, auto-rebuild, anti-hallucination (all 3 fixes), interactive + auto tests, performance, experimentation, CSV export
- All outputs cleared, execution counts reset

### Session: Mistral Small Benchmark Notebook

**Created `chatbot/test_chatbot_sarai_mistral.ipynb`** — exact copy of `test_chatbot_sarai.ipynb` with:
- **Primary model**: Mistral Small (via Ollama) instead of Groq
- **Provider chain**: `mistral` (OllamaProvider) → `groq` (fallback) → `template`
- All features preserved: RAG, Conversation Memory, Rolling Summary Memory, intent detection, detail detection, auto-rebuild, anti-hallucination, interactive + auto tests, performance, experimentation, CSV export
- All outputs cleared, execution counts reset

### Session: Rolling Summary Memory

**Notebook (`chatbot/test_chatbot_sarai.ipynb`):**
- Added section **5.5 Rolling Summary Memory** with `RollingSummaryMemory` class
- New cell 14: `RollingSummaryMemory` class with:
  - `add(question, reply)` — appends exchange, returns `True` when summary interval reached
  - `summarize()` — generates 2-3 sentence LLM summary in user's language (EN/FR/AR), falls back to truncated text via TemplateProvider
  - Rolling window: keeps only last `keep_last` exchanges after summarization
  - `token_estimate` property: rough token count (4 chars/token)
  - `get_history()`, `get_summary()`, `get_context()`, `clear()` methods
- Updated section **7. Test interactif** (cell 18): replaced inline summary logic with `RollingSummaryMemory` instance
  - Token count shown per response: `Memoire: ~{memory.token_estimate} tokens`
  - Prints summary and history truncation info on summarization

### Session: Benchmark Notebook v2 — 3 Modeles Cloud

**Rewrote `chatbot/benchmark_chatbot_sarai.ipynb`** — structure 13 cellules avec 3 modeles cloud :
| Modele | Provider | API |
|--------|----------|-----|
| **Llama 3.1 8B** | Groq (`llama-3.1-8b-instant`) | `GROQ_API_KEY` |
| **Mixtral 8x7B** | Groq (`mixtral-8x7b-32768`) | `GROQ_API_KEY` |
| **Mistral Small** | Mistral AI (`mistral-small-latest`) | `MISTRAL_API_KEY` |

**13 cellules :** Introduction, Dependances, Configuration, Connexion SARAI (DB+RAG), Providers LLM, Questions de test (20), Execution benchmark, Scoring qualite (LLM-as-judge Groq), Metriques RAG (Recall@k/MRR/MAP), Analyse hors domaine (taux refus), Tableau final (RdYlGn), Export CSV, Conclusion

### Session: Conversion DeepSeek R1 → Mixtral 8x7B

- **Deleted** `test_chatbot_sarai_DeepSeek-R1.ipynb` (modele `deepseek-r1-distill-llama-70b` decommissioned par Groq)
- **Created** `test_chatbot_sarai_Mixtral-8x7B.ipynb` — utilise `MixtralProvider` avec `MIXTRAL_MODEL=mixtral-8x7b-32768` via `GROQ_API_KEY`
- **Updated** `test_chatbot_sarai_mistral.ipynb` — remplace OllamaProvider (local) par MistralAPIProvider (API cloud `api.mistral.ai`), lit `MISTRAL_API_KEY` depuis `.env`

### Session: AI Extraction, LinkedIn OAuth, Email Activation, Moderation

(Session history begins here — previous top-level summary retained below)

## Architecture
- **Backend**: FastAPI on `localhost:8000`, SQLAlchemy ORM, PostgreSQL/SQLite
- **Frontend**: React (Vite) on `localhost:3001`, react-i18next for i18n, recharts for charts
- **Auth**: JWT Bearer tokens, LinkedIn OAuth (OpenID Connect), email activation codes

## Key Routes
- `GET /api/analytics/overview` — total_projects, approval_rate, pending_count, total_resources, etc.
- `GET /api/analytics/admin/overview` — admin-only KPIs + user/project/org stats
- `GET /api/analytics/admin/platform-stats` — resource/download/chatbot counts
- `GET /api/analytics/admin/org-status` — org approval breakdown
- `GET /api/analytics/admin/notifications` — unread count + recent notifications
- `GET /api/analytics/admin/last-logins` — last 20 user logins
- `GET /api/analytics/admin/downloads-timeline` — monthly downloads/uploads


## Critical Notes
- Backend runs at `backend/main.py` (not `backend/app/main.py`) — uvicorn: `main:app`
- LinkedIn redirect URI must match **exactly**: `http://localhost:8000/api/auth/linkedin/callback`
- Groq free tier: 6000 TPM with `llama-3.1-8b-instant`
- Analytics filters debounce 400ms before re-fetching
- Only admin sees Admin Dashboard toggle (`isAdmin` from AuthContext)
- Dark mode supported via CSS variables; admin styles use `.at-*` prefix
