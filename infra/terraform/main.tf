# Glycopilot Terraform - Main Configuration
# This file provides an overview of the available deployment plans

# To use Plan A (Economic):
# cd terraform/plan-a
# terraform init
# terraform apply

# To use Plan B (Robust):
# cd terraform/plan-b
# terraform init
# terraform apply

# To migrate from Plan A to Plan B:
# See the migration script: ../../migrate_a_to_b.sh

terraform {
  required_version = ">= 1.5.0"
}

# This main configuration file is intentionally minimal.
# The actual infrastructure is defined in the plan-specific directories:
# - plan-a/ for economic deployment
# - plan-b/ for robust deployment

# Common provider configuration that can be used by both plans
provider "aws" {
  region = "eu-west-3" # Paris region
  
  # Uncomment and configure if you want to use a specific profile
  # profile = "your-aws-profile"
  
  # Uncomment for more verbose logging
  # debug = true
}