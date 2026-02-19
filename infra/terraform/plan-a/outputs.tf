# Output values for Glycopilot Terraform configuration

output "ec2_instance_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_instance.backend_instance.public_ip
}

output "ec2_instance_public_dns" {
  description = "Public DNS name of the EC2 instance"
  value       = aws_instance.backend_instance.public_dns
}

output "s3_media_bucket_name" {
  description = "Name of the S3 bucket for media storage"
  value       = aws_s3_bucket.media_bucket.bucket
}

output "s3_media_bucket_arn" {
  description = "ARN of the S3 bucket for media storage"
  value       = aws_s3_bucket.media_bucket.arn
}

output "vpc_id" {
  description = "ID of the created VPC"
  value       = aws_vpc.glycopilot_vpc.id
}

output "public_subnet_id" {
  description = "ID of the public subnet"
  value       = aws_subnet.public_subnet.id
}

output "security_group_id" {
  description = "ID of the security group"
  value       = aws_security_group.ec2_security_group.id
}

output "postgresql_connection_string" {
  description = "Connection string for PostgreSQL (local on EC2)"
  value       = "postgresql://localhost:5432/glycopilot_db"
}