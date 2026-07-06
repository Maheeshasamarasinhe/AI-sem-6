# Frontend

This folder contains the React + Vite + Tailwind scaffold for the student success prediction UI.

## Run locally

```powershell
cd /d f:\AI-sem-6\frontend
npm install
npm run dev
```

The app expects the FastAPI backend to be running on `http://localhost:8000`.

## API contract used by the UI

- `GET /skills`
- `GET /problem_types`
- `POST /predict`
- `POST /explain`

Set `VITE_API_BASE_URL` if you want to point the UI at a different backend host.
