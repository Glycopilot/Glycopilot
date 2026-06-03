data "aws_caller_identity" "current" {}

locals {
  plan_plus_ecs_cluster_arn = "arn:aws:ecs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:cluster/glycopilot-plan-plus-cluster"
  plan_plus_ecs_service_arn = "arn:aws:ecs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:service/glycopilot-plan-plus-cluster/glycopilot-plan-plus-service"
  plan_plus_task_family_arn = "arn:aws:ecs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:task-definition/glycopilot-plan-plus:*"
}

resource "aws_iam_user_policy" "plan_plus_ci_deploy" {
  count = var.enable_plan_plus_ci_deploy_policy && var.enable_plan_plus ? 1 : 0

  name = "glycopilot-plan-plus-ci-deploy"
  user = var.plan_plus_ci_deploy_user_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ReadAndUpdatePlanPlusService"
        Effect = "Allow"
        Action = [
          "ecs:DescribeServices",
          "ecs:UpdateService",
        ]
        Resource = local.plan_plus_ecs_service_arn
      },
      {
        Sid    = "ReadPlanPlusTaskDefinitions"
        Effect = "Allow"
        Action = [
          "ecs:DescribeTaskDefinition",
        ]
        Resource = "*"
      },
      {
        Sid    = "RegisterPlanPlusTaskDefinitions"
        Effect = "Allow"
        Action = [
          "ecs:RegisterTaskDefinition",
        ]
        Resource = "*"
      },
      {
        Sid    = "PassPlanPlusTaskRolesToEcs"
        Effect = "Allow"
        Action = [
          "iam:PassRole",
        ]
        Resource = [
          aws_iam_role.plan_plus_ecs_execution[0].arn,
          aws_iam_role.plan_plus_ecs_task[0].arn,
        ]
        Condition = {
          StringEquals = {
            "iam:PassedToService" = "ecs-tasks.amazonaws.com"
          }
        }
      }
    ]
  })
}

resource "aws_iam_user_policy" "frontend_web_ci_deploy" {
  count = var.enable_frontend_web_ci_deploy_policy && var.enable_frontend_cloudfront ? 1 : 0

  name = "glycopilot-frontend-web-ci-deploy"
  user = var.frontend_web_ci_deploy_user_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "InvalidateFrontendCloudFront"
        Effect   = "Allow"
        Action   = ["cloudfront:CreateInvalidation"]
        Resource = aws_cloudfront_distribution.frontend_web[0].arn
      }
    ]
  })
}
