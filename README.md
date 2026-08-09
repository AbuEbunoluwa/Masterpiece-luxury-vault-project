# Masterpiece Vault

A cloud-native luxury e-commerce platform, designed and deployed end-to-end on Amazon EKS as a real, hands-on production infrastructure project, not a tutorial deployment. This repo covers the full stack: application code, infrastructure as code, container orchestration, observability, and a documented history of real production incidents deliberately induced and resolved.

**Live Demo:** http://k8s-default-luxuryva-166dbe58a2-2118244787.us-east-1.elb.amazonaws.com

---

## What This Project Actually Demonstrates

Most portfolio projects show a clean, working deployment and stop there. This one intentionally goes further: after getting the application running in production, the infrastructure was deliberately broken in controlled ways, nodes drained mid-traffic, load spiked past capacity, memory starved on purpose, to build real operational intuition, not just deployment experience. One of those exercises also surfaced a genuine, unplanned production incident involving real data loss, which was diagnosed, recovered from, and fixed at the root cause. All of it is documented below, honestly, including the parts that did not go as planned.

---

## Architecture
+--------------------------+
                    |   AWS Load Balancer       |
                    |   Controller (Ingress)    |
                    +-------------+--------------+
                                  |
                    +-------------v--------------+
                    |   Application Load          |
                    |   Balancer (internet-       |
                    |   facing, path routing)     |
                    +--------+-----------+---------+
                             |           |
                       /api/*|           |/
                             v           v
                    +-----------+ +-----------+
                    |    API    | |  Frontend  |
                    |  (Node/   | | (React /   |
                    |  Express) | |  Vite)     |
                    |  2 pods   | |  2 pods    |
                    +-----+-----+ +-----------+
                          |
               +----------+----------+
               v                     v
        +-------------+      +-------------+
        |  PostgreSQL  |      |    Redis     |
        | (in-cluster, |      | (in-cluster) |
        |  1 replica,  |      |  1 replica   |
        |  EBS-backed  |      +-------------+
        |  PVC)        |
        +-------------+
**Networking:** custom VPC with public and private subnets across 2 AZs, NAT Gateway for outbound access from private subnets, EKS worker nodes and stateful workloads placed in private subnets only.

**Container registry:** Amazon ECR, one repository per service (luxury-vault-api, luxury-vault-frontend), with immutable image tags to keep deployments traceable and rollback-safe.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, served via serve in production |
| API | Node.js, Express |
| Database | PostgreSQL (in-cluster) |
| Cache / Sessions | Redis (in-cluster) |
| Payments | Stripe, with signature-verified webhook handling |
| Containerization | Docker (multi-stage builds) |
| Orchestration | Kubernetes (Amazon EKS) |
| Deployment | Helm (custom chart) |
| Infrastructure as Code | Terraform |
| Ingress / Load Balancing | AWS Application Load Balancer via AWS Load Balancer Controller |
| Monitoring | Prometheus, Grafana |
| Storage | AWS EBS CSI driver, PersistentVolumeClaims |

---

## Features

- Secure user registration, login, and session handling
- Product catalog with category and search support
- Cart management (add, update, remove items)
- Checkout with Stripe payment integration
- Server-verified payment confirmation via Stripe webhooks. Order state is only ever trusted from Stripe's server-to-server callback, never from the client, and the webhook route receives the raw request body (mounted with express.raw() ahead of the global JSON body parser) so signature verification works correctly
- Order history and order detail views

---

## Infrastructure & Deployment

### 1. Provision infrastructure with Terraform
```bash
cd luxury-vault-infra/terraform
terraform init
terraform plan
terraform apply
```
Provisions the VPC, EKS cluster and managed node group, ECR repositories, and the EBS CSI driver addon with its IRSA role (required for PersistentVolumeClaims to bind at all, EKS does not include this driver by default).

### 2. Connect kubectl to the cluster
```bash
aws eks update-kubeconfig --region us-east-1 --name luxury-vault-eks
```

### 3. Build and push images to ECR
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

docker build -t <account-id>.dkr.ecr.us-east-1.amazonaws.com/luxury-vault-api:vN ./api
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/luxury-vault-api:vN

docker build --build-arg VITE_API_URL=<alb-hostname> -t <account-id>.dkr.ecr.us-east-1.amazonaws.com/luxury-vault-frontend:vN ./web
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/luxury-vault-frontend:vN
```
Note: the frontend's API URL is a Vite build-time variable, not a runtime environment variable, it must be passed as a --build-arg, since the production image only serves pre-built static files.

### 4. Install the AWS Load Balancer Controller
Required for the Ingress resource to actually provision a real ALB, installing EKS does not do this automatically. Needs an IRSA-backed service account; see RUNBOOK.md for the full IAM policy and eksctl setup steps.

### 5. Create the database credentials secret
```bash
kubectl create secret generic db-credentials \
  --from-literal=username=vaultadmin \
  --from-literal=password="$(openssl rand -base64 24)"
```

### 6. Deploy with Helm
```bash
cd ../helm
helm install luxury-vault . --dry-run --debug
helm install luxury-vault .
```

### 7. Run database migrations
```bash
kubectl exec -it $(kubectl get pod -l app=api -o jsonpath='{.items[0].metadata.name}') -- node src/config/migrate.js
```

---

## Fault Injection & Incident Response

After the application was fully deployed and functional, three deliberate fault-injection exercises were run against the live cluster to build real operational readiness rather than assuming the system was resilient. Full step-by-step procedures live in FAULT_INJECTION_RUNBOOK.md.

### Fault 1: Node failure under live traffic
Drained a worker node while it was actively serving both API and frontend pods.

**Result:** Zero dropped requests observed at the ALB level, pods on the drained node rescheduled cleanly onto the remaining node, and the ALB correctly routed around the terminating pod before it went fully down.

**Real finding:** with only 2 nodes and no Cluster Autoscaler configured, draining one node concentrates the entire application, including the single-replica PostgreSQL pod, onto the one remaining node. The drain itself was handled gracefully, but it revealed a genuine single point of failure that a clean test would not have surfaced on its own.

### The incident this exercise triggered: production data loss
During node-rebalancing that followed the drain exercise, the PostgreSQL PersistentVolumeClaim was deleted and, because the cluster's default gp3 StorageClass had no explicit reclaimPolicy set (which defaults to Delete), the underlying EBS volume was deleted along with it. This was a real, unplanned production incident, not a simulated one: the database and all its data were genuinely gone, with no snapshot in place.

**Recovery:** the database was restored from a pg_dump backup taken from a separate local development environment, copied into the new PostgreSQL pod, and restored with pg_restore.

**Root cause fix:** the StorageClass was recreated with reclaimPolicy: Retain, so a deleted PVC no longer deletes its underlying EBS volume automatically. Manual EBS snapshotting was also adopted going forward as a standard practice, not an afterthought.

This incident is the single most valuable lesson from the entire project: default Kubernetes storage behavior is not automatically safe for stateful workloads, and that gap is invisible until it costs you real data.

### Fault 2: Load spike
Used hey to fire 50 concurrent workers against the /api/products endpoint for 60 seconds.

**Result:** No autoscaling response (no HorizontalPodAutoscaler was configured, confirmed as an expected gap rather than a bug). p99 latency reached 5.5 seconds under load, worst case 20 seconds, though zero requests errored outright.

**Diagnosis:** ruled out CPU as the bottleneck via kubectl top, then confirmed via pg_stat_activity that the API's PostgreSQL connection pool (max: 10 per pod, 2 pods, about 20 total) was saturating under concurrent load, queuing requests rather than the infrastructure being under-resourced.

**Attempted fix and what it taught:** raising the pool size to max: 20 per pod (40 total) made performance measurably worse, p99 latency rose to 18.3 seconds and requests began timing out outright. The pool limit had been inadvertently protecting PostgreSQL's own fixed CPU limit (500m) from being overwhelmed; removing that limit just let more concurrent work pile up against a database that had no more capacity to give. The fix was reverted.

A separate anomalous 39-second latency spike observed during testing was traced, using AWS CloudWatch's TargetResponseTime metric as ground truth, to a maximum of 19 milliseconds at the ALB and target level, confirming the spike originated on the client side (local network conditions), not inside the AWS infrastructure. This is documented as a completed diagnostic process, not a resolved infrastructure bug, since the infrastructure was never actually the cause.

### Fault 3: Out-of-memory kill
Deliberately lowered the API pod's memory limit to 20Mi, well below what a Node.js process requires to start.

**Result:** confirmed OOMKilled status with exit code 137, followed by CrashLoopBackOff with escalating restart backoff, exactly matching expected Kubernetes behavior for a genuine out-of-memory termination. Reverted immediately after confirmation.

---

## Key Lessons From This Project

- Graceful node failure handling and dangerous default storage behavior can coexist in the same cluster; passing one resilience test does not mean the system is resilient overall.
- A fix that addresses the symptom you can see can worsen a bottleneck you cannot see yet. Always re-test after a change instead of assuming it worked.
- Ground-truth measurement (CloudWatch, in this case) matters when client-side tooling and infrastructure-side metrics disagree, do not assume the infrastructure is guilty by default.
- reclaimPolicy: Retain and regular volume snapshots are not optional extras for any StatefulSet-style workload holding real data; this project learned that the expensive way, and now treats it as a baseline requirement, not a nice-to-have.

---

## Project Structure
---

## Author

Abeeb Oladejo
DevOps / Site Reliability Engineer
linkedin.com/in/abeeb-oladejo-9b44a9405 | github.com/AbuEbunoluwa
