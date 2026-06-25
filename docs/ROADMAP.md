# Implementation Roadmap

This repository delivers a **production-grade foundation** with end-to-end vertical slices for the
core domains (auth, multi-tenancy, scanning, scoring, vulnerabilities, dashboard, reporting, billing,
phishing). The roadmap below sequences the remaining work to a full launch.

## Phase 0 — Foundation ✅ (included)
- Clean Architecture solution (Domain / Application / Infrastructure / API)
- EF Core + SQL Server, multi-tenant global query filters, soft delete, audit columns
- ASP.NET Identity + JWT, RBAC roles
- CQRS + MediatR + FluentValidation + pipeline behaviours
- Security scanner (SSL/headers/DNS/SPF/DKIM/DMARC) + A–F scoring engine
- PDF/Excel white-label reports, Stripe checkout/webhook scaffold, AI recommendation service
- Serilog, Swagger, exception/tenant/audit middleware, Docker + compose, unit + integration tests

## Phase 1 — Harden core (1–2 sprints)
- [x] Complete CQRS slices for Risks, BrandAlerts, Training, Scheduled scans  ✅ *(added)*
- [ ] Social audit CQRS slice
- [ ] Refresh-token rotation + revocation store; password reset & email confirmation flows
- [ ] FluentValidation coverage on every command; ProblemDetails responses
- [ ] Generate `InitialCreate` migration & commit; seed reference data (training catalog, plans)
- [ ] Rate limiting (AspNetCoreRateLimit) + API-key auth handler for the public REST API

## Phase 2 — Background processing (1–2 sprints)
- [x] Introduce **Hangfire** for scheduled scans & recurring monitoring  ✅ *(added)*
- [x] Worker runs scans out-of-band, auto-raises vulns, emails admins on completion  ✅ *(added)*
- [ ] Persist granular scan progress + websocket push to the UI
- [ ] Real brand/domain monitoring (typosquat generation, cert transparency logs, leaked-cred feeds)
- [ ] Social media audit connectors (X, LinkedIn, Meta) via official APIs

## Phase 3 — Billing & plans (1 sprint)
- [ ] Full Stripe lifecycle: subscription.created/updated/deleted → Subscription entity
- [ ] Plan-limit enforcement (assets/users/scans) via a policy/feature-gate service
- [ ] Usage metering + customer billing portal

## Phase 4 — AI & analytics (1–2 sprints)
- [ ] Wire `AiRecommendationService` to an LLM (OpenAI/Azure OpenAI) with prompt templates & guardrails
- [ ] Risk prioritization model; remediation effort/impact scoring
- [ ] Executive trend analytics & benchmark comparisons

## Phase 5 — Frontend SPA (2–4 sprints)
- [x] React + TypeScript + Vite + Tailwind app consuming the REST API  ✅ *(added, in `/clientapp`)*
- [x] Dashboards: posture (Recharts), risk heatmap, vulnerability management, assets & scans  ✅ *(added)*
- [ ] Training & phishing report pages; vuln kanban board
- [ ] White-label theming per tenant; agency multi-tenant switcher
- [ ] (A static HTML/Tailwind demo also lives in `/frontend`.)

## Phase 6 — Production readiness (1–2 sprints)
- [ ] Secrets via Azure Key Vault / AWS Secrets Manager (no secrets in config)
- [ ] CI/CD (GitHub Actions): build, test, scan, containerize, deploy
- [ ] Observability: OpenTelemetry traces/metrics, health checks, dashboards
- [ ] Security: OWASP ASVS review, dependency scanning, pen test, SOC 2 controls mapping
- [ ] Horizontal scale: stateless API, distributed cache (Redis), DB read replicas

## Cross-cutting / compliance
- Data residency & per-tenant encryption options
- GDPR/CCPA data export & deletion
- **Phishing simulations**: enforce written authorization, scope to owned employees, audit every campaign
