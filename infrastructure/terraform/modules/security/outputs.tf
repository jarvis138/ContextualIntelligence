/**
 * Outputs for Security Module
 */

output "lb_security_group_id" {
  description = "ID of the load balancer security group"
  value       = aws_security_group.lb.id
}

output "app_security_group_id" {
  description = "ID of the application servers security group"
  value       = aws_security_group.app.id
}

output "db_security_group_id" {
  description = "ID of the database security group"
  value       = aws_security_group.db.id
}

output "es_security_group_id" {
  description = "ID of the Elasticsearch security group"
  value       = aws_security_group.es.id
}

output "lb_security_group_arn" {
  description = "ARN of the load balancer security group"
  value       = aws_security_group.lb.arn
}

output "app_security_group_arn" {
  description = "ARN of the application servers security group"
  value       = aws_security_group.app.arn
}

output "db_security_group_arn" {
  description = "ARN of the database security group"
  value       = aws_security_group.db.arn
}

output "es_security_group_arn" {
  description = "ARN of the Elasticsearch security group"
  value       = aws_security_group.es.arn
}