# infra/terraform-plan-b/ecs.tf

# 1. Récupération dynamique de ton compte AWS pour construire l'URL ECR
data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

locals {
  ecr_url = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${data.aws_region.current.id}.amazonaws.com"
}

# 2. Le Cluster ECS (Le cerveau)
resource "aws_ecs_cluster" "main" {
  name = "glycopilot-cluster"
}

# 3. CloudWatch Log Group (Pour voir les logs "docker logs" dans la console AWS)
resource "aws_cloudwatch_log_group" "ecs_logs" {
  name              = "/ecs/glycopilot-plan-b"
  retention_in_days = 7
}

# 4. Security Group des Conteneurs (Le bouclier)
resource "aws_security_group" "ecs_sg" {
  name        = "glycopilot-ecs-sg-plan-b"
  description = "Allow only ALB trafic"
  vpc_id      = aws_vpc.plan_b_vpc.id

  ingress {
    description     = "HTTP depuis l ALB"
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id] # Autorise UNIQUEMENT le Load Balancer
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# 5. La Task Definition (Le "Docker Compose" d'AWS)
resource "aws_ecs_task_definition" "app" {
  family                   = "glycopilot-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "1024" # 1 vCPU
  memory                   = "2048" # 2 Go de RAM (nécessaire pour l'IA)
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  # Les 2 conteneurs qui tournent ensemble !
  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = "${local.ecr_url}/glycopilot-backend:latest"
      essential = true
      portMappings = [
        {
          containerPort = 8000
          hostPort      = 8000
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "DEBUG", value = "false" },
        { name = "ALLOWED_HOSTS", value = "*" }, # L ALB filtre déjà, on laisse passer
        { name = "DB_HOST", value = split(":", aws_db_instance.postgres.endpoint)[0] }, # Supprime le :5432
        { name = "DB_PORT", value = "5432" },
        { name = "DB_NAME", value = "glycopilot_prod_db" },
        { name = "DB_USER", value = "glycopilot_admin" },
        { name = "DB_PASSWORD", value = "GlycopilotSuperSecret2026!" },
        { name = "REDIS_HOST", value = aws_elasticache_cluster.redis_plan_b.cache_nodes[0].address },
        { name = "REDIS_PORT", value = "6379" },
        { name = "AI_SERVICE_URL", value = "http://127.0.0.1:8001" }, # L'IA est dans la même tâche (localhost)
        { name = "SECRET_KEY", value = "nln*qw(rtje6@=t=2x_7mfyss#whal#65%(jgnu1p5vzoechj4" },
        { name = "USE_S3", value = "True" },
        { name = "AWS_STORAGE_BUCKET_NAME", value = "glycopilot-aws-s3-bucket-img-artifacts" },
        { name = "AWS_S3_REGION_NAME", value = "eu-west-3" }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs_logs.name
          "awslogs-region"        = "eu-west-3"
          "awslogs-stream-prefix" = "backend"
        }
      }
      # Ce script attend que la DB soit prête, lance les migrations et allume Daphne
        command = ["sh", "-c", "python manage.py collectstatic --noinput && python manage.py migrate && daphne -b 0.0.0.0 -p 8000 core.asgi:application"]
    },
    {
      name      = "ai_service"
      image     = "${local.ecr_url}/glycopilot-ai-service:latest"
      essential = true
      portMappings = [
        {
          containerPort = 8001
          hostPort      = 8001
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "django_url", value = "http://127.0.0.1:8000" },
        { name = "internal_token", value = "ta_cle_secrète" }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs_logs.name
          "awslogs-region"        = "eu-west-3"
          "awslogs-stream-prefix" = "ai"
        }
      }
    }
  ])
}

# 6. Le Service ECS (Assure que le conteneur tourne H24)
resource "aws_ecs_service" "main" {
  name            = "glycopilot-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 1 # 1 instance pour commencer (Scalable par la suite)
  launch_type     = "FARGATE"

  network_configuration {
    # On les place dans le subnet public (Hack FinOps) pour tirer l'image
    subnets          = [aws_subnet.public_1.id, aws_subnet.public_2.id]
    security_groups  = [aws_security_group.ecs_sg.id]
    assign_public_ip = true 
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 8000
  }

  # On ne peut lancer le service que si l'ALB est prêt
  depends_on = [aws_lb_listener.http]
}