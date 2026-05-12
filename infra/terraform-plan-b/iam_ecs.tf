# infra/terraform-plan-b/iam_ecs.tf

# 1. Le rôle d'exécution (Task Execution Role) - Pour qu'AWS puisse tirer l'image ECR et écrire des logs
resource "aws_iam_role" "ecs_execution_role" {
  name = "glycopilot-ecs-execution-role"

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
}

# On attache la politique standard d'AWS pour ECS
resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# 2. Le rôle de la tâche (Task Role) - Pour que ton app Django ait des droits AWS (ex: accès S3)
resource "aws_iam_role" "ecs_task_role" {
  name = "glycopilot-ecs-task-role"

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
}