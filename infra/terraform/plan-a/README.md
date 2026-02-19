# Glycopilot - Plan A Terraform Configuration

> **✅ Updated: February 2026**  
> **Security audit completed - All critical issues resolved**

This Terraform configuration deploys the minimal AWS infrastructure for Glycopilot backend (Plan A - Economic version).

## Architecture

```
[GitHub] → [EC2 t3.micro] → [PostgreSQL local] → [S3 for media (encrypted)]
```

## What's New (Feb 2026)

- ✅ Ubuntu 24.04 LTS (auto-detected latest AMI)
- ✅ S3 encryption enabled by default (AES256)
- ✅ S3 versioning enabled
- ✅ Block public S3 access (more secure)
- ✅ gp3 storage (better performance, lower cost)
- ✅ Terraform 1.5.0+ required
- ✅ AWS Provider 5.16 (latest security patches)
- ✅ SSH access configurable via variable

## Prerequisites

1. **AWS account** with appropriate permissions
2. **Terraform** >= 1.5.0 (1.14.5+ recommended)
3. **AWS CLI** configured with your credentials
4. **EC2 key pair** created:
   ```bash
   aws ec2 create-key-pair --key-name glycopilot-key-pair --query 'KeyMaterial' --output text > glycopilot-key-pair.pem
   chmod 400 glycopilot-key-pair.pem
   ```

## Deployment Steps

### 1. Configure Variables

Copy the example file and customize:
```bash
cp terraform.tfvars.example terraform.tfvars
```

**⚠️ IMPORTANT:** Edit `terraform.tfvars` and change `ssh_allowed_cidr` to your IP:
```hcl
ssh_allowed_cidr = "YOUR_IP/32"  # Find your IP: curl ifconfig.me
```

### 2. Initialize Terraform

```bash
cd infra/terraform/plan-a
terraform init
```

### 3. Review the plan

```bash
terraform plan
```

### 4. Apply the configuration

```bash
terraform apply
```

### 5. Note the outputs

After successful deployment, Terraform will output:
- EC2 public IP and DNS
- S3 bucket name for media storage
- VPC and subnet IDs
- Security group ID

### 6. Deploy the backend

SSH into the EC2 instance and run the deployment script:

```bash
ssh -i glycopilot-key-pair.pem ubuntu@<EC2_PUBLIC_IP>
chmod +x deploy_backend.sh
./deploy_backend.sh
```

## Configuration Files

- `main.tf` - Main Terraform configuration
- `variables.tf` - Variable definitions
- `outputs.tf` - Output definitions
- `deploy_backend.sh` - Backend deployment script
- `terraform.tfvars.example` - Example configuration

## Current Versions

- **Terraform:** >= 1.5.0
- **AWS Provider:** ~> 5.16
- **Ubuntu:** 24.04 LTS (auto-detected latest)
- **PostgreSQL:** Installed via apt (latest for Ubuntu 24.04)
- **Storage Type:** gp3

## Security Features

- ✅ S3 server-side encryption (AES256)
- ✅ S3 versioning enabled
- ✅ S3 public access blocked
- ✅ Configurable SSH access restriction
- ✅ Security group rules with descriptions
- ⚠️ SSH open by default - **CHANGE `ssh_allowed_cidr`!**

## Cost Estimation

- **EC2 t3.micro:** ~$7.50/month
- **S3 (5 GB):** ~$0.12/month
- **Data transfer:** ~$1-5/month
- **Total:** ~$10-15/month

## Migration to Plan B

See the main [migration guide](../../migrate_a_to_b.sh) for details.

Plan B adds:
- EKS Kubernetes cluster
- RDS PostgreSQL (Multi-AZ)
- CloudFront CDN
- WAF protection
- Better scalability

## Cleanup

To destroy all created resources:

```bash
terraform destroy
```

## Important Security Notes

1. ⚠️ **Change SSH access** in terraform.tfvars before deployment!
2. ⚠️ **Never commit** terraform.tfvars or .pem files to Git
3. ⚠️ **Update passwords** in deploy_backend.sh before running
4. ⚠️ **Update GitHub URL** in deploy_backend.sh to your repository
5. Consider using AWS Secrets Manager for production

## Troubleshooting

### AMI Not Found
If you get an AMI error, the data source will automatically fetch the latest Ubuntu 24.04 LTS AMI. If not available, check the region.

### Key Pair Not Found
Create it first:
```bash
aws ec2 create-key-pair --key-name glycopilot-key-pair --region eu-west-3
```

### Permission Denied (SSH)
```bash
chmod 400 glycopilot-key-pair.pem
```

## Additional Resources

- [Security Audit Report](../../SECURITY_AUDIT_2026-02.md)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [Terraform AWS Provider Docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
