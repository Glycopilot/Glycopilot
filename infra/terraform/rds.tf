resource "aws_db_subnet_group" "postgres" {
  count = var.enable_rds ? 1 : 0

  name       = "${var.rds_identifier}-subnet-group"
  subnet_ids = [aws_subnet.private_db_1.id, aws_subnet.private_db_2.id]

  tags = {
    Name = "${var.rds_identifier}-subnet-group"
  }
}

resource "aws_security_group" "rds" {
  count = var.enable_rds ? 1 : 0

  name        = "${var.rds_identifier}-sg"
  description = "Autorise PostgreSQL uniquement depuis l EC2 Glycopilot"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL depuis EC2"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.web_sg.id]
  }

  egress {
    description = "Trafic sortant minimal pour RDS"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.rds_identifier}-sg"
  }
}

resource "aws_db_instance" "postgres" {
  count = var.enable_rds ? 1 : 0

  identifier = var.rds_identifier

  engine         = "postgres"
  engine_version = "16"
  instance_class = var.rds_instance_class

  allocated_storage     = var.rds_allocated_storage
  max_allocated_storage = max(var.rds_allocated_storage, 100)
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.rds_database_name
  username = var.rds_master_username

  manage_master_user_password = true

  db_subnet_group_name   = aws_db_subnet_group.postgres[0].name
  vpc_security_group_ids = [aws_security_group.rds[0].id]
  publicly_accessible    = false
  multi_az               = var.rds_multi_az

  backup_retention_period   = var.rds_backup_retention_period
  backup_window             = "03:00-04:00"
  maintenance_window        = "sun:04:00-sun:05:00"
  copy_tags_to_snapshot     = true
  deletion_protection       = var.rds_deletion_protection
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.rds_identifier}-final-snapshot"

  auto_minor_version_upgrade = true
  apply_immediately          = false

  tags = {
    Name = var.rds_identifier
  }
}
