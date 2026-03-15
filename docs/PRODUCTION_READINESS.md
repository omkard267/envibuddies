## EnviBuddies Production Readiness Playbook

This document is an actionable checklist to make the project startup-ready and safe to launch for real users. It is tailored to the current codebase structure and configurations.

### Scope
- Backend: Express, MongoDB, Socket.IO, Razorpay, Google OAuth, file uploads
- Frontend: React (Vite), Tailwind, Socket.IO client, Axios

---

## 0) Executive Checklist (Do these first)
- Environment
  - Create `.env` for each env (local, staging, prod) and add `.env.example` with all required keys.
  - Remove hardcoded localhost URLs; make them env-driven in both backend and frontend.
- Security
  - Add Helmet, input sanitization, strict CORS, rate limiting, compression.
  - Rotate JWT design: short-lived access (15m) + long-lived refresh (7–30d) with rotation and revocation.
  - Lock down uploads; move to S3/R2 with presigned URLs and restrict sensitive files from public access.
- Payments & Email
  - Implement Razorpay webhooks with signature verification and idempotency.
  - Replace Gmail SMTP with a production ESP (SES/SendGrid) and set SPF/DKIM/DMARC.
- Realtime & Scale
  - Add Redis adapter for Socket.IO, and plan sticky sessions on the load balancer.
- Observability
  - Add centralized logging (Pino/Winston), request IDs, Sentry, health/readiness endpoints, metrics.
- Deployment
  - Add Dockerfiles, docker-compose, GitHub Actions CI/CD, and infra docs (Nginx reverse proxy/SSL).
- Data
  - Define indexes/migrations, backups, seeds for staging only, and privacy deletion workflows.

---

## 1) Environment & Configuration
- Actions
  - Add `.env.example` listing all required variables and comments describing them.
  - Use `NODE_ENV=production` in prod; ensure conditional config by env.
  - Backend: parameterize CORS origin(s), ports, base URLs, third-party keys.
  - Frontend: use `import.meta.env.VITE_API_URL` and `VITE_SOCKET_URL` instead of hardcoded `http://localhost:5000`.
- Why
  - Avoid accidental leaks and make deployments reproducible.
- Where
  - `backend/server.js` (CORS), `backend/config/*`, `frontend/src/api/axiosInstance.js`, Socket.IO client usage, `vite.config.js`.

Suggested env keys (.env.example to create):
- Common: `NODE_ENV`, `PORT`, `BACKEND_URL`, `FRONTEND_URL`, `CORS_ORIGINS` (comma-separated)
- Database: `MONGO_URI`
- Auth: `JWT_SECRET`, `JWT_ACCESS_TTL=15m`, `JWT_REFRESH_TTL=7d`
- OAuth: `GOOGLE_CLIENT_ID`
- Payments: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- Email: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- AI: `OPENROUTER_API_KEY`
- Realtime/Queues: `REDIS_URL`

---

## 2) Backend Hardening (Express)
- Actions
  - Add middleware:
    - `helmet` with CSP tuned for your domains
    - `compression`
    - `express-rate-limit` (auth routes stricter), store in Redis in prod
    - `express-mongo-sanitize`, `xss-clean`, `hpp`
  - CORS: restrict to `CORS_ORIGINS`; do not use wildcard for Socket.IO in prod.
  - Trust reverse proxy: `app.set('trust proxy', 1)` when behind Nginx/ELB for secure cookies and IPs.
  - Validation: enforce `express-validator` on all write endpoints.
  - Error handling: keep centralized `errorHandler`, remove stack traces in prod responses, log with request IDs.
- Why
  - Prevent common exploits, ensure performance and safer error exposure.
- Where
  - `backend/server.js`, `backend/utils/errorResponse.js`, route files.

---

## 3) Authentication & Sessions
- Current
  - Access and refresh tokens both 7d, stored in localStorage; sessions persisted in user document.
- Actions
  - Token policy: Access 15m, Refresh 7–30d. Implement refresh token rotation and reuse detection.
  - Storage: Prefer httpOnly, secure, sameSite cookies for tokens in production; avoid localStorage.
  - Add device/session management endpoints (revoke, list), hook into logout to invalidate refresh tokens.
  - Add email verification flow and optional 2FA for organizers/admins.
  - Add password breach check (haveibeenpwned API) and increase bcrypt cost to 12 if feasible.
- Why
  - Reduces token theft impact; adheres to security best practices.
- Where
  - `backend/controllers/authController.js`, `backend/middlewares/authMiddleware.js`, frontend auth flows.

---

## 4) Realtime (Socket.IO)
- Current
  - Socket.IO initialized with `origin: *` and JWT auth in the handshake. No adapter configured.
- Actions
  - Restrict CORS origins; validate tokens on connection and refresh on reconnect.
  - Add Redis adapter (`@socket.io/redis-adapter`) and plan for sticky sessions on LB.
  - Namespaces/rooms: document and monitor usage; add authZ checks for room join (event membership).
  - Rate-limit events per socket; validate payload sizes and types.
