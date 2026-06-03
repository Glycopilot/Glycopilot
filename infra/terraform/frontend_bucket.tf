resource "aws_s3_bucket" "frontend_web" {
  bucket = var.frontend_bucket_name

  tags = {
    Name = "glycopilot-web-frontend"
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_ownership_controls" "frontend_web" {
  bucket = aws_s3_bucket.frontend_web.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "frontend_web" {
  bucket = aws_s3_bucket.frontend_web.id

  block_public_acls       = false
  ignore_public_acls      = false
  block_public_policy     = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend_web" {
  bucket = aws_s3_bucket.frontend_web.id

  rule {
    bucket_key_enabled       = false
    blocked_encryption_types = ["SSE-C"]

    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_website_configuration" "frontend_web" {
  bucket = aws_s3_bucket.frontend_web.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_policy" "frontend_web_public_read" {
  bucket = aws_s3_bucket.frontend_web.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat([
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend_web.arn}/*"
      }
      ],
      var.enable_frontend_cloudfront ? [
        {
          Sid    = "AllowCloudFrontServicePrincipalReadOnly"
          Effect = "Allow"
          Principal = {
            Service = "cloudfront.amazonaws.com"
          }
          Action   = "s3:GetObject"
          Resource = "${aws_s3_bucket.frontend_web.arn}/*"
          Condition = {
            StringEquals = {
              "AWS:SourceArn" = aws_cloudfront_distribution.frontend_web[0].arn
            }
          }
        }
      ] : []
    )
  })

  depends_on = [aws_s3_bucket_public_access_block.frontend_web]
}

resource "aws_cloudfront_origin_access_control" "frontend_web" {
  count = var.enable_frontend_cloudfront ? 1 : 0

  name                              = "${var.frontend_bucket_name}-oac"
  description                       = "Acces CloudFront au bucket frontend Glycopilot"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "frontend_web" {
  count = var.enable_frontend_cloudfront ? 1 : 0

  enabled             = true
  comment             = "Glycopilot web frontend"
  default_root_object = "index.html"
  price_class         = var.frontend_cloudfront_price_class
  aliases             = var.frontend_cloudfront_aliases

  origin {
    domain_name              = aws_s3_bucket.frontend_web.bucket_regional_domain_name
    origin_id                = "s3-${aws_s3_bucket.frontend_web.bucket}"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend_web[0].id
  }

  default_cache_behavior {
    target_origin_id       = "s3-${aws_s3_bucket.frontend_web.bucket}"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    allowed_methods = ["GET", "HEAD", "OPTIONS"]
    cached_methods  = ["GET", "HEAD"]

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.frontend_cloudfront_acm_certificate_arn
    minimum_protocol_version = "TLSv1.2_2021"
    ssl_support_method       = "sni-only"
  }

  lifecycle {
    precondition {
      condition     = var.frontend_cloudfront_acm_certificate_arn != ""
      error_message = "frontend_cloudfront_acm_certificate_arn est requis pour activer CloudFront."
    }
  }
}
