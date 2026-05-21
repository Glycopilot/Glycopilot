output "ec2_public_ip" {
  description = "L'adresse EC2 publique fixe"
  value       = aws_eip.web_eip.public_ip
}

output "s3_bucket_name" {
  description = "Le nom du bucket S3 partagé pour médias, artefacts et backups"
  value       = aws_s3_bucket.media.bucket
}

output "common_vpc_id" {
  description = "ID du VPC du socle commun."
  value       = aws_vpc.main.id
}

output "common_vpc_cidr" {
  description = "CIDR du VPC du socle commun."
  value       = aws_vpc.main.cidr_block
}

output "common_public_subnet_id" {
  description = "Subnet public utilisé par l'EC2 du socle commun."
  value       = aws_subnet.public_subnet.id
}

output "common_public_route_table_id" {
  description = "Route table publique du socle commun."
  value       = aws_route_table.public_rt.id
}

output "common_web_security_group_id" {
  description = "Security group de l'EC2 du socle commun."
  value       = aws_security_group.web_sg.id
}

output "common_ec2_instance_id" {
  description = "Instance EC2 du runtime commun."
  value       = aws_instance.web.id
}

output "ssh_connection_string" {
  description = "Commande pour se connecter au serveur en SSH (avec clé projet)"
  value       = "ssh -i infra/ssh/glycopilot_deploy_key ubuntu@${aws_eip.web_eip.public_ip}"
}
