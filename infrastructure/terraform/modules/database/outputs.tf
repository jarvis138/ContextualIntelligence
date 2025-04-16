/**
 * Outputs for Database Module
 */

output "endpoint" {
  description = "The connection endpoint for the database"
  value       = aws_db_instance.this.endpoint
}

output "address" {
  description = "The hostname of the database instance"
  value       = aws_db_instance.this.address
}

output "port" {
  description = "The port the database is listening on"
  value       = aws_db_instance.this.port
}

output "name" {
  description = "The name of the database"
  value       = aws_db_instance.this.name
}

output "username" {
  description = "The master username for the database"
  value       = aws_db_instance.this.username
}

output "arn" {
  description = "The ARN of the database instance"
  value       = aws_db_instance.this.arn
}

output "id" {
  description = "The ID of the database instance"
  value       = aws_db_instance.this.id
}

output "resource_id" {
  description = "The RDS Resource ID of the database instance"
  value       = aws_db_instance.this.resource_id
}

output "monitoring_role_arn" {
  description = "The ARN of the monitoring role"
  value       = aws_iam_role.rds_monitoring.arn
}