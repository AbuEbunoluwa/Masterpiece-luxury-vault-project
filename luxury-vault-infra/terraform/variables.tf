# variables.tf

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "project_name" {
  type    = string
  default = "luxury-vault"
}

variable "vpc_cidr" {
  type    = string
  default = "10.10.0.0/16"
}

variable "cluster_name" {
  type    = string
  default = "luxury-vault-eks"
}

variable "kubernetes_version" {
  type    = string
  default = "1.31"
}

variable "node_instance_type" {
  type    = string
  default = "t3.small"
}

variable "node_desired_capacity" {
  type    = number
  default = 2
}

variable "node_min_capacity" {
  type    = number
  default = 1
}

variable "node_max_capacity" {
  type    = number
  default = 4
}

# --- RDS (Postgres) ---
variable "db_name" {
  type    = string
  default = "luxuryvault"
}

variable "db_username" {
  type    = string
  default = "vaultadmin"
}

variable "db_instance_class" {
  type    = string
  default = "db.t3.small"   # small for a learning project — bump up if load-testing later
}

variable "db_allocated_storage" {
  type    = number
  default = 20
}

# --- ElastiCache (Redis) ---
variable "redis_node_type" {
  type    = string
  default = "cache.t3.micro"
}
