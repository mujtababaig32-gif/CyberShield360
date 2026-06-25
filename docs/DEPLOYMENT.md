# CyberShield360 Deployment Guide

Recommended deployment:

```text
Frontend: Vercel
Backend API: Azure App Service / Azure Container Apps / Railway Docker service
Database: Azure SQL or hosted SQL Server
Secrets: Environment variables in hosting dashboards
```

## 1. Before pushing to GitHub

1. Rotate any exposed API keys.
2. Keep `src/CyberShield360.API/appsettings.json` local only.
3. Use `src/CyberShield360.API/appsettings.Production.example.json` as a safe reference.
4. Do not commit `.env`, real SMTP passwords, JWT secrets, database passwords, OpenAI keys, or Lemon Squeezy keys.

## 2. Backend deployment

Deploy the API as a Docker/.NET service.

Required backend environment variables are listed in `docs/ENVIRONMENT_VARIABLES.md`.

Health check endpoint:

```text
GET /health
```

Swagger should be disabled in production unless you intentionally enable it:

```text
EnableSwagger=false
```

## 3. Database

Use a hosted SQL Server connection string in:

```text
ConnectionStrings__DefaultConnection
```

For first deployment, you can temporarily set:

```text
SeedOnStartup=true
```

After the first successful deployment and seed, set it back to:

```text
SeedOnStartup=false
```

## 4. Frontend deployment on Vercel

In Vercel:

```text
Root Directory: clientapp
Build Command: npm run build
Output Directory: dist
Install Command: npm ci
```

Environment variable:

```text
VITE_API_BASE=https://YOUR-BACKEND-API-DOMAIN/api/v1
```

## 5. CORS

Backend must allow the deployed frontend domain:

```text
Cors__Origins__0=https://YOUR-VERCEL-FRONTEND.vercel.app
```

Add your custom domain later as another origin:

```text
Cors__Origins__1=https://yourdomain.com
```

## 6. Google login production fix

Your current login page may still have a hardcoded local API URL. Replace:

```ts
fetch("http://localhost:8080/api/v1/GoogleAuth/login", {
```

with:

```ts
fetch(`${(import.meta.env.VITE_API_BASE ?? "/api/v1").replace(/\/+$/, "")}/GoogleAuth/login`, {
```

Then run:

```powershell
cd clientapp
npm run build
```

## 7. Final test checklist

Test these after deployment:

```text
/login
/dashboard
/assets
/asset-inventory
/scheduled-scans
/vulnerabilities
/risks
/ai-remediation
/compliance-center
/policy-audit
/framework-mapping
/cloud-posture
/vendor-risk
/threat-intelligence
/dark-web
/security-awareness
/phishing-simulation
/incident-playbooks
/attack-path
/audit-logs
/notifications
/rbac
/saas-admin
/settings
/user-management
```
