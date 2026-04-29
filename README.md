# ClubChain DAO Governance System

Production-ready full-stack starter for student-club DAO governance with DevOps setup.

## What is implemented

- Multi-club architecture (single platform, many clubs)
- Club-scoped RBAC (`ADMIN`, `CORE_MEMBER`, `MEMBER`)
- Proposal lifecycle (`DRAFT -> ACTIVE -> APPROVED/REJECTED -> EXECUTED`)
- Voting with one-member-one-vote constraint and transparent vote records
- Treasury simulation with credit/debit transactions
- Analytics + activity/audit feeds
- College-email OTP authentication flow
- Docker + Docker Compose setup
- Kubernetes manifests (deployments, services, ingress, HPA, migration job)
- GitHub Actions CI/CD workflows

## Tech stack

- Frontend: React + TypeScript + Vite + React Query
- Backend: Node.js + Express + TypeScript + Prisma
- Database: PostgreSQL
- DevOps: Docker, Kubernetes
- CI/CD: GitHub Actions + GHCR

## Project structure

- `backend/` Express API, Prisma schema/migrations
- `frontend/` React app
- `k8s/` Kubernetes manifests
- `.github/workflows/` CI/CD pipelines

## Local development

### 1) Backend

```bash
cd backend
cp .env.example .env
npm install
```

Start PostgreSQL (Docker example):

```bash
docker run --name clubchain-pg \
  -e POSTGRES_DB=clubchain \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 -d postgres:16-alpine
```

Run migrations + start backend:

```bash
npx prisma migrate deploy
npm run dev
```

Backend URL: `http://localhost:8080`
Health check: `http://localhost:8080/health`

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

Set API base URL if needed:

```bash
# frontend/.env
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

## Build validation

```bash
npm run build --prefix backend
npm run build --prefix frontend
```

## Docker

```bash
docker compose up -d --build
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8080`

## Kubernetes deploy (example order)

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/backend-service.yaml -f k8s/frontend-service.yaml
kubectl apply -f k8s/backend-deployment.yaml -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/ingress.yaml -f k8s/hpa-backend.yaml

kubectl -n clubchain delete job clubchain-db-migrate --ignore-not-found
kubectl apply -f k8s/job-migrate.yaml
kubectl -n clubchain wait --for=condition=complete job/clubchain-db-migrate --timeout=240s
```

## CI/CD

- CI: `.github/workflows/ci.yml`
  - Installs dependencies
  - Generates Prisma client
  - Builds backend + frontend
- CD: `.github/workflows/cd.yml`
  - Builds/pushes Docker images to GHCR
  - Applies Kubernetes manifests
  - Updates deployment image tags
  - Runs migration job

Required GitHub secret:

- `KUBE_CONFIG_B64` (base64-encoded kubeconfig)

## API base paths

- Auth: `/api/v1/auth/*`
- Clubs: `/api/v1/clubs/*`
- Proposals: `/api/v1/clubs/:clubId/proposals/*`
- Votes: `/api/v1/clubs/:clubId/proposals/:proposalId/votes*`
- Treasury: `/api/v1/clubs/:clubId/treasury*`
- Analytics: `/api/v1/clubs/:clubId/analytics/*`, `/activity-feed`, `/audit-logs`

## Notes

- OTP delivery logs to backend logs when SMTP is not configured.
- For production, use managed PostgreSQL (RDS/Cloud SQL).
- Replace placeholder values in `k8s/secret.yaml` and image names in manifests.
