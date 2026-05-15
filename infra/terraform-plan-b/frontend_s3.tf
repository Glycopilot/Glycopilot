# infra/terraform-plan-b/frontend_s3.tf

# 1. Le Bucket S3 pour le site statique
resource "aws_s3_bucket" "frontend_bucket" {
  bucket = "glycopilot-web-frontend-${data.aws_caller_identity.current.account_id}" 

  tags = {
    Name = "Glycopilot Frontend Web"
  }
}

# 2. Configuration du site web statique
resource "aws_s3_bucket_website_configuration" "frontend_config" {
  bucket = aws_s3_bucket.frontend_bucket.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

# 3. Rendre le bucket public (Nécessaire pour un site web sans CloudFront)
resource "aws_s3_bucket_public_access_block" "frontend_public_access" {
  bucket = aws_s3_bucket.frontend_bucket.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# 4. Politique d'accès : Tout le monde peut lire les objets (Lecture seule)
resource "aws_s3_bucket_policy" "allow_public_read" {
  bucket = aws_s3_bucket.frontend_bucket.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend_bucket.arn}/*"
      },
    ]
  })
  depends_on = [aws_s3_bucket_public_access_block.frontend_public_access]
}

# Output : L'URL pour accéder à ton site web !
output "frontend_url" {
  value = aws_s3_bucket_website_configuration.frontend_config.website_endpoint
}