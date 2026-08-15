# CMS ERP System

NestJS + Supabase + React

## Structure

```
cms_app/
├── backend/
|   ├── src/
│   |   ├── powerbi/
│   |   │   ├── powerbi.controller.ts   # GET /powerbi/embed-info
│   |   │   ├── powerbi.service.ts      # ROPC login + generate embed token
│   |   │   └── powerbi.module.ts
│   |   ├── supabase/
│   |   │   ├── supabase.provider.ts    # inject SUPABASE_CLIENT
│   |   │   └── supabase.module.ts
│   |   ├── common/
│   |   │   └── http-exception.filter.ts
│   |   ├── app.module.ts
│   |   └── main.ts
|   ├── .env.example
|   ├── package.json
|   ├── tsconfig.json
|   └── nest-cli.json
├── frontend/         # React + Vite
│   ├── src/
│   │   ├── components/
│   │   ├── App.jsx
│   │   └── index.css
│   └── package.json

```

## Setup

### 1. Supabase
- Create project at [supabase.com](https://supabase.com)

### 2. Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your Supabase credentials
npm install
npm run start:dev
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

