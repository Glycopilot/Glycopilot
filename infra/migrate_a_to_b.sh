#!/bin/bash
# Migration script from Plan A to Plan B
# This script helps migrate your Glycopilot deployment from Plan A to Plan B

set -e

echo "=== Glycopilot Migration: Plan A to Plan B ==="
echo ""

# Check if we're in the right directory
if [ ! -d "terraform/plan-a" ] || [ ! -d "terraform/plan-b" ]; then
    echo "Error: This script must be run from the infra/ directory"
    exit 1
fi

echo "Step 1: Backup Plan A Terraform state"
echo "--------------------------------------"
cd terraform/plan-a
if [ -f "terraform.tfstate" ]; then
    cp terraform.tfstate terraform.tfstate.backup-$(date +%Y%m%d-%H%M%S)
    echo "✓ Backed up terraform.tfstate"
else
    echo "⚠ No terraform.tfstate found in plan-a"
fi

cd ../..

echo ""
echo "Step 2: Extract important information from Plan A"
echo "--------------------------------------------------"
PLAN_A_DIR="terraform/plan-a"

if [ -f "$PLAN_A_DIR/terraform.tfstate" ]; then
    echo "Extracting information from Plan A state..."
    
    # Extract EC2 instance ID
    EC2_INSTANCE_ID=$(terraform -chdir=$PLAN_A_DIR output -json | jq -r '.ec2_instance_id.value' 2>/dev/null || echo "")
    
    # Extract S3 bucket name
    S3_BUCKET_NAME=$(terraform -chdir=$PLAN_A_DIR output -json | jq -r '.s3_bucket_name.value' 2>/dev/null || echo "")
    
    # Extract VPC ID
    VPC_ID=$(terraform -chdir=$PLAN_A_DIR output -json | jq -r '.vpc_id.value' 2>/dev/null || echo "")
    
    echo "Plan A Infrastructure:"
    echo "  EC2 Instance: $EC2_INSTANCE_ID"
    echo "  S3 Bucket: $S3_BUCKET_NAME"
    echo "  VPC ID: $VPC_ID"
else
    echo "⚠ Cannot extract information - no terraform state found"
    echo "You'll need to manually provide this information when prompted"
fi

echo ""
echo "Step 3: Prepare for Plan B deployment"
echo "--------------------------------------"
cd terraform/plan-b

# Check if terraform is initialized
if [ ! -d ".terraform" ]; then
    echo "Initializing Terraform for Plan B..."
    terraform init
    echo "✓ Terraform initialized"
fi

echo ""
echo "Step 4: Create variables file for Plan B"
echo "-----------------------------------------"

# Check if tfvars file exists
if [ ! -f "terraform.tfvars" ]; then
    echo "Creating terraform.tfvars file..."
    
    # Generate a random database password if not provided
    DB_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16)
    
    cat > terraform.tfvars << EOL
# Database configuration
db_password = "$DB_PASSWORD"

# EKS configuration
eks_cluster_version = "1.28"
node_instance_type = "t3.medium"
min_nodes = 1
max_nodes = 4
desired_nodes = 2

# RDS configuration
rds_instance_class = "db.t3.micro"
rds_allocated_storage = 20
rds_max_allocated_storage = 100
backup_retention_period = 7

# WAF and CloudFront
waf_enabled = true
cloudfront_enabled = true
EOL
    
    echo "✓ Created terraform.tfvars with secure database password"
    echo "  Database password: $DB_PASSWORD"
    echo "  (Save this password securely!)"
else
    echo "✓ terraform.tfvars already exists"
fi

echo ""
echo "Step 5: Review Plan B configuration"
echo "------------------------------------"
echo "Running terraform plan to show what will be created..."
terraform plan

echo ""
echo "Step 6: Migration checklist"
echo "--------------------------"
echo "Before proceeding with terraform apply, please:"
echo ""
echo "✓ Review the terraform plan output above"
echo "✓ Ensure you have backups of your Plan A deployment"
echo "✓ Plan for database migration from local PostgreSQL to RDS"
echo "✓ Update your Django settings for the new infrastructure"
echo "✓ Consider DNS changes if you're using a custom domain"
echo "✓ Review security groups and IAM policies"
echo ""
echo "When you're ready to proceed:"
echo "  cd terraform/plan-b"
echo "  terraform apply"
echo ""
echo "After deployment, you'll need to:"
echo "1. Migrate your database from Plan A to RDS"
echo "2. Update your Django configuration for EKS"
echo "3. Deploy your application to the EKS cluster"
echo "4. Update DNS records if needed"
echo "5. Test thoroughly before switching traffic"
echo ""
echo "For detailed instructions, see terraform/plan-b/README.md"

echo ""
echo "=== Migration Preparation Complete ==="
echo "Your Plan B infrastructure is ready to be deployed."
echo "Review the changes carefully before applying."