/**
 * Database Module for CPI Hub
 * 
 * Creates a PostgreSQL RDS instance in a private subnet with appropriate
 * security groups and parameter groups.
 */

# DB Subnet Group
resource "aws_db_subnet_group" "this" {
  name        = "${var.identifier}-subnet-group"
  description = "DB subnet group for ${var.identifier}"
  subnet_ids  = var.subnet_ids
  
  tags = {
    Name        = "${var.identifier}-subnet-group"
    Environment = var.environment
    Terraform   = "true"
    Project     = "cpi-hub"
  }
}

# DB Parameter Group
resource "aws_db_parameter_group" "this" {
  name        = "${var.identifier}-param-group"
  family      = "postgres13"
  description = "Parameter group for ${var.identifier}"
  
  parameter {
    name  = "log_connections"
    value = "1"
  }
  
  parameter {
    name  = "log_disconnections"
    value = "1"
  }
  
  parameter {
    name  = "log_statement"
    value = "ddl"
  }
  
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }
  
  tags = {
    Name        = "${var.identifier}-param-group"
    Environment = var.environment
    Terraform   = "true"
    Project     = "cpi-hub"
  }
}

# RDS Instance
resource "aws_db_instance" "this" {
  identifier            = var.identifier
  engine               = var.engine
  engine_version       = var.engine_version
  instance_class       = var.instance_class
  allocated_storage    = var.allocated_storage
  storage_type         = "gp2"
  storage_encrypted    = var.storage_encrypted
  
  name                 = var.name
  username             = var.username
  password             = var.password
  
  vpc_security_group_ids = var.security_group_ids
  db_subnet_group_name   = aws_db_subnet_group.this.name
  parameter_group_name   = aws_db_parameter_group.this.name
  
  # Backup and maintenance
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"
  
  # Enhanced monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn
  
  # Performance insights
  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  
  # Deletion protection
  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "${var.identifier}-final-snapshot"
  
  tags = {
    Name        = var.identifier
    Environment = var.environment
    Terraform   = "true"
    Project     = "cpi-hub"
  }
}

# IAM Role for Enhanced Monitoring
resource "aws_iam_role" "rds_monitoring" {
  name = "${var.identifier}-monitoring-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
  
  tags = {
    Name        = "${var.identifier}-monitoring-role"
    Environment = var.environment
    Terraform   = "true"
    Project     = "cpi-hub"
  }
}

# Attach policy to the monitoring role
resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}