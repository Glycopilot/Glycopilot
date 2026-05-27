locals {
  observability_plan_plus_widgets = var.enable_plan_plus ? [
    {
      type   = "metric"
      x      = 0
      y      = 12
      width  = 12
      height = 6
      properties = {
        title  = "Plan Plus ECS CPU / Memory"
        region = var.aws_region
        view   = "timeSeries"
        stat   = "Average"
        period = 300
        metrics = [
          ["AWS/ECS", "CPUUtilization", "ClusterName", aws_ecs_cluster.plan_plus[0].name, "ServiceName", aws_ecs_service.plan_plus[0].name],
          [".", "MemoryUtilization", ".", ".", ".", "."],
        ]
      }
    },
    {
      type   = "metric"
      x      = 12
      y      = 12
      width  = 12
      height = 6
      properties = {
        title  = "Plan Plus ALB traffic / errors"
        region = var.aws_region
        view   = "timeSeries"
        stat   = "Sum"
        period = 300
        metrics = [
          ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.plan_plus[0].arn_suffix],
          [".", "HTTPCode_Target_5XX_Count", ".", "."],
          [".", "HTTPCode_ELB_5XX_Count", ".", "."],
        ]
      }
    },
    {
      type   = "metric"
      x      = 0
      y      = 18
      width  = 12
      height = 6
      properties = {
        title  = "Plan Plus target health"
        region = var.aws_region
        view   = "timeSeries"
        stat   = "Average"
        period = 60
        metrics = [
          ["AWS/ApplicationELB", "HealthyHostCount", "TargetGroup", aws_lb_target_group.plan_plus_backend[0].arn_suffix, "LoadBalancer", aws_lb.plan_plus[0].arn_suffix],
          [".", "UnHealthyHostCount", ".", ".", ".", "."],
        ]
      }
    },
    {
      type   = "metric"
      x      = 12
      y      = 18
      width  = 12
      height = 6
      properties = {
        title  = "Plan Plus Redis"
        region = var.aws_region
        view   = "timeSeries"
        stat   = "Average"
        period = 300
        metrics = [
          ["AWS/ElastiCache", "CPUUtilization", "CacheClusterId", aws_elasticache_cluster.plan_plus_redis[0].cluster_id],
          [".", "CurrConnections", ".", "."],
          [".", "FreeableMemory", ".", "."],
        ]
      }
    },
  ] : []

  observability_dashboard_widgets = concat([
    {
      type   = "text"
      x      = 0
      y      = 0
      width  = 24
      height = 2
      properties = {
        markdown = "# Glycopilot source observability\nRuntime actif: Plan A EC2 + RDS. Plan Plus ECS peut rester actif pour validation. Ce dashboard suit surtout les inducteurs de coûts: compute, ALB, Redis, RDS et S3."
      }
    },
    {
      type   = "metric"
      x      = 0
      y      = 2
      width  = 12
      height = 6
      properties = {
        title  = "Plan A EC2 CPU / network"
        region = var.aws_region
        view   = "timeSeries"
        stat   = "Average"
        period = 300
        metrics = [
          ["AWS/EC2", "CPUUtilization", "InstanceId", aws_instance.web.id],
          [".", "NetworkIn", ".", ".", { stat = "Sum" }],
          [".", "NetworkOut", ".", ".", { stat = "Sum" }],
        ]
      }
    },
    {
      type   = "metric"
      x      = 12
      y      = 2
      width  = 12
      height = 6
      properties = {
        title  = "RDS CPU / connections / free storage"
        region = var.aws_region
        view   = "timeSeries"
        stat   = "Average"
        period = 300
        metrics = var.enable_rds ? [
          ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", aws_db_instance.postgres[0].identifier],
          [".", "DatabaseConnections", ".", "."],
          [".", "FreeStorageSpace", ".", "."],
        ] : []
      }
    },
    {
      type   = "metric"
      x      = 0
      y      = 8
      width  = 12
      height = 4
      properties = {
        title  = "Data bucket storage / objects"
        region = var.aws_region
        view   = "timeSeries"
        stat   = "Average"
        period = 86400
        metrics = [
          ["AWS/S3", "BucketSizeBytes", "BucketName", aws_s3_bucket.media.bucket, "StorageType", "StandardStorage"],
          [".", "NumberOfObjects", ".", ".", ".", "AllStorageTypes"],
        ]
      }
    },
    {
      type   = "metric"
      x      = 12
      y      = 8
      width  = 12
      height = 4
      properties = {
        title  = "Frontend bucket storage / objects"
        region = var.aws_region
        view   = "timeSeries"
        stat   = "Average"
        period = 86400
        metrics = [
          ["AWS/S3", "BucketSizeBytes", "BucketName", aws_s3_bucket.frontend_web.bucket, "StorageType", "StandardStorage"],
          [".", "NumberOfObjects", ".", ".", ".", "AllStorageTypes"],
        ]
      }
    },
  ], local.observability_plan_plus_widgets)
}

resource "aws_cloudwatch_dashboard" "glycopilot" {
  count = var.enable_observability_dashboard ? 1 : 0

  dashboard_name = "glycopilot-source-runtime"

  dashboard_body = jsonencode({
    widgets = local.observability_dashboard_widgets
  })
}
