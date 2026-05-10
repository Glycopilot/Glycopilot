# Le VPC Plan B
resource "aws_vpc" "plan_b_vpc" {
  cidr_block           = "10.1.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = { Name = "glycopilot_vpc_plan_b" }
}

data "aws_availability_zones" "available" {
  state = "available"
}

# --- SOUS-RÉSEAUX PUBLICS (Pour le Load Balancer et les conteneurs ECS) ---
resource "aws_subnet" "public_1" {
  vpc_id                  = aws_vpc.plan_b_vpc.id
  cidr_block              = "10.1.1.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true
  tags = { Name = "glycopilot_public_1_plan_b" }
}

resource "aws_subnet" "public_2" {
  vpc_id                  = aws_vpc.plan_b_vpc.id
  cidr_block              = "10.1.2.0/24"
  availability_zone       = data.aws_availability_zones.available.names[1]
  map_public_ip_on_launch = true
  tags = { Name = "glycopilot_public_2_plan_b" }
}

# --- SOUS-RÉSEAUX PRIVÉS (Pour la Base de Données et Redis - Zéro accès Internet) ---
resource "aws_subnet" "private_db_1" {
  vpc_id            = aws_vpc.plan_b_vpc.id
  cidr_block        = "10.1.10.0/24"
  availability_zone = data.aws_availability_zones.available.names[0]
  tags = { Name = "glycopilot_private_db_1_plan_b" }
}

resource "aws_subnet" "private_db_2" {
  vpc_id            = aws_vpc.plan_b_vpc.id
  cidr_block        = "10.1.11.0/24"
  availability_zone = data.aws_availability_zones.available.names[1]
  tags = { Name = "glycopilot_private_db_2_plan_b" }
}

# --- INTERNET GATEWAY & ROUTAGE ---
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.plan_b_vpc.id
  tags = { Name = "glycopilot_igw_plan_b" }
}

resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.plan_b_vpc.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
  tags = { Name = "glycopilot_public_rt_plan_b" }
}

resource "aws_route_table_association" "public_1_assoc" {
  subnet_id      = aws_subnet.public_1.id
  route_table_id = aws_route_table.public_rt.id
}

resource "aws_route_table_association" "public_2_assoc" {
  subnet_id      = aws_subnet.public_2.id
  route_table_id = aws_route_table.public_rt.id
}

# Groupe de sous-réseaux pour RDS (indispensable pour dire à AWS où mettre la DB)
resource "aws_db_subnet_group" "rds_subnet_group" {
  name       = "glycopilot-rds-subnet-group"
  subnet_ids = [aws_subnet.private_db_1.id, aws_subnet.private_db_2.id]
  tags = { Name = "Glycopilot RDS Subnet Group" }
}