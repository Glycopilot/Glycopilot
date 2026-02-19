# Glycopilot Infrastructure as Code

> **⚠️ Dernière mise à jour : Février 2026**  
> **✅ Audit de sécurité effectué - Voir [SECURITY_AUDIT_2026-02.md](SECURITY_AUDIT_2026-02.md)**

This directory contains Terraform configurations for deploying Glycopilot on AWS.

## 🔒 Important Security Notes

**Before deploying:**
1. Review and update SSH access restrictions in security groups
2. Never commit `terraform.tfvars` or `.pem` files
3. Use strong passwords for RDS databases
4. Review the security audit document for complete recommendations

## Structure

```
infra/
├── terraform/
│   ├── plan-a/      # Economic deployment (single EC2, local PostgreSQL)
│   └── plan-b/      # Robust deployment (EKS, RDS, CloudFront, WAF)
└── README.md        # This file
```

## Deployment Plans

### Plan A - Economic Deployment

**Best for**: Development, testing, small-scale production, MVP

**Features**:
- Single EC2 instance (t3.micro)
- PostgreSQL installed locally on EC2
- S3 for media storage
- Basic VPC with public subnet
- Cost-effective (~$10-20/month)

**Use when**:
- You need a quick, low-cost deployment
- You're testing the waters
- You have limited AWS budget
- You want simple management

**Location**: `infra/terraform/plan-a/`

### Plan B - Robust Deployment

**Best for**: Production, scaling, high availability

**Features**:
- EKS Kubernetes cluster with auto-scaling
- RDS PostgreSQL with Multi-AZ
- CloudFront CDN for media
- WAF protection against attacks
- More resilient architecture
- Higher cost but better performance

**Use when**:
- You need high availability
- You expect significant traffic
- You want auto-scaling capabilities
- Security is a top priority
- You have AWS budget for production

**Location**: `infra/terraform/plan-b/`

## Migration Path

```
Plan A → Plan B
```

The configurations are designed so you can start with Plan A and easily migrate to Plan B when needed.

## Getting Started

### Prerequisites

1. **AWS account** with appropriate permissions
2. **Terraform** installed (v1.5.0+ required, v1.14.5+ recommended)
   ```bash
   terraform version
   ```
3. **AWS CLI** configured with your credentials
   ```bash
   aws configure
   ```
4. **SSH Key Pair** for EC2 access
   ```bash
   aws ec2 create-key-pair --key-name glycopilot-key-pair --query 'KeyMaterial' --output text > glycopilot-key-pair.pem
   chmod 400 glycopilot-key-pair.pem
   ```
5. Basic understanding of AWS services

### Current Versions

- **Terraform:** >= 1.5.0
- **AWS Provider:** ~> 5.16
- **PostgreSQL (RDS):** 16.6
- **Kubernetes (EKS):** 1.31
- **Ubuntu:** 24.04 LTS (auto-detected)
- **Storage:** gp3 (improved performance & cost)

### Quick Start with Plan A

```bash
cd infra/terraform/plan-a
terraform init
terraform plan
terraform apply
```

Then follow the instructions in `plan-a/README.md`.

### Upgrading to Plan B

```bash
cd infra/terraform/plan-b
terraform init
terraform plan
terraform apply
```

Then follow the instructions in `plan-b/README.md`.

## Important Notes

1. **Cost**: Plan A is much cheaper than Plan B. Monitor your AWS billing.

2. **Complexity**: Plan B requires Kubernetes knowledge. Consider your team's expertise.

3. **Data Migration**: When upgrading from Plan A to Plan B, you'll need to migrate your database.

4. **Backups**: Always backup your data before major infrastructure changes.

5. **Security**: Review all security groups, IAM roles, and policies before deployment.

## Best Practices

1. **Start with Plan A** for development and testing
2. **Use separate AWS accounts** for development and production
3. **Implement proper secrets management** (AWS Secrets Manager)
4. **Monitor your costs** regularly
5. **Set up alerts** for billing and performance
6. **Document your infrastructure** changes

## Support

For issues with the Terraform configurations:
1. Check AWS documentation
2. Review Terraform error messages
3. Consult the specific plan's README
4. Check AWS service quotas and limits

## Contributing

If you make improvements to the infrastructure:
1. Test changes thoroughly
2. Update documentation
3. Consider backward compatibility
4. Add comments for complex configurations