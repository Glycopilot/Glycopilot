# Glycopilot - Plan B Terraform Configuration

> **✅ Updated: February 2026**  
> **Standalone architecture - No longer depends on Plan A**

This Terraform configuration deploys a production-grade AWS infrastructure for Glycopilot with high availability and scalability.

## Architecture

```
[ALB] → [EKS Cluster (Multi-AZ)] → [RDS PostgreSQL (Multi-AZ)] 
                                  → [S3 (Encrypted) + CloudFront CDN]
                                  → [WAF Protection]
```

## What's New (Feb 2026)

- ✅ **Standalone architecture** - No dependency on Plan A
- ✅ PostgreSQL 16.6 (latest stable)
- ✅ Kubernetes 1.31 (latest stable)
- ✅ S3 encryption + versioning enabled
- ✅ S3 public access blocked (CloudFront access only)
- ✅ RDS encryption enabled
- ✅ gp3 storage for better performance
- ✅ Multi-AZ deployment
- ✅ Private subnet for database
- ✅ CloudFront with Origin Access Identity

## Key Features

1. **EKS Kubernetes Cluster** with auto-scaling (1-4 nodes)
2. **RDS PostgreSQL 16.6** with Multi-AZ and automated backups
3. **CloudFront CDN** for global media delivery
4. **WAF Protection** against common web attacks (SQL injection, XSS)
5. **Auto-scaling** for handling variable loads
6. **Encrypted storage** for S3 and RDS
7. **High availability** across multiple availability zones

## Prerequisites

1. **AWS account** with appropriate permissions
2. **Terraform** >= 1.5.0 (1.14.5+ recommended)
3. **AWS CLI** configured
4. **kubectl** v1.31+ for Kubernetes management
5. **helm** v3+ for chart deployments

## Cost Estimation

- **EKS Control Plane:** $72/month
- **EC2 nodes (2x t3.medium):** ~$60/month
- **RDS db.t3.micro Multi-AZ:** ~$30/month
- **S3 + CloudFront:** ~$5-20/month
- **WAF:** ~$10/month
- **Total:** ~$180-200/month

## Deployment Steps

### 1. Configure Variables

Copy the example file and customize:
```bash
cp terraform.tfvars.example terraform.tfvars
```

**⚠️ REQUIRED:** Edit `terraform.tfvars` and set a secure database password:
```hcl
db_password = "YOUR_SECURE_PASSWORD_HERE"  # Generate: openssl rand -base64 32
```

### 2. Initialize Terraform

```bash
cd infra/terraform/plan-b
terraform init
```

### 3. Review the plan

```bash
terraform plan
```

### 4. Apply the configuration

This will take 15-20 minutes (EKS cluster creation is slow):
```bash
terraform apply
```

### 5. Configure kubectl

After deployment, configure kubectl to access your EKS cluster:

```bash
aws eks --region eu-west-3 update-kubeconfig --name glycopilot-cluster
kubectl get nodes  # Verify connection
```

### 6. Deploy Django application to Kubernetes

Create Kubernetes manifests for your Django application:

```bash
kubectl create namespace glycopilot
kubectl apply -f k8s-manifests/
```

Example manifest structure:
- `deployment.yaml` - Django application deployment
- `service.yaml` - Service to expose the application
- `ingress.yaml` - Ingress for external access
- `configmap.yaml` - Configuration
- `secrets.yaml` - Sensitive data

## Configuration Files

- `main.tf` - Main infrastructure configuration
- `variables.tf` - Variable definitions
- `terraform.tfvars.example` - Example configuration
- `README.md` - This file

## Current Versions

- **Terraform:** >= 1.5.0
- **AWS Provider:** ~> 5.16
- **Kubernetes Provider:** ~> 2.35
- **Helm Provider:** ~> 2.16
- **PostgreSQL:** 16.6
- **Kubernetes (EKS):** 1.31
- **Storage Type:** gp3

## Security Features

- ✅ RDS in private subnet (not publicly accessible)
- ✅ Multi-AZ RDS for high availability
- ✅ RDS encryption at rest
- ✅ S3 encryption (AES256)
- ✅ S3 versioning enabled
- ✅ S3 public access blocked
- ✅ CloudFront with Origin Access Identity
- ✅ WAF with managed rule sets (SQL injection, common threats)
- ✅ Automated RDS backups (7 days retention)
- ✅ HTTPS enforced via CloudFront

