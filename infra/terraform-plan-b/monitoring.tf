# infra/terraform-plan-b/monitoring.tf

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "Glycopilot-Plan-B-Monitoring"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            [ "AWS/ECS", "CPUUtilization", "ClusterName", aws_ecs_cluster.main.name, "ServiceName", aws_ecs_service.main.name ]
          ]
          period = 300
          stat   = "Average"
          region = "eu-west-3"
          title  = "Utilisation CPU Backend (Plan B)"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            [ "AWS/ApplicationELB", "RequestCount", "LoadBalancer", split("/", aws_lb.main.arn)[1] ]
          ]
          period = 300
          stat   = "Sum"
          region = "eu-west-3"
          title  = "Nombre de visites (Requêtes ALB)"
        }
      }
    ]
  })
}