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