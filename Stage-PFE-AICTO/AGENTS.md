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
