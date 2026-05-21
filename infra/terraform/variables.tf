variable "aws_region" {
  description = "la region aws pour les déploiement"
  type        = string
  default     = "eu-west-3"
}

variable "instance_type" {
  description = "Le type d'instance EC2"
  type        = string
  default     = "t3.micro"
}

variable "ssh_public_key" {
  description = "Clé SSH publique pour l'accès EC2 (passée via GitHub Actions ou fichier local)"
  type        = string
  default     = ""
}

variable "data_bucket_name" {
  description = "Bucket S3 existant utilisé par le socle commun pour les médias, artefacts et backups."
  type        = string
  default     = "glycopilot-aws-s3-bucket-img-artifacts"
}
