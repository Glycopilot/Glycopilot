# infra/terraform-plan-b/redis.tf

# 1. Security Group pour Redis
resource "aws_security_group" "redis_sg_plan_b" {
  name        = "glycopilot-redis-sg-plan-b"
  description = "Autorise le trafic Redis uniquement depuis le reseau interne"
  vpc_id      = aws_vpc.plan_b_vpc.id

  ingress {
    description = "Redis from within the VPC only"
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.plan_b_vpc.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "glycopilot_redis_sg_plan_b" }
}

# 2. Groupe de sous-réseaux pour Redis (Mêmes sous-réseaux que RDS)
resource "aws_elasticache_subnet_group" "redis_subnet_group_plan_b" {
  name       = "glycopilot-redis-subnet-group"
  subnet_ids = [aws_subnet.private_db_1.id, aws_subnet.private_db_2.id]
}

# 3. Le Cluster Redis Géré (Configuration minimale pour Free Tier / FinOps)
resource "aws_elasticache_cluster" "redis_plan_b" {
  cluster_id           = "glycopilot-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro" # Instance économique
  num_cache_nodes      = 1                # Un seul noeud pour limiter les coûts
  parameter_group_name = "default.redis7" # On s'aligne sur ton redis:7-alpine
  engine_version       = "7.1"
  port                 = 6379
  
  subnet_group_name    = aws_elasticache_subnet_group.redis_subnet_group_plan_b.name
  security_group_ids   = [aws_security_group.redis_sg_plan_b.id]

  tags = { Name = "glycopilot_redis_plan_b" }
}

# 4. Output pour récupérer l'adresse de Redis
output "redis_endpoint_plan_b" {
  description = "L'adresse de connexion a Redis pour Django"
  value       = aws_elasticache_cluster.redis_plan_b.cache_nodes[0].address
}