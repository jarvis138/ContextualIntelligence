/**
 * Main Terraform Configuration for CPI Hub
 * 
 * This file defines the infrastructure required to run the CPI Hub in production.
 * It includes definitions for:
 * - Compute resources
 * - Database
 * - Storage
 * - Networking
 * - Security
 */

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
  
  backend "s3" {
    # This will be configured in a separate file or via environment variables
    # during the actual deployment process
  }
}

provider "aws" {
  region = var.aws_region
  # Authentication will be handled via environment variables or IAM roles
}

# Import common variables
variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "db_username" {
  description = "Database admin username"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Database admin password"
  type        = string
  sensitive   = true
}

# Create a VPC for isolation
module "vpc" {
  source = "./modules/vpc"
  
  vpc_name       = "cpi-hub-${var.environment}"
  vpc_cidr       = "10.0.0.0/16"
  azs            = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  
  environment   = var.environment
}

# Database for persistent data
module "database" {
  source = "./modules/database"
  
  identifier          = "cpi-hub-${var.environment}"
  engine              = "postgres"
  engine_version      = "13.7"
  instance_class      = "db.t3.medium"
  allocated_storage   = 20
  storage_encrypted   = true
  
  name                = "cpi_hub"
  username            = var.db_username
  password            = var.db_password
  
  vpc_id              = module.vpc.vpc_id
  subnet_ids          = module.vpc.private_subnets
  security_group_ids  = [module.security.db_security_group_id]
  
  environment         = var.environment
}

# Elasticsearch for search functionality
module "elasticsearch" {
  source = "./modules/elasticsearch"
  
  domain_name         = "cpi-hub-${var.environment}"
  elasticsearch_version = "7.10"
  
  cluster_config = {
    instance_type     = "t3.small.elasticsearch"
    instance_count    = 1
    zone_awareness_enabled = false
  }
  
  ebs_options = {
    ebs_enabled       = true
    volume_size       = 10
  }
  
  vpc_options = {
    subnet_ids        = [module.vpc.private_subnets[0]]
    security_group_ids = [module.security.es_security_group_id]
  }
  
  encrypt_at_rest = {
    enabled           = true
  }
  
  node_to_node_encryption = {
    enabled           = true
  }
  
  environment       = var.environment
}

# App servers for running the CPI Hub
module "app_servers" {
  source = "./modules/app_servers"
  
  name                = "cpi-hub-${var.environment}"
  instance_type       = "t3.medium"
  key_name            = "cpi-hub-${var.environment}"
  ami_id              = "ami-0c55b159cbfafe1f0" # Amazon Linux 2
  
  min_size            = 2
  max_size            = 5
  desired_capacity    = 2
  
  vpc_id              = module.vpc.vpc_id
  subnet_ids          = module.vpc.private_subnets
  security_group_ids  = [module.security.app_security_group_id]
  
  db_host             = module.database.endpoint
  db_name             = module.database.name
  db_user             = var.db_username
  db_password         = var.db_password
  
  elasticsearch_endpoint = module.elasticsearch.endpoint
  
  environment         = var.environment
}

# Security groups for network protection
module "security" {
  source = "./modules/security"
  
  vpc_id              = module.vpc.vpc_id
  environment         = var.environment
}

# Load balancer for traffic distribution
module "load_balancer" {
  source = "./modules/load_balancer"
  
  name                = "cpi-hub-${var.environment}"
  vpc_id              = module.vpc.vpc_id
  subnets             = module.vpc.public_subnets
  security_groups     = [module.security.lb_security_group_id]
  
  target_group_arns   = module.app_servers.target_group_arns
  
  environment         = var.environment
}

# Storage for backups and file uploads
module "storage" {
  source = "./modules/storage"
  
  bucket_name         = "cpi-hub-${var.environment}-storage"
  environment         = var.environment
}

# Monitoring and logging
module "monitoring" {
  source = "./modules/monitoring"
  
  name                = "cpi-hub-${var.environment}"
  environment         = var.environment
}

# Outputs for reference
output "lb_dns_name" {
  description = "DNS name of the load balancer"
  value       = module.load_balancer.dns_name
}

output "db_endpoint" {
  description = "Database endpoint"
  value       = module.database.endpoint
}

output "elasticsearch_endpoint" {
  description = "Elasticsearch endpoint"
  value       = module.elasticsearch.endpoint
}