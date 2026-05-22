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

variable "enable_rds" {
  description = "Active la création de la base PostgreSQL RDS du socle commun. Par défaut désactivé pour éviter tout coût involontaire."
  type        = bool
  default     = false
}

variable "rds_identifier" {
  description = "Identifiant AWS RDS pour la future base canonique Glycopilot."
  type        = string
  default     = "glycopilot-postgres"
}

variable "rds_database_name" {
  description = "Nom de la base PostgreSQL initiale."
  type        = string
  default     = "glycopilot_prod_db"
}

variable "rds_master_username" {
  description = "Utilisateur administrateur PostgreSQL. Le mot de passe est géré par AWS Secrets Manager."
  type        = string
  default     = "glycopilot_prod_user"
}

variable "rds_instance_class" {
  description = "Classe d'instance RDS. Garder petit tant que la base n'est pas canonique."
  type        = string
  default     = "db.t4g.micro"
}

variable "rds_allocated_storage" {
  description = "Stockage RDS alloué en Go."
  type        = number
  default     = 20
}

variable "rds_backup_retention_period" {
  description = "Rétention des sauvegardes automatiques RDS en jours."
  type        = number
  default     = 1
}

variable "rds_multi_az" {
  description = "Active le Multi-AZ RDS. Désactivé par défaut pour maîtriser les coûts avant bascule canonique."
  type        = bool
  default     = false
}

variable "rds_deletion_protection" {
  description = "Protège RDS contre la suppression accidentelle. À garder actif dès que RDS contient des données utiles."
  type        = bool
  default     = true
}
