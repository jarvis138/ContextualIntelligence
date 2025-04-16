/**
 * Variables for Security Module
 */

variable "vpc_id" {
  description = "ID of the VPC where resources will be created"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "admin_cidrs" {
  description = "CIDR blocks that are allowed to SSH to instances"
  type        = list(string)
  default     = ["10.0.0.0/8"]
}