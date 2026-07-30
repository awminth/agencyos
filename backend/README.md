# Agency Management System (SplitDeploy)

## Structure

```
agencyManagementSystem/
├── frontend/   # React 19 + Vite (dev port 1011)
└── backend/    # Express + MySQL (API port 1012)
```

## Setup

1. Create MySQL DB / tables / seed:

```bash
cd backend
npm install
npm run init-db
```

2. Install frontend:

```bash
cd ../frontend
npm install
```

3. Local development (both processes):

```bash
cd ../backend
npm run dev
```

- Frontend: http://localhost:1011  
- Backend API: http://localhost:1012  

## Production

```bash
cd backend
npm run build   # builds frontend → backend/dist + bundles server.js
npm start       # single process on BACKEND_PORT (1012)
```

## Env (`backend/.env`)

```
BACKEND_PORT=1012
FRONTEND_PORT=1011
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=mt_agencyms

# Optional — Myanmar Help Chat (Google AI Studio)
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash
```

Help chat uses Gemini (`POST /api/help-chat`). Without `GEMINI_API_KEY`, the endpoint returns 503.
Default model is `gemini-3.5-flash` (same as contentplanner).
