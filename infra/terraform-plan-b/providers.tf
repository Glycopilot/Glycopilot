terraform {
  required_version = ">= 1.14.0"

  backend "s3" {
    bucket = "glycopilot-aws-s3-bucket-img-artifacts" 
    key    = "terraform/state/plan-b.tfstate"         
    region = "eu-west-3"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~>6.0"
    }
  }
}

provider "aws" {
  region  = "eu-west-3"

  default_tags {
    tags = {
      Project     = "GLYCOPILOT"
      Environment = "PLAN_B"
      ManagedBy   = "Terraform"
    }
  }
}