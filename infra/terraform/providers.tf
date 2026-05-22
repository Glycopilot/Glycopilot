provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "GLYCOPILOT"
      Environment = "PLAN_A"
      ManagedBy   = "Terraform"
    }
  }
}
