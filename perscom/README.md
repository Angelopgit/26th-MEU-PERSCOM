# PERSCOM Management System
## 26th Marine Expeditionary Unit (SOC) — Arma Reforger

A military personnel management system for tracking Marines, conducting evaluations, managing operations, and maintaining unit records.

---

## Folder Structure

```
perscom/
├── backend/                    # Node.js + Express API
│   ├── data/                   # SQLite database (auto-created)
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js     # SQLite setup + schema
│   │   ├── middleware/
│   │   │   └── auth.js         # JWT authentication
│   │   ├── routes/
│   │   │   ├── auth.js         # Login endpoint
│   │   │   ├── personnel.js    # Personnel CRUD + promote/demote/awards
│   │   │   ├── operations.js   # Operations CRUD
│   │   │   ├── evaluations.js  # Evaluations + status tracking
│   │   │   ├── announcements.js
│   │   │   └── dashboard.js    # Dashboard stats
│   │   ├── db/
│   │   │   └── seed.js         # Demo data seed script
│   │   └── server.js
│   ├── .env
│   └── package.json
│
└── frontend/                   # React + Vite + Tailwind
    ├── src/
    │   ├── components/
    │   │   ├── Layout.jsx      # App shell
    │   │   ├── Sidebar.jsx     # Navigation
    │   │   ├── TopBar.jsx      # Header with clock
    │   │   └── Modal.jsx       # Reusable modal
    │   ├── context/
    │   │   └── AuthContext.jsx # Auth state management
    │   ├── pages/
    │   │   ├── Login.jsx       # Authentication page
    │   │   ├── Dashboard.jsx   # Stats + activity + announcements
    │   │   ├── Personnel.jsx   # Full personnel management
    │   │   ├── Operations.jsx  # Operations (admin only)
    │   │   └── Evaluations.jsx # 30-day eval tracking
    │   ├── utils/
    │   │   └── api.js          # Axios instance
    │   ├── App.jsx
    │   └── main.jsx
    └── package.json
```

---

## Setup Instructions

### Prerequisites
- Node.js 18+ (https://nodejs.org)
- npm 9+

> **Windows note:** `better-sqlite3` requires native bindings. If you run into build errors, install the Windows Build Tools:
> ```
> npm install --global windows-build-tools
> ```
> Or install Visual Studio Build Tools with the C++ workload.

---

### 1. Install Backend Dependencies

```bash
cd perscom/backend
npm install
```

### 2. Seed the Database (Demo Data)

```bash
npm run seed
```

This creates the SQLite database at `backend/data/perscom.db` with demo personnel, operations, evaluations, and announcements.

### 3. Start the Backend

```bash
npm run dev       # Development (with nodemon auto-reload)
# or
npm start         # Production
```

Backend runs on: **http://localhost:3001**

---

### 4. Install Frontend Dependencies

```bash
cd perscom/frontend
npm install
```

### 5. Start the Frontend

```bash
npm run dev
```

Frontend runs on: **http://localhost:5173**

---

## Login Credentials

| Role          | Username   | Password     | Access Level          |
|---------------|------------|--------------|-----------------------|
| Administrator | `command`  | `Admin@1234` | Full access           |
| Moderator     | `drillsgt` | `Mod@1234`   | View + Evaluate only  |

---

## Features

### Dashboard
- Active announcement banner (admin-controlled)
- Personnel stats (total / Marines / civilians)
- Pending evaluations counter
- Active operations count
- Recent activity feed (last 10 actions)

### Personnel Management
- Full roster with search and filter (All / Marine / Civilian)
- Add, edit, delete personnel (admin only)
- One-click promote / demote with rank tracking
- Time in Grade (TIG) auto-calculated
- Award management (add / remove)

### Performance Evaluations (30-Day Cycle)
- Lists all Marines with evaluation status:
  - **Current** — evaluated within 30 days
  - **Due** — never evaluated
  - **Overdue** — last eval was more than 30 days ago
- Conduct evaluations with YES/NO form + notes
- Expandable evaluation history per Marine
- Available to both Moderators and Admins

### Operations (Admin Only)
- Create and manage operations/missions
- Status automatically derived from end date (Active / Completed)
- Filter by status

### Announcements (Admin Only)
- Post unit-wide announcements visible on dashboard
- Single active announcement displayed prominently
- Delete announcements when no longer needed

---

## API Endpoints

```
POST   /api/auth/login                    Login
GET    /api/auth/me                       Current user

GET    /api/personnel                     List personnel
POST   /api/personnel                     Add personnel (admin)
PUT    /api/personnel/:id                 Update personnel (admin)
DELETE /api/personnel/:id                 Delete personnel (admin)
POST   /api/personnel/:id/promote         Promote one rank (admin)
POST   /api/personnel/:id/demote          Demote one rank (admin)
POST   /api/personnel/:id/awards          Add award (admin)
DELETE /api/personnel/:id/awards/:awId    Remove award (admin)

GET    /api/evaluations/status            Marines + eval status
GET    /api/evaluations                   All evaluations
POST   /api/evaluations                   Submit evaluation

GET    /api/operations                    List operations
POST   /api/operations                    Create operation (admin)
PUT    /api/operations/:id                Update operation (admin)
DELETE /api/operations/:id                Delete operation (admin)

GET    /api/announcements                 All announcements
GET    /api/announcements/latest          Latest announcement
POST   /api/announcements                 Create announcement (admin)
DELETE /api/announcements/:id             Delete announcement (admin)

GET    /api/dashboard/stats               Dashboard statistics
GET    /api/health                        Health check
```

---

## Rank Progression

```
Recruit → Private → Private First Class → Lance Corporal → Corporal →
Sergeant → Staff Sergeant → Gunnery Sergeant → Master Sergeant →
First Sergeant → Master Gunnery Sergeant → Sergeant Major →
Second Lieutenant → First Lieutenant → Captain → Major →
Lieutenant Colonel → Colonel
```

---

## Permissions Summary

| Feature              | Moderator | Admin |
|----------------------|-----------|-------|
| View dashboard       | ✓         | ✓     |
| View personnel       | ✓         | ✓     |
| Add/edit/delete personnel | ✗    | ✓     |
| Promote/demote       | ✗         | ✓     |
| Manage awards        | ✗         | ✓     |
| View evaluations     | ✓         | ✓     |
| Conduct evaluations  | ✓         | ✓     |
| View operations      | ✗         | ✓     |
| Manage operations    | ✗         | ✓     |
| Manage announcements | ✗         | ✓     |

---

*PERSCOM v1.0 — 26th Marine Expeditionary Unit (SOC)*
