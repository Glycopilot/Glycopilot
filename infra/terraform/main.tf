resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "glycopilot_vpc_plan_a"
  }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "glycopilot_igw"
  }
}

resource "aws_subnet" "public_subnet" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.0.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "${var.aws_region}a"

  tags = {
    Name = "glycopilot_public_subnet"
  }
}

resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name = "glycopilot_public_rt"
  }
}

resource "aws_route_table_association" "public_assoc" {
  subnet_id      = aws_subnet.public_subnet.id
  route_table_id = aws_route_table.public_rt.id
}

resource "aws_security_group" "web_sg" {
  name        = "glycopilot-web-sg"
  description = "Autorise HTTP, HTTPS et SSH"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP depuis internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS depuis internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  #Le port SSH doit être modifié par la suite pour qu'il donne accès simplmenet aux devs
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "glycopilot-web-sg"
  }
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_key_pair" "deployer" {
  key_name   = "glycopilot-key-deployer"
  public_key = file("~/.ssh/id_ed25519.pub")
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  subnet_id     = aws_subnet.public_subnet.id

  vpc_security_group_ids = [aws_security_group.web_sg.id]

  key_name = aws_key_pair.deployer.key_name

  iam_instance_profile = aws_iam_instance_profile.ec2_profile.name

  user_data = <<-EOF
                #!/bin/bash
                curl -fsSL https://get.docker.com -o get-docker.sh
                sh get-docker.sh

                usermod -aG docker ubuntu

                systemctl enable docker
                systemctl start docker
                
                EOF

  user_data_replace_on_change = true

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  tags = {
    Name = "glycopilot-ec2-plan-a"
  }
}

resource "aws_eip" "web_eip" {
  instance = aws_instance.web.id
  domain   = "vpc"

  depends_on = [aws_internet_gateway.igw]

  tags = {
    Name = "glycopilot-eip"
  }
}

resource "aws_s3_bucket" "media" {
  bucket = "glycopilot-aws-s3-bucket-img-artifacts"

  tags = {
    Name = "glycopilot-media"
  }
}

resource "aws_s3_bucket_versioning" "media_versioning" {
  bucket = aws_s3_bucket.media.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_iam_role" "ec2_s3_role" {
  name = "glycopilot-ec2-s3-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_policy" "s3_access_policy" {
  name        = "glycopilot-s3-access-policy"
  description = "Autorise l'EC2 à lire écrire dans le bucket media"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.media.arn,
          "${aws_s3_bucket.media.arn}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ec2_s3_attach" {
  role       = aws_iam_role.ec2_s3_role.name
  policy_arn = aws_iam_policy.s3_access_policy.arn
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "glycopilot-ec2-profile"
  role = aws_iam_role.ec2_s3_role.name
}