- Why
  - Enables horizontal scaling and prevents abuse.
- Where
  - `backend/socketHandler.js`, server initialization.

---

## 5) File Uploads & Static Assets
- Current
  - Local disk storage under `backend/uploads/*`, publicly served; includes sensitive docs like IDs.
- Actions
  - Move to object storage (S3/Cloudflare R2). Use presigned URLs and a CDN.
  - Separate public vs private buckets; do NOT publicly serve sensitive files.
  - Validate MIME/type/size; image optimization and thumbnail generation.
  - Optional: antivirus scanning (ClamAV/Lambda) for uploaded files.
  - Scrub PII from file names; store metadata in DB (owner, purpose, expiry).
- Why
  - Security, scalability, resiliency, and performance.
- Where
  - `backend/middlewares/upload.js`, endpoints handling uploads, `server.js` static routes.

---

## 6) Payments (Razorpay)
- Current
  - Server-side order creation and in-request signature verification, no webhooks.
- Actions
  - Implement Razorpay webhooks endpoint:
    - Verify `X-Razorpay-Signature` with `RAZORPAY_WEBHOOK_SECRET`.
    - Handle `payment.captured`, `payment.failed`, `refund.processed`.
    - Ensure idempotency using a `webhookEvents` collection.
  - Reconcile: periodic job to reconcile orders vs payments.
  - Compliance: sequential receipt numbers, GST fields, download-able tax invoices.
- Why
  - Webhooks are the source of truth and handle client failures.
- Where
  - New route/controller (e.g., `routes/webhookRoutes.js`), integrate with `paymentController`.

---

## 7) Email & Notifications
- Current
  - Gmail SMTP via Nodemailer for password reset.
- Actions
  - Use SES/SendGrid/Resend; configure SPF/DKIM/DMARC for your domain.
  - Template system (MJML/Handlebars) and localization support.
  - Background queue (BullMQ/Redis) for sending and retries.
  - Add sender reputation safeguards (unsubscribe links for marketing).
- Why
  - Reliability and deliverability at scale.
- Where
  - `backend/controllers/authController.js` (reset), new mailer utility.

---

## 8) Frontend Production Setup
- Current
  - `axios` baseURL hardcoded to localhost; Vite dev proxy used.
- Actions
  - Use envs: `VITE_API_URL`, `VITE_SOCKET_URL`, `VITE_APP_ENV`.
  - Build: `vite build`, serve behind a CDN or Nginx; set `base` if hosted under subpath.
  - Security: Content Security Policy, upgrade-insecure-requests, avoid inline scripts.
  - Auth: switch to cookie-based auth; handle 401 via refresh flow; avoid window.location redirects where possible.
  - Performance: code-splitting, route-based lazy loading, image optimization, `react` production profiling.
  - PWA: optional offline support and installability for volunteers.
- Where
  - `frontend/src/api/axiosInstance.js`, Socket.IO client initialization, `vite.config.js`.

---

## 9) Observability & Reliability
- Actions
  - Logging: Pino/Winston with JSON logs; add request IDs and user IDs; redact secrets.
  - Error tracking: Sentry (frontend + backend) with release versioning and source maps.
  - Metrics: Prometheus metrics endpoint (http durations, DB latency, queue sizes); dashboards in Grafana.
  - Health: `/healthz` (liveness) and `/readyz` (readiness) endpoints; include DB ping in readiness.
  - Alerts: on high error rate, payment verification failures, webhook signature mismatches.
- Why
  - Diagnose issues quickly; meet SLOs.
- Where
  - Backend app bootstrap, deployment stack.

---

## 10) Data Model, Indexes, Migrations, Backups
- Actions
  - Define and apply indexes explicitly in Mongoose schemas. Validate unique constraints.
  - Migrations: use `migrate-mongo` or custom scripts with versioned migrations.
  - TTL indexes for tokens (`resetPasswordExpires`, etc.).
  - Backups: scheduled MongoDB dumps (daily), tested restore procedure; retention policy.
- Why
  - Data integrity and recoverability.
- Where
  - `backend/models/*`, `backend/scripts/*` (convert to migration framework).

---

## 11) Compliance, Privacy, and Policy
- Actions
  - Terms of Service, Privacy Policy, Cookie Policy pages.
  - DSR: export/delete user data; already have deletion flows—ensure cascades across messages, registrations, uploads.
  - Data minimization: store only what’s needed; encrypt sensitive fields at rest if required.
  - Audit log for admin actions.
- Why
  - Legal and user trust.
- Where
  - Frontend pages, backend controllers, data lifecycle docs.

---

