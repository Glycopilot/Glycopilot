locals {
  plan_plus_count = var.enable_plan_plus ? 1 : 0

  plan_plus_secret_refs = compact([
    var.plan_plus_backend_secret_key_value_from,
    var.plan_plus_db_password_value_from,
    var.plan_plus_ai_internal_token_value_from,
  ])

  plan_plus_tags = {
    Environment = "PLAN_PLUS"
  }
}

resource "aws_subnet" "plan_plus_public_2" {
  count = local.plan_plus_count

  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "${var.aws_region}b"

  tags = merge(local.plan_plus_tags, {
    Name = "glycopilot_plan_plus_public_subnet_2"
  })
}

resource "aws_route_table_association" "plan_plus_public_2_assoc" {
  count = local.plan_plus_count

  subnet_id      = aws_subnet.plan_plus_public_2[0].id
  route_table_id = aws_route_table.public_rt.id
}

resource "aws_security_group" "plan_plus_alb" {
  count = local.plan_plus_count

  name        = "glycopilot-plan-plus-alb-sg"
  description = "Autorise HTTP et HTTPS vers l ALB Plan Plus"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP depuis internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS depuis internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.plan_plus_tags, {
    Name = "glycopilot-plan-plus-alb-sg"
  })
}

resource "aws_security_group" "plan_plus_ecs" {
  count = local.plan_plus_count

  name        = "glycopilot-plan-plus-ecs-sg"
  description = "Autorise uniquement l ALB vers ECS Plan Plus"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Backend depuis l ALB"
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.plan_plus_alb[0].id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.plan_plus_tags, {
    Name = "glycopilot-plan-plus-ecs-sg"
  })
}

resource "aws_security_group" "plan_plus_redis" {
  count = local.plan_plus_count

  name        = "glycopilot-plan-plus-redis-sg"
  description = "Autorise Redis uniquement depuis ECS Plan Plus"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Redis depuis ECS Plan Plus"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.plan_plus_ecs[0].id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.plan_plus_tags, {
    Name = "glycopilot-plan-plus-redis-sg"
  })
}

resource "aws_security_group_rule" "rds_from_plan_plus" {
  count = local.plan_plus_count

  type                     = "ingress"
  description              = "PostgreSQL depuis ECS Plan Plus"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.rds[0].id
  source_security_group_id = aws_security_group.plan_plus_ecs[0].id
}

resource "aws_elasticache_subnet_group" "plan_plus_redis" {
  count = local.plan_plus_count

  name       = "glycopilot-plan-plus-redis-subnet-group"
  subnet_ids = [aws_subnet.private_db_1.id, aws_subnet.private_db_2.id]

  tags = local.plan_plus_tags
}

resource "aws_elasticache_cluster" "plan_plus_redis" {
  count = local.plan_plus_count

  cluster_id           = "glycopilot-plan-plus-redis"
  engine               = "redis"
  engine_version       = "7.1"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379

  subnet_group_name  = aws_elasticache_subnet_group.plan_plus_redis[0].name
  security_group_ids = [aws_security_group.plan_plus_redis[0].id]

  tags = merge(local.plan_plus_tags, {
    Name = "glycopilot-plan-plus-redis"
  })
}

resource "aws_lb" "plan_plus" {
  count = local.plan_plus_count

  name               = "glycopilot-plan-plus-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.plan_plus_alb[0].id]
  subnets            = [aws_subnet.public_subnet.id, aws_subnet.plan_plus_public_2[0].id]

  tags = merge(local.plan_plus_tags, {
    Name = "glycopilot-plan-plus-alb"
  })
}

resource "aws_lb_target_group" "plan_plus_backend" {
  count = local.plan_plus_count

  name        = "glycopilot-plan-plus-tg"
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/"
    healthy_threshold   = 2
    unhealthy_threshold = 5
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = merge(local.plan_plus_tags, {
    Name = "glycopilot-plan-plus-tg"
  })
}

resource "aws_lb_listener" "plan_plus_http" {
  count = local.plan_plus_count

  load_balancer_arn = aws_lb.plan_plus[0].arn
  port              = 80
  protocol          = "HTTP"

  tags = local.plan_plus_tags

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.plan_plus_backend[0].arn
  }
}

resource "aws_ecs_cluster" "plan_plus" {
  count = local.plan_plus_count

  name = "glycopilot-plan-plus-cluster"

  tags = merge(local.plan_plus_tags, {
    Name = "glycopilot-plan-plus-cluster"
  })
}

resource "aws_cloudwatch_log_group" "plan_plus" {
  count = local.plan_plus_count

  name              = "/ecs/glycopilot-plan-plus"
  retention_in_days = 7

  tags = local.plan_plus_tags
}

resource "aws_iam_role" "plan_plus_ecs_execution" {
  count = local.plan_plus_count

  name = "glycopilot-plan-plus-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = local.plan_plus_tags
}

