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

variable "ssh_private_key_path" {
  description = "Chemin local de la clé privée SSH utilisé uniquement pour afficher l'output de connexion."
  type        = string
  default     = "infra/ssh/glycopilot_deploy_key"
}

variable "data_bucket_name" {
  description = "Bucket S3 existant utilisé par le socle commun pour les médias, artefacts et backups."
  type        = string
  default     = "glycopilot-aws-s3-bucket-img-artifacts"
}

variable "frontend_bucket_name" {
  description = "Bucket S3 du frontend web statique géré par le socle commun."
  type        = string
  default     = "glycopilot-web-frontend-958587270787"
}

variable "enable_frontend_cloudfront" {
  description = "Crée une distribution CloudFront devant le bucket frontend web."
  type        = bool
  default     = false
}

variable "frontend_cloudfront_aliases" {
  description = "Domaines custom CloudFront du frontend web. Le certificat ACM doit couvrir tous ces alias."
  type        = list(string)
  default     = []
}

variable "frontend_cloudfront_acm_certificate_arn" {
  description = "ARN ACM us-east-1 utilisé par CloudFront pour les alias du frontend web."
  type        = string
  default     = ""
}

variable "frontend_cloudfront_price_class" {
  description = "Price class CloudFront. PriceClass_100 limite la diffusion aux zones les moins coûteuses."
  type        = string
  default     = "PriceClass_100"
}

variable "landing_bucket_name" {
  description = "Bucket S3 du site vitrine statique glycopilot.fr."
  type        = string
  default     = "glycopilot-fr-landing"
}

variable "enable_landing_cloudfront" {
  description = "Crée une distribution CloudFront devant le bucket du site vitrine."
  type        = bool
  default     = false
}

variable "landing_cloudfront_aliases" {
  description = "Domaines custom CloudFront du site vitrine. Le certificat ACM doit couvrir tous ces alias."
  type        = list(string)
  default     = []
}

variable "landing_cloudfront_acm_certificate_arn" {
  description = "ARN ACM us-east-1 utilisé par CloudFront pour les alias du site vitrine."
  type        = string
  default     = ""
}

variable "landing_cloudfront_price_class" {
  description = "Price class CloudFront du site vitrine."
  type        = string
  default     = "PriceClass_100"
}

variable "enable_plan_plus_ci_deploy_policy" {
  description = "Attache une policy IAM minimale à l'utilisateur GitHub Actions pour déployer Plan Plus ECS. À activer seulement sur le compte source/cible choisi."
  type        = bool
  default     = false
}

variable "plan_plus_ci_deploy_user_name" {
  description = "Nom de l'utilisateur IAM utilisé par GitHub Actions pour le déploiement Plan Plus ECS."
  type        = string
  default     = "glycopilot-s3-user"
}

variable "enable_frontend_web_ci_deploy_policy" {
  description = "Attache une policy IAM minimale à l'utilisateur GitHub Actions pour invalider CloudFront après le déploiement du frontend web."
  type        = bool
  default     = false
}

variable "frontend_web_ci_deploy_user_name" {
  description = "Nom de l'utilisateur IAM utilisé par GitHub Actions pour le déploiement du frontend web."
  type        = string
  default     = "github_action"
}

variable "enable_landing_ci_deploy_policy" {
  description = "Attache une policy IAM minimale à l'utilisateur GitHub Actions pour déployer le site vitrine."
  type        = bool
  default     = false
}

variable "landing_ci_deploy_user_name" {
  description = "Nom de l'utilisateur IAM utilisé par GitHub Actions pour le déploiement du site vitrine."
  type        = string
  default     = "github_action"
}

variable "enable_observability_dashboard" {
  description = "Crée un dashboard CloudWatch léger pour suivre santé runtime et inducteurs de coûts."
  type        = bool
  default     = false
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

variable "enable_plan_plus" {
  description = "Active l infrastructure Plan Plus ECS/ALB/Redis. Par défaut désactivé pour éviter tout coût sur le compte source."
  type        = bool
  default     = false

  validation {
    condition     = !var.enable_plan_plus || var.enable_rds
    error_message = "enable_plan_plus=true requiert enable_rds=true pour réutiliser la RDS canonique du socle."
  }

  validation {
    condition = !var.enable_plan_plus || (
      var.plan_plus_backend_image != "" &&
      var.plan_plus_ai_service_image != "" &&
      var.plan_plus_backend_secret_key_value_from != "" &&
      var.plan_plus_db_password_value_from != "" &&
      var.plan_plus_ai_internal_token_value_from != ""
    )
    error_message = "enable_plan_plus=true requiert les images backend/IA et les références Secrets Manager Plan Plus."
  }
}

variable "plan_plus_desired_count" {
  description = "Nombre de tâches ECS Plan Plus. Garder 0 tant que Plan A est actif."
  type        = number
  default     = 0

  validation {
    condition     = var.plan_plus_desired_count >= 0
    error_message = "plan_plus_desired_count doit être supérieur ou égal à 0."
  }
}

variable "plan_plus_backend_image" {
  description = "Image complète du backend Plan Plus. Obligatoire uniquement si enable_plan_plus=true."
  type        = string
  default     = ""
}

variable "plan_plus_ai_service_image" {
  description = "Image complète du service IA Plan Plus. Obligatoire uniquement si enable_plan_plus=true."
  type        = string
  default     = ""
}

variable "plan_plus_alb_certificate_arn" {
  description = "ARN ACM eu-west-3 pour exposer Plan Plus en HTTPS via l ALB. Laisser vide pour ne créer que le listener HTTP."
  type        = string
  default     = ""
}

variable "plan_plus_allowed_hosts" {
  description = "Valeur Django ALLOWED_HOSTS pour Plan Plus."
  type        = string
  default     = "*"
}

variable "plan_plus_cors_allowed_origins" {
  description = "Valeur Django CORS_ALLOWED_ORIGINS pour Plan Plus. Laisser vide si aucun frontend navigateur ne pointe encore vers l ALB."
  type        = string
  default     = ""
}

variable "plan_plus_csrf_trusted_origins" {
  description = "Valeur Django CSRF_TRUSTED_ORIGINS pour Plan Plus. Par défaut réutilise CORS_ALLOWED_ORIGINS côté application si vide."
  type        = string
  default     = ""
}

variable "plan_plus_backend_secret_key_value_from" {
  description = "ARN Secrets Manager, ou ARN avec clé JSON, exposant SECRET_KEY au conteneur backend."
  type        = string
  default     = ""
}

variable "plan_plus_db_password_value_from" {
  description = "ARN Secrets Manager, ou ARN avec clé JSON, exposant DB_PASSWORD au conteneur backend."
  type        = string
  default     = ""
}

variable "plan_plus_ai_internal_token_value_from" {
  description = "ARN Secrets Manager, ou ARN avec clé JSON, exposant internal_token au conteneur IA."
  type        = string
  default     = ""
}

variable "plan_plus_repository_credentials_value_from" {
  description = "ARN Secrets Manager optionnel contenant les credentials du registry privé pour ECS repositoryCredentials."
  type        = string
  default     = ""
}

variable "plan_plus_cpu" {
  description = "CPU Fargate pour la task Plan Plus."
  type        = string
  default     = "1024"
}

variable "plan_plus_memory" {
  description = "Mémoire Fargate pour la task Plan Plus."
  type        = string
  default     = "2048"
}
