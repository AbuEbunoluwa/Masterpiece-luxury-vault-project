# eks.tf

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = var.cluster_name
  cluster_version = var.kubernetes_version

  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.private[*].id

  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true

  eks_managed_node_groups = {
    default = {
      instance_types = [var.node_instance_type]
      min_size       = var.node_min_capacity
      max_size       = var.node_max_capacity
      desired_size   = var.node_desired_capacity
      subnet_ids     = aws_subnet.private[*].id
    }
  }

  enable_cluster_creator_admin_permissions = true

  tags = {
    Project   = var.project_name
    ManagedBy = "Terraform"
  }
}

# Security group allowing the EKS node group to reach RDS/ElastiCache —
# currently UNUSED since rds.tf/redis.tf are commented out (Postgres/Redis
# run in-cluster now instead, no separate SG needed for pod-to-pod traffic
# inside the cluster). Left in place, costs nothing to exist, and saves you
# re-writing it if you re-enable RDS/ElastiCache later.
resource "aws_security_group" "data_access" {
  name        = "${var.project_name}-data-access"
  description = "Allows EKS nodes to reach RDS and ElastiCache"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${var.project_name}-data-access" }
}

resource "aws_security_group_rule" "eks_to_data" {
  type                     = "ingress"
  from_port                = 0
  to_port                  = 0
  protocol                 = "-1"
  security_group_id        = aws_security_group.data_access.id
  source_security_group_id = module.eks.node_security_group_id
}
