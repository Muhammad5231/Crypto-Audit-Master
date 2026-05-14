# Crypto Audit Master

Full-stack crypto audit project using:

- Frontend: React 18, Vite, Tailwind CSS, Recharts, Lucide React, Zustand
- Backend: Node.js, Express.js, MongoDB, Multer, Papa Parse, Decimal.js, JWT, bcryptjs

## Run Backend

```bash
cd backend
npm install
npm run dev
```

Backend runs on:

```txt
http://localhost:5001
```

Health check:

```txt
http://localhost:5001/api/health
```

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on:

```txt
http://localhost:5173
```

## Important

MongoDB Compass / local MongoDB must be running on:

```txt
mongodb://127.0.0.1:27017
```

If port 5001 is busy, change `backend/.env` and `frontend/src/lib/api.ts` API_BASE together.