## 12) Build, Docker, Deploy, and Infra
- Actions
  - Docker
    - `backend/Dockerfile` (multi-stage, node:lts-alpine, non-root user)
    - `frontend/Dockerfile` (build in node, serve via nginx:alpine or static host)
    - `docker-compose.yml` for local dev (backend, frontend, mongo, redis)
  - Nginx
    - Reverse proxy `https://app` → backend, serve frontend, HTTP→HTTPS redirect, gzip/brotli, cache static.
  - CI/CD
    - GitHub Actions: lint/test/build; docker build/push; deploy to Render/Railway/ECS/DOKS.
  - Secrets
    - Store in CI/CD secrets manager; do not commit `.env`.
  - Process manager
    - Use `pm2` or systemd for bare-metal; set `--max-old-space-size`, graceful shutdown, SIGTERM handling.
- Why
  - Reproducible, scalable deployments with SSL and caching.

---

## 13) Performance & Caching
- Actions
  - Add HTTP caching headers for static and public assets; ETag/Last-Modified.
  - Server-side caching of FAQs or read-heavy endpoints (Redis), with invalidation on write.
  - DB query optimization; use projections; paginate everywhere.
  - Queue long-running work (PDF/certificates, emails) to background workers.
- Why
  - Faster UX and lower infra cost.

---

## 14) Testing Strategy
- Actions
  - Unit tests: Jest for utils/controllers (mock DB and services).
  - Integration: Supertest against an in-memory or test Mongo.
  - E2E: Playwright to cover critical flows (signup, login, create event, register, pay, receipts).
  - Load tests: k6 for peak traffic scenarios (chat, calendar, payments).
  - Pre-commit: Husky + lint-staged (ESLint, Prettier) and type checks.
- Why
  - Prevent regressions and ensure reliability at launch.

---

## 15) File-by-File Prioritized Fixes
- `backend/server.js`
  - Replace hardcoded CORS with env-driven origins; add Helmet, compression, sanitizers, rate limiters.
  - Serve only safe static files; remove blanket `/uploads` public serving for sensitive paths.
  - Add `/healthz` and `/readyz`; `app.set('trust proxy', 1)` in production.
- `backend/socketHandler.js`
  - Restrict CORS, add Redis adapter, validate room joins by ACL, add event rate limits.
- `backend/config/db.js`
  - Add retry/backoff; log only summaries in prod; expose connection state for readiness.
- `backend/config/payment.js` and controllers
  - Add webhook verification and idempotency; reconcile jobs; configurable currency; robust error mapping.
- `backend/middlewares/upload.js`
  - Migrate to S3/R2; enforce MIME/size validation; generate sanitized filenames; separate private/public.
- `frontend/src/api/axiosInstance.js`
  - Use `import.meta.env.VITE_API_URL`; implement refresh token flow; handle 401 without location hard redirects; remove localhost.
- `frontend/vite.config.js`
  - Keep dev proxy; no proxy in prod; set `base` when needed; tighten CSP via headers where served.

---

## 16) Ops Runbooks (Minimum)
- Incident response: who to page, on-call rotation, severity levels.
- Payment failures: how to reconcile and refund.
- Data restore: documented restore from latest backup.
- Secrets rotation: schedule and process.

---

## 17) Required Environment Variables (Reference)

Backend
- NODE_ENV, PORT
- MONGO_URI
- JWT_SECRET, JWT_ACCESS_TTL, JWT_REFRESH_TTL
- FRONTEND_URL, BACKEND_URL, CORS_ORIGINS
- GOOGLE_CLIENT_ID
- RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
- OPENROUTER_API_KEY
- REDIS_URL

Frontend
- VITE_API_URL
- VITE_SOCKET_URL
- VITE_APP_ENV

---

## 18) Phased Rollout Plan
1. Hardening & config (Weeks 1–2): envs, security middleware, token redesign, storage move, webhook.
2. Observability & CI/CD (Weeks 2–3): logging, Sentry, metrics, health checks, Docker, Actions pipeline.
3. Scale & performance (Weeks 3–4): Redis adapter, caching, background jobs, DB indexes.
4. Compliance & policies (Weeks 4–5): ToS/Privacy, email domain auth, backups, data lifecycle.
5. Pilot launch (Week 6): staging → canary → production; monitor KPIs and error budgets.

---

## 19) Nice-to-Have (Post-Launch)
- Feature flags and remote config.
- A/B testing framework.
- i18n for UI and email.
- PWA offline support for volunteer check-ins.

---

## 20) Known Hotspots from Current Code
- CORS uses localhost and Socket.IO allows `origin: *`. Tighten for prod.
- Frontend Axios baseURL hardcoded to `http://localhost:5000`. Make env-driven.
- Gmail SMTP for password reset; move to ESP with domain auth.
- Local public uploads include potentially sensitive documents; migrate to private object storage.
- No payment webhooks; add verified webhook flow with idempotency.
- Access/refresh tokens both 7d and stored client-side; redesign to short-lived access + cookie storage.
- No Dockerfiles or CI/CD; add for reproducible deployments.

---

If you want, I can open PR(s) to implement the highest-impact changes (CORS/envs, auth tokens, uploads to S3/R2, webhooks, Docker, CI/CD) as a first milestone.


