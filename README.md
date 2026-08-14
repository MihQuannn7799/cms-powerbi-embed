# CMS ERP System

NestJS + Supabase + React

## Structure

```
cms_app/
├── backend/          # NestJS API
│   ├── src/
│   │   ├── users/        # UserModule
│   │   ├── supabase/     # SupabaseProvider
│   │   ├── common/       # ExceptionFilter
│   │   ├── main.ts
│   │   └── app.module.ts
│   ├── .env
│   └── package.json
├── frontend/         # React + Vite
│   ├── src/
│   │   ├── components/
│   │   ├── App.jsx
│   │   └── index.css
│   └── package.json
└── supabase_schema.sql
```

## Setup

### 1. Supabase
- Create project at [supabase.com](https://supabase.com)
- Run SQL in `supabase_schema.sql`
- Copy Project URL and Anon Key

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