## Comparison with Plan A

| Feature | Plan A | Plan B |
|---------|--------|--------|
| Compute | Single EC2 | EKS Cluster (1-4 nodes) |
| Database | Local PostgreSQL | RDS Multi-AZ |
| Storage | S3 | S3 + CloudFront CDN |
| Security | Basic | WAF + CloudFront |
| Scaling | Manual | Auto-scaling |
| Cost | ~$15/month | ~$200/month |
| Availability | Single AZ | Multi-AZ |

## Migration from Plan A

If you're running Plan A and want to migrate:

1. **Backup Plan A database:**
   ```bash
   ssh -i glycopilot-key-pair.pem ubuntu@<EC2_IP>
   pg_dump -U glycopilot_user glycopilot_db > backup.sql
   ```

2. **Deploy Plan B** (follow steps above)

3. **Restore to RDS:**
   ```bash
   psql -h <RDS_ENDPOINT> -U glycopilot_admin glycopilot_db < backup.sql
   ```

4. **Migrate S3 files:**
   ```bash
   aws s3 sync s3://old-bucket-name s3://new-bucket-name
   ```

5. **Update DNS** to point to new infrastructure

6. **Destroy Plan A** (after verification):
   ```bash
   cd ../plan-a
   terraform destroy
   ```

## Customization

Edit `terraform.tfvars` to customize:
- Database instance class and storage
- EKS cluster size (min/max/desired nodes)
- Node instance type
- Backup retention period
- WAF/CloudFront enable/disable

## Cleanup

To destroy all created resources:

```bash
terraform destroy
```

⚠️ **Warning:** This will delete your database! Make sure to backup first.

## Troubleshooting

### EKS Cluster Creation Timeout
EKS takes 15-20 minutes to create. Be patient or increase the timeout.

### kubectl Cannot Connect
Update kubeconfig:
```bash
aws eks update-kubeconfig --name glycopilot-cluster --region eu-west-3
```

### Database Connection Issues
Check security groups and ensure your application is in the same VPC.

### CloudFront Not Serving Files
- Verify S3 bucket policy allows CloudFront OAI
- Check Origin Access Identity configuration
- Wait for CloudFront distribution to deploy (15-20 minutes)

## Kubernetes Deployment Tips

1. **Use Helm** for easier Django deployment
2. **Configure pod autoscaling** (HPA)
3. **Set resource limits** for pods
4. **Use secrets** for sensitive data
5. **Configure liveness/readiness probes**
6. **Use persistent volumes** if needed

## Additional Resources

- [Security Audit Report](../../SECURITY_AUDIT_2026-02.md)
- [EKS Best Practices](https://aws.github.io/aws-eks-best-practices/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Django on Kubernetes Guide](https://kubernetes.io/blog/2019/07/23/get-started-with-kubernetes-using-python/)

## Support

For issues:
1. Check CloudWatch logs
2. Review EKS cluster events: `kubectl get events`
3. Check pod logs: `kubectl logs <pod-name>`
4. Consult AWS documentation
5. Review Terraform plan output

---

**Last Updated:** February 15, 2026  
**Terraform Version:** 1.14.0+  
**Kubernetes Version:** 1.31


1. **Database Migration**: You'll need to migrate your data from the local PostgreSQL (Plan A) to RDS (Plan B).

2. **Django Configuration**: Update your Django settings to use the new RDS endpoint and EKS environment variables.

3. **Secrets Management**: Consider using AWS Secrets Manager for production deployments instead of hardcoded passwords.

4. **Cost**: Plan B has higher costs due to RDS, EKS, and additional services. Monitor your AWS billing.

5. **Kubernetes Learning Curve**: EKS requires Kubernetes knowledge. Consider using managed services if your team is not familiar with K8s.

## Next Steps

1. Create Kubernetes manifests for your Django application
2. Set up CI/CD pipeline for Kubernetes deployments
3. Configure monitoring and logging for your EKS cluster
4. Set up backups for your RDS database
5. Configure auto-scaling policies for your EKS cluster