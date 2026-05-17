terraform {
  required_version = ">= 1.14.0"

  backend "s3" {
    bucket = "glycopilot-aws-s3-bucket-img-artifacts" # On utilise ton bucket existant
    key    = "terraform/state/plan-a.tfstate"         # Le chemin dans le bucket
    region = "eu-west-3"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~>6.0"
    }
  }
}