# Customer 360 Analytics CMS

A customer data analytics platform (Customer 360) — collects and processes customer data, stores it in Supabase, visualizes it with Power BI, and embeds the dashboard directly into an internal web app via Power BI Embedded.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Requirements](#requirements)
- [Local Setup](#local-setup)
- [Power BI Embedded Setup](#power-bi-embedded-setup)
- [Environment Variables](#environment-variables)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)
- [Security Notes](#security-notes)

---

## Architecture Overview

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐      ┌──────────────┐
│   ETL /     │ ──►  │   Supabase   │ ◄──  │   Power BI   │     │  Azure AD    │
│  Data Prep  │      │  (PostgreSQL)│      │  Desktop     │     │ (App + User) │
└─────────────┘      └──────┬───────┘      └──────┬───────┘     └──────┬───────┘
                            │                     │                    │
                            │              (Publish report)            │
                            │                     │                    │
                            ▼                     ▼                    ▼
                      ┌──────────────────────────────────────────────────────┐
                      │              Backend (NestJS)                        │
                      │  - Reads/writes Supabase data                        │
                      │  - Authenticates with Azure AD (ROPC) to get         │
                      │    an access token                                   │
                      │  - Calls Power BI REST API to generate embed token   │
                      └───────────────────────┬──────────────────────────────┘
                                               │  JSON: embedUrl, embedToken, reportId
                                               ▼
                      ┌──────────────────────────────────────────────────────┐
                      │              Frontend (React + Vite)                 │
                      │  - Calls backend API to fetch embed info             │
                      │  - Renders the report via powerbi-client-react       │
                      └──────────────────────────────────────────────────────┘
```

**Data flow:**
1. Customer data is processed through a separate ETL step and loaded into Supabase (PostgreSQL).
2. Power BI Desktop connects directly to Supabase, builds the report, and publishes it to Power BI Service (the workspace is assigned to a Fabric Trial Capacity to enable Embedded support).
3. The NestJS backend signs in to Azure AD using the Power BI account (ROPC flow), then calls the Power BI REST API to fetch the `embedUrl` and generate an `embedToken`.
4. The frontend calls the backend API, receives the embed info, and uses the `powerbi-client-react` SDK to embed the report directly in the UI — end users can view the dashboard without needing their own Power BI account.

---

## Tech Stack

| Component | Technology |
|---|---|
| Backend | NestJS (Node.js/TypeScript) |
| Frontend | React + Vite |
| Database | Supabase (PostgreSQL) |
| BI & Visualization | Power BI + Power BI Embedded |
| Auth for Power BI | Azure AD (App Registration, ROPC flow) |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |

---

## Project Structure

```
cms_app/
├── backend/                 # NestJS API
│   ├── src/
│   │   ├── powerbi/          # Power BI Embedded module
│   │   │   ├── powerbi.controller.ts
│   │   │   ├── powerbi.service.ts
│   │   │   └── powerbi.module.ts
│   │   ├── supabase/          # Supabase connection
│   │   │   ├── supabase.provider.ts
│   │   │   └── supabase.module.ts
│   │   ├── common/
│   │   │   └── http-exception.filter.ts
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── .env.example
│   ├── .gitignore
│   └── package.json
├── frontend/                 # React + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── CmsLayout.jsx
│   │   │   └── PowerBIReport.jsx
│   │   ├── App.jsx
│   │   └── index.css
│   ├── vite.config.js
│   ├── .gitignore
│   └── package.json
```

---

## Requirements

- Node.js >= 18
- npm >= 9
- A Supabase account (with an existing project and data tables)
- A Microsoft 365 account (school or organizational) with a Power BI Pro license
- A Microsoft Fabric Trial Capacity (free for 60 days), activated and assigned to the workspace containing the report

---

## Local Setup

### 1. Clone the repo

```bash
git clone https://github.com/{username}/cms_app.git
cd cms_app
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in the real values in .env (see Environment Variables below)
npm run start:dev
```

The backend runs at `http://localhost:3002`, with all routes under the `/api` prefix.

### 3. Frontend

```bash
cd frontend
npm install
npm install powerbi-client-react powerbi-client
npm run dev
```

The frontend runs at `http://localhost:3000` and automatically proxies `/api/*` requests to the backend at `localhost:3002` (configured in `vite.config.js`) — no need to set `VITE_API_URL` for local development.

---

## Power BI Embedded Setup

Since a student account can't use "Publish to Web," this project uses the **Embed for your customers (App owns data)** approach with the **ROPC flow (Master User)** — this does not require Power BI Admin Portal access.

### Step 1 — Activate a Microsoft Fabric Trial
Go to https://app.fabric.microsoft.com → Start trial (free for 60 days) → assign the workspace containing the report to this trial capacity (Workspace settings → License mode).

### Step 2 — Create an Azure AD App Registration
1. Azure Portal → App registrations → New registration (Single tenant).
2. Authentication → Advanced settings → **Allow public client flows** → Yes.
3. API permissions → Power BI Service → **Delegated permissions** → `Report.Read.All`, `Dataset.Read.All`.

> ⚠️ The App Registration and the Power BI account (`PBI_USERNAME`) **must belong to the same Azure AD tenant**, otherwise you'll get an `AADSTS50020` error.

### Step 3 — Consent to the app's permissions (if you don't have Admin Portal access)
Open the following link in a browser, sign in with the correct Power BI account, and click Accept:
```
https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/authorize?client_id={CLIENT_ID}&response_type=code&redirect_uri=https://login.microsoftonline.com/common/oauth2/nativeclient&scope=https://analysis.windows.net/powerbi/api/Report.Read.All%20https://analysis.windows.net/powerbi/api/Dataset.Read.All%20offline_access&prompt=consent
```

### Step 4 — Verify the account has access to the report
The `PBI_USERNAME` account must be a Member/Admin of the workspace containing the report, and **must not have MFA enabled** (ROPC does not support MFA).

---

## Environment Variables

### Backend (`backend/.env`)

```dotenv
# --- Server ---
PORT=3002
FRONTEND_URL=http://localhost:3000

# --- Supabase ---
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxx

# --- Azure AD / Power BI (ROPC flow) ---
AZURE_TENANT_ID=xxxxx
AZURE_CLIENT_ID=xxxxx
PBI_USERNAME=your-email@school.edu
PBI_PASSWORD=your-password
PBI_WORKSPACE_ID=xxxxx
PBI_REPORT_ID=xxxxx
```
