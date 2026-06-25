# CyberShield360 By Mujtaba — React Client

Vite + React 18 + TypeScript + Tailwind SPA for the CyberShield360 By Mujtaba API.

## Run
```bash
cd clientapp
npm install
cp .env.example .env      # optional; defaults to /api/v1 (proxied to :8080)
npm run dev               # http://localhost:5173
```
The dev server proxies `/api` → `http://localhost:8080` (see `vite.config.ts`), so run the
ASP.NET Core API alongside it. Default login: `admin@acme.com` / `ChangeMe!2026`.

## Build
```bash
npm run build   # outputs to dist/
```

## Structure
```
src/
├── api/            # axios client (JWT interceptor) + typed endpoints
├── auth/           # AuthContext (token storage, roles)
├── components/     # Layout/sidebar, shared UI (badges, stat cards)
├── pages/          # Login, Dashboard, Vulnerabilities, Assets, Risks
├── types.ts        # shared DTO types mirroring the API
└── App.tsx         # routes + protected-route guard
```

## Features
- JWT auth with auto-attach + 401 redirect
- Posture dashboard (score/grade, severity bars, score-trend area chart via Recharts)
- Vulnerability list with inline status updates
- Assets list + one-click scans (full posture / SSL / headers / DNS / SPF / DKIM / DMARC)
- Risk register + likelihood×impact heatmap
