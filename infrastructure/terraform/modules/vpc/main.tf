/**
 * VPC Module for CPI Hub
 * 
 * Creates a VPC with public and private subnets across multiple availability zones.
 * Includes internet gateway, NAT gateways, and appropriate route tables.
 */

# VPC resource
resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {
    Name        = var.vpc_name
    Environment = var.environment
    Terraform   = "true"
    Project     = "cpi-hub"
  }
}

# Public subnets
resource "aws_subnet" "public" {
  count                   = length(var.public_subnets)
  vpc_id                  = aws_vpc.this.id
  cidr_block              = var.public_subnets[count.index]
  availability_zone       = var.azs[count.index % length(var.azs)]
  map_public_ip_on_launch = true
  
  tags = {
    Name        = "${var.vpc_name}-public-${count.index + 1}"
    Environment = var.environment
    Terraform   = "true"
    Project     = "cpi-hub"
    Tier        = "public"
  }
}

# Private subnets
resource "aws_subnet" "private" {
  count                   = length(var.private_subnets)
  vpc_id                  = aws_vpc.this.id
  cidr_block              = var.private_subnets[count.index]
  availability_zone       = var.azs[count.index % length(var.azs)]
  map_public_ip_on_launch = false
  
  tags = {
    Name        = "${var.vpc_name}-private-${count.index + 1}"
    Environment = var.environment
    Terraform   = "true"
    Project     = "cpi-hub"
    Tier        = "private"
  }
}

# Internet Gateway for public subnets
resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id
  
  tags = {
    Name        = "${var.vpc_name}-igw"
    Environment = var.environment
    Terraform   = "true"
    Project     = "cpi-hub"
  }
}

# Elastic IPs for NAT Gateways
resource "aws_eip" "nat" {
  count      = length(var.azs)
  vpc        = true
  depends_on = [aws_internet_gateway.this]
  
  tags = {
    Name        = "${var.vpc_name}-nat-eip-${count.index + 1}"
    Environment = var.environment
    Terraform   = "true"
    Project     = "cpi-hub"
  }
}

# NAT Gateways for private subnets
resource "aws_nat_gateway" "this" {
  count         = length(var.azs)
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  depends_on    = [aws_internet_gateway.this]
  
  tags = {
    Name        = "${var.vpc_name}-nat-gw-${count.index + 1}"
    Environment = var.environment
    Terraform   = "true"
    Project     = "cpi-hub"
  }
}

# Route table for public subnets
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id
  
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }
  
  tags = {
    Name        = "${var.vpc_name}-public-rt"
    Environment = var.environment
    Terraform   = "true"
    Project     = "cpi-hub"
  }
}

# Route tables for private subnets
resource "aws_route_table" "private" {
  count  = length(var.azs)
  vpc_id = aws_vpc.this.id
  
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.this[count.index].id
  }
  
  tags = {
    Name        = "${var.vpc_name}-private-rt-${count.index + 1}"
    Environment = var.environment
    Terraform   = "true"
    Project     = "cpi-hub"
  }
}

# Route table associations for public subnets
resource "aws_route_table_association" "public" {
  count          = length(var.public_subnets)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Route table associations for private subnets
resource "aws_route_table_association" "private" {
  count          = length(var.private_subnets)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index % length(var.azs)].id
}

# VPC Endpoints for S3
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.this.id
  service_name = "com.amazonaws.${var.aws_region}.s3"
  
  tags = {
    Name        = "${var.vpc_name}-s3-endpoint"
    Environment = var.environment
    Terraform   = "true"
    Project     = "cpi-hub"
  }
}

# VPC Endpoint route table associations
resource "aws_vpc_endpoint_route_table_association" "private_s3" {
  count           = length(var.azs)
  route_table_id  = aws_route_table.private[count.index].id
  vpc_endpoint_id = aws_vpc_endpoint.s3.id
}

resource "aws_vpc_endpoint_route_table_association" "public_s3" {
  route_table_id  = aws_route_table.public.id
  vpc_endpoint_id = aws_vpc_endpoint.s3.id
}