# Masterpiece Luxury Vault — Build Log

## Phase 1: Local app (Docker Compose, no Kubernetes yet)

### Done
- [x] Repo structure scaffolded (`api/`, `web/`, `infra/`, `k8s/`, `docs/`)
- [x] DB schema designed — separate detail tables per category (watches, rings, chains), joined to a shared `products` table
- [x] Migration runner (`api/src/config/migrate.js`) — tracks applied migrations in `migrations_log`
- [x] Seed data — 3 watches, 2 rings, 2 chains
- [x] Auth: register/login with bcrypt + JWT (`api/src/routes/auth.js`)
- [x] Products API: list (with category filter), search, get-by-slug (`api/src/routes/products.js`)
- [x] docker-compose for local Postgres + API
- [x] Cart endpoints (add/update/remove items, view cart) — `api/src/routes/cart.js`
- [x] Stripe checkout: pending order creation (transactional, stock-locked with `FOR UPDATE`), PaymentIntent creation — `api/src/routes/orders.js`
- [x] Stripe webhook handler — the only place orders get marked `paid`, verified via signature — `api/src/routes/webhooks.js`
- [x] Order history + single order detail endpoints

### Next up
- [ ] Admin routes for inventory CRUD (requireAdmin middleware already exists)
- [ ] React frontend: product listing, product detail, cart, login/register, admin panel, Stripe Elements checkout UI
- [ ] Run locally end-to-end via docker-compose, confirm full flow works (need `stripe listen` for local webhook testing)

### Note on the payment flow design
Checkout is split deliberately:
1. `POST /api/checkout` creates a `pending` order, reserves stock inside a DB transaction with row locking (`FOR UPDATE`), and creates a Stripe PaymentIntent.
2. Frontend uses the returned `clientSecret` with Stripe.js to collect card details and confirm payment — card numbers never touch our server (important for PCI compliance scope).
3. Stripe calls our webhook (`POST /api/webhooks/stripe`) server-to-server once payment actually succeeds or fails. **Only the webhook marks an order `paid`.** We never trust a frontend "success" callback, since that could be spoofed by anyone with devtools.
4. If payment fails, reserved stock is released back to inventory.

This means for local testing we need the Stripe CLI (`stripe listen --forward-to localhost:4000/api/webhooks/stripe`) to forward webhook events to our machine, since Stripe can't reach `localhost` directly.

## Phase 2: Containerize + Minikube
- [ ] Dockerfile for frontend
- [ ] k8s manifests: Deployment + Service for api, web
- [ ] Local Postgres via Minikube (temporary — RDS comes in Phase 3)
- [ ] Ingress for local routing

## Phase 3: AWS infra (Terraform)
- [ ] VPC, subnets, security groups
- [ ] EKS cluster
- [ ] RDS Postgres instance, migrate DB connection over
- [ ] ECR repos for images
- [ ] IAM roles for service accounts (IRSA)

## Phase 4: Production practices
- [ ] CI/CD pipeline (build → scan → push → deploy)
- [ ] HPA + Cluster Autoscaler/Karpenter
- [ ] Load testing (k6) — observe autoscaling behavior
- [ ] Resource requests/limits, liveness/readiness probes tuned from real behavior

## Phase 5: Security
- [ ] RBAC — least-privilege service accounts
- [ ] Network policies (frontend can't hit DB directly, must go through API)
- [ ] Secrets via AWS Secrets Manager / IRSA, not plain YAML
- [ ] Image scanning (Trivy) in CI

## Phase 6: Observability & incident drills
- [ ] Prometheus + Grafana or CloudWatch dashboards
- [ ] Alerting on error rate / restart count
- [ ] Deliberately break things: kill a node, spike load, inject a memory leak — practice diagnosing live

---

## Key design decisions (and why)

- **Separate tables per product category** (not one JSON blob) — forces real schema/migration work, matches how a real catalog with genuinely different attributes per category would be modeled.
- **`price_cents` as integer** — money is never stored as float/decimal to avoid rounding bugs.
- **Order items snapshot product name + price at purchase time** — orders must reflect what was actually bought, not live-reference a product that could change or be deleted later.
- **RDS chosen over in-cluster Postgres** — for realism; we may still spin up an in-cluster Postgres temporarily in Phase 2 before RDS exists, purely to unblock early Kubernetes practice.
