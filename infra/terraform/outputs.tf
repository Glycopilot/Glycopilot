output "ec2_public_ip" {
  description = "L'adresse EC2 publique fixe"
  value       = aws_eip.web_eip.public_ip
}

output "s3_bucket_name" {
  description = "Le nom du bucket S3 partagé pour médias, artefacts et backups"
  value       = aws_s3_bucket.media.bucket
}

output "frontend_bucket_name" {
  description = "Nom du bucket S3 du frontend web statique."
  value       = aws_s3_bucket.frontend_web.bucket
}

output "frontend_website_endpoint" {
  description = "Endpoint website S3 du frontend web statique."
  value       = aws_s3_bucket_website_configuration.frontend_web.website_endpoint
}

output "frontend_cloudfront_distribution_id" {
  description = "ID de la distribution CloudFront du frontend web. Null tant que CloudFront est désactivé."
  value       = var.enable_frontend_cloudfront ? aws_cloudfront_distribution.frontend_web[0].id : null
}

output "frontend_cloudfront_domain_name" {
  description = "Nom de domaine CloudFront à utiliser comme cible CNAME DNS. Null tant que CloudFront est désactivé."
  value       = var.enable_frontend_cloudfront ? aws_cloudfront_distribution.frontend_web[0].domain_name : null
}

output "landing_bucket_name" {
  description = "Nom du bucket S3 du site vitrine glycopilot.fr."
  value       = aws_s3_bucket.landing.bucket
}

output "landing_website_endpoint" {
  description = "Endpoint website S3 du site vitrine."
  value       = aws_s3_bucket_website_configuration.landing.website_endpoint
}

output "landing_cloudfront_distribution_id" {
  description = "ID de la distribution CloudFront du site vitrine. Null tant que CloudFront est désactivé."
  value       = var.enable_landing_cloudfront ? aws_cloudfront_distribution.landing[0].id : null
}

output "landing_cloudfront_domain_name" {
  description = "Nom de domaine CloudFront à utiliser comme cible CNAME DNS du site vitrine. Null tant que CloudFront est désactivé."
  value       = var.enable_landing_cloudfront ? aws_cloudfront_distribution.landing[0].domain_name : null
}

output "observability_dashboard_name" {
  description = "Nom du dashboard CloudWatch Glycopilot. Null tant que enable_observability_dashboard=false."
  value       = var.enable_observability_dashboard ? aws_cloudwatch_dashboard.glycopilot[0].dashboard_name : null
}

output "observability_dashboard_url" {
  description = "URL console AWS du dashboard CloudWatch Glycopilot. Null tant que enable_observability_dashboard=false."
  value       = var.enable_observability_dashboard ? "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.glycopilot[0].dashboard_name}" : null
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

output "common_private_db_subnet_ids" {
  description = "Subnets privés réservés à RDS et aux futures dépendances privées."
  value       = [aws_subnet.private_db_1.id, aws_subnet.private_db_2.id]
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
  value       = "ssh -i ${var.ssh_private_key_path} ubuntu@${aws_eip.web_eip.public_ip}"
}

output "rds_endpoint" {
  description = "Endpoint RDS PostgreSQL. Null tant que enable_rds=false."
  value       = var.enable_rds ? aws_db_instance.postgres[0].endpoint : null
}

output "rds_address" {
  description = "Adresse DNS RDS sans le port. Null tant que enable_rds=false."
  value       = var.enable_rds ? aws_db_instance.postgres[0].address : null
}

output "rds_database_name" {
  description = "Nom de la base RDS initiale. Null tant que enable_rds=false."
  value       = var.enable_rds ? aws_db_instance.postgres[0].db_name : null
}

output "rds_master_username" {
  description = "Utilisateur master RDS. Null tant que enable_rds=false."
  value       = var.enable_rds ? aws_db_instance.postgres[0].username : null
}

output "rds_security_group_id" {
  description = "Security group RDS autorisant PostgreSQL depuis l'EC2. Null tant que enable_rds=false."
  value       = var.enable_rds ? aws_security_group.rds[0].id : null
}

output "rds_master_user_secret_arn" {
  description = "ARN du secret AWS-managed contenant le mot de passe master RDS. Null tant que enable_rds=false."
  value       = var.enable_rds ? aws_db_instance.postgres[0].master_user_secret[0].secret_arn : null
  sensitive   = true
}

output "plan_plus_enabled" {
  description = "Indique si l infrastructure Plan Plus est active dans ce plan Terraform."
  value       = var.enable_plan_plus
}

output "plan_plus_alb_dns_name" {
  description = "DNS public de l ALB Plan Plus. Null tant que enable_plan_plus=false."
  value       = var.enable_plan_plus ? aws_lb.plan_plus[0].dns_name : null
}

output "plan_plus_https_listener_arn" {
  description = "ARN du listener HTTPS Plan Plus. Null si aucun certificat ALB n est fourni."
  value       = var.enable_plan_plus && var.plan_plus_alb_certificate_arn != "" ? aws_lb_listener.plan_plus_https[0].arn : null
}

output "plan_plus_ecs_cluster_name" {
  description = "Nom du cluster ECS Plan Plus. Null tant que enable_plan_plus=false."
  value       = var.enable_plan_plus ? aws_ecs_cluster.plan_plus[0].name : null
}

output "plan_plus_ecs_service_name" {
  description = "Nom du service ECS Plan Plus. Null tant que enable_plan_plus=false."
  value       = var.enable_plan_plus ? aws_ecs_service.plan_plus[0].name : null
}

output "plan_plus_task_definition_arn" {
  description = "ARN de la task definition Plan Plus. Null tant que enable_plan_plus=false."
  value       = var.enable_plan_plus ? aws_ecs_task_definition.plan_plus[0].arn : null
}

output "plan_plus_target_group_arn" {
  description = "ARN du target group ALB Plan Plus. Null tant que enable_plan_plus=false."
  value       = var.enable_plan_plus ? aws_lb_target_group.plan_plus_backend[0].arn : null
}

output "plan_plus_ecs_security_group_id" {
  description = "Security group ECS Plan Plus. Null tant que enable_plan_plus=false."
  value       = var.enable_plan_plus ? aws_security_group.plan_plus_ecs[0].id : null
}

output "plan_plus_public_subnet_ids" {
  description = "Subnets publics utilisés par ECS/ALB Plan Plus. Null tant que enable_plan_plus=false."
  value       = var.enable_plan_plus ? [aws_subnet.public_subnet.id, aws_subnet.plan_plus_public_2[0].id] : null
}

output "plan_plus_redis_endpoint" {
  description = "Endpoint Redis Plan Plus. Null tant que enable_plan_plus=false."
  value       = var.enable_plan_plus ? aws_elasticache_cluster.plan_plus_redis[0].cache_nodes[0].address : null
}
