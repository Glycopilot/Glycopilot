output "ec2_public_ip" {
  description = "L'adresse EC2 publique fixe"
  value       = aws_eip.web_eip.public_ip
}

output "s3_bucket_name" {
  description = "Le nom du bucket S3 créé"
  value       = aws_s3_bucket.media.bucket
}

output "ssh_connection_string" {
  description = "Commande pour se connecter au serveur en SSH (avec clé projet)"
  value       = "ssh -i infra/ssh/glycopilot_deploy_key ubuntu@${aws_eip.web_eip.public_ip}"
}