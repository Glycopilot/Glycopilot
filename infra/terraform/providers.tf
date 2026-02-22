provider "aws" {
  region  = var.aws_region
  profile = "default"

  default_tags {
    tags = {
      Project     = "GLYCOPILOT"
      Environment = "PLAN_A"
      ManagedBy   = "Terraform"
    }
  }
}