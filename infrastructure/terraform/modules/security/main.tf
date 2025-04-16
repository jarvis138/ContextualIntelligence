/**
 * Security Module for CPI Hub
 * 
 * Creates security groups for various components of the architecture:
 * - Load balancer security group
 * - Application servers security group
 * - Database security group
 * - Elasticsearch security group
 */

# Load Balancer Security Group
resource "aws_security_group" "lb" {
  name        = "cpi-hub-${var.environment}-lb-sg"
  description = "Security group for load balancer"
  vpc_id      = var.vpc_id
  
  # Allow HTTP from anywhere
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTP from anywhere"
  }
  
  # Allow HTTPS from anywhere
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTPS from anywhere"
  }
  
  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }
  
  tags = {
    Name        = "cpi-hub-${var.environment}-lb-sg"
    Environment = var.environment
    Terraform   = "true"
    Project     = "cpi-hub"
  }
}

# Application Servers Security Group
resource "aws_security_group" "app" {
  name        = "cpi-hub-${var.environment}-app-sg"
  description = "Security group for application servers"
  vpc_id      = var.vpc_id
  
  # Allow HTTP from load balancer
  ingress {
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.lb.id]
    description     = "Allow HTTP from load balancer"
  }
  
  # Allow HTTPS from load balancer
  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.lb.id]
    description     = "Allow HTTPS from load balancer"
  }
  
  # Allow SSH from bastion host (or admin IPs)
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.admin_cidrs
    description = "Allow SSH from admin IPs"
  }
  
  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }
  
  tags = {
    Name        = "cpi-hub-${var.environment}-app-sg"
    Environment = var.environment
    Terraform   = "true"
    Project     = "cpi-hub"
  }
}

# Database Security Group
resource "aws_security_group" "db" {
  name        = "cpi-hub-${var.environment}-db-sg"
  description = "Security group for database"
  vpc_id      = var.vpc_id
  
  # Allow PostgreSQL from app servers
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
    description     = "Allow PostgreSQL from app servers"
  }
  
  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }
  
  tags = {
    Name        = "cpi-hub-${var.environment}-db-sg"
    Environment = var.environment
    Terraform   = "true"
    Project     = "cpi-hub"
  }
}

# Elasticsearch Security Group
resource "aws_security_group" "es" {
  name        = "cpi-hub-${var.environment}-es-sg"
  description = "Security group for Elasticsearch"
  vpc_id      = var.vpc_id
  
  # Allow HTTPS from app servers
  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
    description     = "Allow HTTPS from app servers"
  }
  
  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }
  
  tags = {
    Name        = "cpi-hub-${var.environment}-es-sg"
    Environment = var.environment
    Terraform   = "true"
    Project     = "cpi-hub"
  }
}