resource "aws_iam_role_policy_attachment" "plan_plus_ecs_execution" {
  count = local.plan_plus_count

  role       = aws_iam_role.plan_plus_ecs_execution[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "plan_plus_secret_read" {
  count = var.enable_plan_plus && length(local.plan_plus_secret_refs) > 0 ? 1 : 0

  name = "glycopilot-plan-plus-secret-read"
  role = aws_iam_role.plan_plus_ecs_execution[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = local.plan_plus_secret_refs
      }
    ]
  })
}

resource "aws_iam_role" "plan_plus_ecs_task" {
  count = local.plan_plus_count

  name = "glycopilot-plan-plus-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = local.plan_plus_tags
}

resource "aws_iam_role_policy" "plan_plus_media_bucket" {
  count = local.plan_plus_count

  name = "glycopilot-plan-plus-media-bucket"
  role = aws_iam_role.plan_plus_ecs_task[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
        ]
        Resource = "${aws_s3_bucket.media.arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = aws_s3_bucket.media.arn
      }
    ]
  })
}

resource "aws_ecs_task_definition" "plan_plus" {
  count = local.plan_plus_count

  family                   = "glycopilot-plan-plus"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.plan_plus_cpu
  memory                   = var.plan_plus_memory
  execution_role_arn       = aws_iam_role.plan_plus_ecs_execution[0].arn
  task_role_arn            = aws_iam_role.plan_plus_ecs_task[0].arn

  tags = local.plan_plus_tags

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = var.plan_plus_backend_image
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
        { name = "ALLOWED_HOSTS", value = var.plan_plus_allowed_hosts },
        { name = "DB_ENGINE", value = "postgresql" },
        { name = "DB_HOST", value = aws_db_instance.postgres[0].address },
        { name = "DB_PORT", value = "5432" },
        { name = "DB_NAME", value = var.rds_database_name },
        { name = "DB_USER", value = var.rds_master_username },
        { name = "REDIS_HOST", value = aws_elasticache_cluster.plan_plus_redis[0].cache_nodes[0].address },
        { name = "REDIS_PORT", value = "6379" },
        { name = "AI_SERVICE_URL", value = "http://127.0.0.1:8001" },
        { name = "USE_S3", value = "True" },
        { name = "AWS_STORAGE_BUCKET_NAME", value = aws_s3_bucket.media.bucket },
        { name = "AWS_S3_REGION_NAME", value = var.aws_region }
      ]
      secrets = [
        { name = "SECRET_KEY", valueFrom = var.plan_plus_backend_secret_key_value_from },
        { name = "DB_PASSWORD", valueFrom = var.plan_plus_db_password_value_from },
        { name = "AI_SERVICE_TOKEN", valueFrom = var.plan_plus_ai_internal_token_value_from }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.plan_plus[0].name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "backend"
        }
      }
      command = ["sh", "-c", "python manage.py collectstatic --noinput && python manage.py import_medications --bdpm && daphne -b 0.0.0.0 -p 8000 core.asgi:application"]
    },
    {
      name      = "ai_service"
      image     = var.plan_plus_ai_service_image
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
        { name = "django_internal_token", value = "" }
      ]
      secrets = [
        { name = "internal_token", valueFrom = var.plan_plus_ai_internal_token_value_from }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.plan_plus[0].name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ai"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "plan_plus" {
  count = local.plan_plus_count

  name            = "glycopilot-plan-plus-service"
  cluster         = aws_ecs_cluster.plan_plus[0].id
  task_definition = aws_ecs_task_definition.plan_plus[0].arn
  desired_count   = var.plan_plus_desired_count
  launch_type     = "FARGATE"

  tags = local.plan_plus_tags

  network_configuration {
    subnets          = [aws_subnet.public_subnet.id, aws_subnet.plan_plus_public_2[0].id]
    security_groups  = [aws_security_group.plan_plus_ecs[0].id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.plan_plus_backend[0].arn
    container_name   = "backend"
    container_port   = 8000
  }

  depends_on = [aws_lb_listener.plan_plus_http]

  lifecycle {
    precondition {
      condition     = !var.enable_plan_plus || var.enable_rds
      error_message = "Plan Plus requiert enable_rds=true pour réutiliser la RDS canonique du socle."
    }

    precondition {
      condition = !var.enable_plan_plus || (
        var.plan_plus_backend_image != "" &&
        var.plan_plus_ai_service_image != "" &&
        var.plan_plus_backend_secret_key_value_from != "" &&
        var.plan_plus_db_password_value_from != "" &&
        var.plan_plus_ai_internal_token_value_from != ""
      )
      error_message = "Plan Plus requiert les images backend/IA et les références Secrets Manager avant activation."
    }
  }
}
