# Variables for Glycopilot Terraform configuration

variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "eu-west-3"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "key_pair_name" {
  description = "Name of the EC2 key pair"
  type        = string
  default     = "glycopilot-key-pair"
}

variable "ssh_allowed_cidr" {
  description = "CIDR block allowed to access SSH. IMPORTANT: Change from 0.0.0.0/0 to your IP for security!"
  type        = string
  default     = "0.0.0.0/0"
}

variable "vpc_cidr_block" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr_block" {
  description = "CIDR block for the public subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "availability_zone" {
  description = "Availability zone for resources"
  type        = string
  default     = "eu-west-3a"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "glycopilot"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}
