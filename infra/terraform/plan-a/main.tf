# Terraform configuration for Glycopilot - Plan A (Economic)
# This configuration deploys the minimal AWS infrastructure for the backend
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.16"
    }
  }
}

provider "aws" {
  region = "eu-west-3" # Paris region
}

# Data source to get the latest Ubuntu 24.04 LTS AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Create a VPC for our infrastructure
resource "aws_vpc" "glycopilot_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = {
    Name = "glycopilot-vpc-plan-a"
  }
}

# Create a public subnet
resource "aws_subnet" "public_subnet" {
  vpc_id                  = aws_vpc.glycopilot_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "eu-west-3a"
  map_public_ip_on_launch = true
  tags = {
    Name = "glycopilot-public-subnet"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "glycopilot_igw" {
  vpc_id = aws_vpc.glycopilot_vpc.id
  tags = {
    Name = "glycopilot-igw"
  }
}

# Route table for public subnet
resource "aws_route_table" "public_route_table" {
  vpc_id = aws_vpc.glycopilot_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.glycopilot_igw.id
  }

  tags = {
    Name = "glycopilot-public-route-table"
  }
}

# Associate route table with public subnet
resource "aws_route_table_association" "public_association" {
  subnet_id      = aws_subnet.public_subnet.id
  route_table_id = aws_route_table.public_route_table.id
}

# Security group for EC2 instance
resource "aws_security_group" "ec2_security_group" {
  name        = "glycopilot-ec2-sg"
  description = "Security group for Glycopilot EC2 instance"
  vpc_id      = aws_vpc.glycopilot_vpc.id

  # SSH access - IMPORTANT: Restrict to your IP address for production!
  # Replace 0.0.0.0/0 with your IP address (e.g., "203.0.113.0/32")
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_allowed_cidr]
    description = "SSH access - must be restricted to specific IPs in production"
  }

  # HTTP access
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS access
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # PostgreSQL access (only within VPC)
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  # Outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "glycopilot-ec2-sg"
  }
}

# EC2 instance for backend
resource "aws_instance" "backend_instance" {
  ami           = data.aws_ami.ubuntu.id # Use latest Ubuntu 24.04 LTS
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.public_subnet.id

  vpc_security_group_ids = [aws_security_group.ec2_security_group.id]

  associate_public_ip_address = true

  key_name = "glycopilot-key-pair"

  tags = {
    Name = "glycopilot-backend"
  }

  # User data to install dependencies
  user_data = <<-EOF
              #!/bin/bash
              apt-get update -y
              apt-get upgrade -y
              apt-get install -y python3-pip python3-dev libpq-dev postgresql postgresql-contrib nginx
              apt-get install -y git curl wget build-essential
              
              # Install AWS CLI
              apt-get install -y awscli
              
              # Create directory for the project
              mkdir -p /var/www/glycopilot
              chown -R ubuntu:ubuntu /var/www/glycopilot
              EOF
}

# S3 bucket for media storage
resource "aws_s3_bucket" "media_bucket" {
  bucket = "glycopilot-media-bucket-${random_id.bucket_suffix.hex}"
  
  tags = {
    Name        = "Glycopilot Media Bucket"
    Environment = "Production"
  }
}

# Random suffix for bucket name
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# Enable versioning for the S3 bucket
resource "aws_s3_bucket_versioning" "media_bucket_versioning" {
  bucket = aws_s3_bucket.media_bucket.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Enable server-side encryption for the S3 bucket
resource "aws_s3_bucket_server_side_encryption_configuration" "media_bucket_encryption" {
  bucket = aws_s3_bucket.media_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block public access by default
resource "aws_s3_bucket_public_access_block" "media_bucket_public_block" {
  bucket = aws_s3_bucket.media_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 bucket policy - Only allow CloudFront or authenticated access
# For public media access, use CloudFront distribution instead

# Output values
output "ec2_public_ip" {
  value = aws_instance.backend_instance.public_ip
}

output "s3_bucket_name" {
  value = aws_s3_bucket.media_bucket.bucket
}

output "vpc_id" {
  value = aws_vpc.glycopilot_vpc.id
}

output "public_subnet_id" {
  value = aws_subnet.public_subnet.id
}