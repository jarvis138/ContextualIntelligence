/**
 * Variables for Database Module
 */

variable "identifier" {
  description = "Identifier for the RDS instance"
  type        = string
}

variable "engine" {
  description = "Database engine type"
  type        = string
  default     = "postgres"
}

variable "engine_version" {
  description = "Database engine version"
  type        = string
  default     = "13.7"
}

variable "instance_class" {
  description = "Instance type for the RDS instance"
  type        = string
  default     = "db.t3.medium"
}

variable "allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}

variable "storage_encrypted" {
  description = "Enable storage encryption"
  type        = bool
  default     = true
}

variable "name" {
  description = "Name of the database to create"
  type        = string
}

variable "username" {
  description = "Master username for the database"
  type        = string
}

variable "password" {
  description = "Master password for the database"
  type        = string
  sensitive   = true
}

variable "vpc_id" {
  description = "ID of the VPC where the database will be created"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs where the database can be created"
  type        = list(string)
}

variable "security_group_ids" {
  description = "List of security group IDs to attach to the database"
  type        = list(string)
}

variable "environment" {
  description = "Environment name"
  type        = string
}