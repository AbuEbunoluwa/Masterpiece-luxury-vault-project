# PHASE 1 RUNBOOK — Get it running on EKS

This covers the sequence to get all 4 services (frontend, API, worker,
plus RDS + Redis as managed services) live on a real EKS cluster.
Phases 2-6 (chaos testing, CI/CD, security hardening, observability,
final incident simulation) are separate follow-up sessions — don't try
to do them all at once.

## 0. Prerequisites
```bash
aws --version        # AWS CLI v2
terraform --version  # >= 1.5.0
kubectl version --client
helm version
eksctl version        # optional, not required for this Terraform-based approach
```
Confirm `aws configure` is set up with credentials that have permission
to create VPCs, EKS, RDS, ElastiCache, ECR, IAM roles, and Secrets Manager
entries.

## 1. Provision the infrastructure
```bash
cd terraform
terraform init
terraform plan     # READ THIS before applying — confirms resource count/cost
terraform apply
```
This takes 15-20 minutes (EKS control plane + RDS + ElastiCache all take
real time to provision — don't assume it's stuck).

## 2. Connect kubectl to the new cluster
```bash
terraform output configure_kubectl
# copy-paste and run the command it prints, e.g.:
aws eks update-kubeconfig --region us-east-1 --name luxury-vault-eks
kubectl get nodes    # should show your worker nodes
```

## 3. Install the AWS Load Balancer Controller
This is NOT automatic — EKS existing doesn't mean Ingress resources do
anything by themselves. Without this, the ingress.yaml manifest in this
chart will sit there doing nothing.
```bash
# IRSA setup + Helm install — see AWS's official current docs for the
# exact IAM policy JSON, it's updated periodically:
# https://docs.aws.amazon.com/eks/latest/userguide/lbc-helm.html
helm repo add eks https://aws.github.io/eks-charts
helm repo update
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=luxury-vault-eks \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller
```

## 4. Build and push your images to ECR
```bash
# Get the ECR URLs
terraform -chdir=terraform output ecr_api_url
terraform -chdir=terraform output ecr_frontend_url
terraform -chdir=terraform output ecr_worker_url

# Authenticate Docker to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build + tag + push each service (run from each service's own directory)
docker build -t <ecr_api_url>:v1 ./api
docker push <ecr_api_url>:v1

docker build -t <ecr_frontend_url>:v1 ./frontend
docker push <ecr_frontend_url>:v1

docker build -t <ecr_worker_url>:v1 ./worker
docker push <ecr_worker_url>:v1
```
Note: `image_tag_mutability = "IMMUTABLE"` on these repos means you
CANNOT push a second image under the same tag — use `v1`, `v2`, etc.,
never reuse `latest` for anything beyond quick local testing. This is
deliberate, not a bug — immutable tags are what makes rollback reliable
later.

## 5. Create the DB credentials Secret
No more pulling from Secrets Manager — Postgres runs in-cluster now, so
you just pick a username/password yourself and create the Secret directly:
```bash
kubectl create secret generic db-credentials \
  --from-literal=username=vaultadmin \
  --from-literal=password="$(openssl rand -base64 24)"
```
Save that generated password somewhere (a password manager, not a text
file in your repo) — you'll need it if you ever connect to Postgres
directly with `psql` for debugging.

## 6. Fill in values.yaml
Replace every `REPLACE_WITH_*` placeholder in `helm/values.yaml` with
your actual Terraform outputs (ECR URLs, Redis endpoint, and your
domain or a placeholder hostname if you don't have a real domain yet).

## 7. Dry-run, then deploy
```bash
cd helm
helm install luxury-vault . --dry-run --debug    # read the rendered output carefully
helm install luxury-vault .
```

## 8. Verify
```bash
kubectl get pods
kubectl get svc
kubectl get ingress
```
The Ingress's `ADDRESS` column will populate with a real ALB hostname
once the AWS Load Balancer Controller finishes provisioning it —
this can take 2-3 minutes after `helm install`, it won't appear instantly.

## 9. Hit it
```bash
curl http://<alb-hostname>/api/health
```

---

## What's deliberately NOT done yet (don't add these now)
- Worker is a Deployment, not a Job/CronJob against a real queue — that's
  its own milestone later
- Postgres and Redis run IN-CLUSTER (not RDS/ElastiCache) — deliberate,
  to avoid AWS hourly costs during this learning phase. Migrating them
  to managed services later is a legitimate, worthwhile exercise of its
  own (and closer to what larger companies do at scale) — just not now.
  rds.tf/redis.tf are commented out in the terraform/ folder, not deleted,
  so you can revisit this without rebuilding from scratch.
- No CI/CD — you're pushing images by hand right now, on purpose, so you
  feel what Phase 3 automates away
- No monitoring/alerting yet — that's Phase 5
- No IRSA/Secrets Manager auto-sync — you're creating the DB secret
  manually with `kubectl create secret`, which is fine at this stage since
  there's no managed AWS secret to sync from anymore anyway

## A cost note, since avoiding cost was the whole point of this change
Even without RDS/ElastiCache, an EKS cluster + its EC2 worker nodes + the
NAT Gateway are NOT free — NAT Gateway in particular bills hourly plus
per-GB, and forgetting one running is a classic surprise AWS bill. When
you're done experimenting for the day:
```bash
cd terraform
terraform destroy
```
This tears down everything (cluster, nodes, NAT, VPC) cleanly. Since your
Postgres data only lives in an in-cluster PVC anyway (not a real backup),
there's nothing meaningful lost by destroying and recreating the whole
stack each time you sit down to work on this.
