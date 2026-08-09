# outputs.tf

output "configure_kubectl" {
  value = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}

output "vpc_id" {
  value = aws_vpc.main.id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "ecr_frontend_url" {
  value = aws_ecr_repository.frontend.repository_url
}

output "ecr_api_url" {
  value = aws_ecr_repository.api.repository_url
}

output "ecr_worker_url" {
  value = aws_ecr_repository.worker.repository_url
}

# db_secret_arn and redis_endpoint outputs removed — RDS and ElastiCache
# are commented out (see rds.tf / redis.tf). Postgres and Redis now run
# in-cluster instead; their connection details are Kubernetes Service
# DNS names (postgres-service, redis-service), not Terraform outputs.
# Uncomment these two outputs if you re-enable rds.tf / redis.tf later:
#
# output "db_secret_arn" {
#   value = aws_secretsmanager_secret.db_credentials.arn
# }
#
# output "redis_endpoint" {
#   value = aws_elasticache_cluster.redis.cache_nodes[0].address
# }
