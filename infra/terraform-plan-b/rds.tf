# infra/terraform-plan-b/rds.tf

# 1. Le Security Group de la Base de Données (Le pare-feu interne)
resource "aws_security_group" "rds_sg" {
  name        = "glycopilot-rds-sg-plan-b"
  description = "Autorise le trafic PostgreSQL uniquement depuis le reseau interne"
  vpc_id      = aws_vpc.plan_b_vpc.id

  ingress {
    description = "PostgreSQL from within the VPC only"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    # On autorise uniquement les requêtes provenant du réseau 10.1.x.x
    cidr_blocks = [aws_vpc.plan_b_vpc.cidr_block] 
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "glycopilot_rds_sg_plan_b" }
}

# 2. L'instance RDS PostgreSQL Gérée
resource "aws_db_instance" "postgres" {
  identifier             = "glycopilot-db-plan-b"
  engine                 = "postgres"
  engine_version         = "16" 
  instance_class         = "db.t3.micro" # La plus petite instance pour économiser ton budget
  allocated_storage      = 20 # 20 Go de disque

  db_name                = "glycopilot_prod_db"
  username               = "glycopilot_admin"
  password               = "GlycopilotSuperSecret2026!"

  # On place la DB dans le sous-réseau privé créé précédemment
  db_subnet_group_name   = aws_db_subnet_group.rds_subnet_group.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]

  # --- COMPLIANCE DORA & FINOPS ---
  multi_az                = false # Mis à false pour économiser. À passer à true en vraie Prod.
  backup_retention_period = 1    # Exigence DORA : AWS fera un backup par jour pendant 35 jours
  
  # Pour éviter que Terraform refuse de détruire la base de données quand on a fini nos tests
  skip_final_snapshot     = true 

  tags = { Name = "glycopilot_rds_plan_b" }
}

# 3. Un Output pour récupérer l'adresse (Endpoint) de la base de données
output "rds_endpoint" {
  description = "L'adresse de connexion a la base de donnees pour Django"
  value       = aws_db_instance.postgres.endpoint
}