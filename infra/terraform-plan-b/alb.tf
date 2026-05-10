# infra/terraform-plan-b/alb.tf

# 1. Security Group pour le Load Balancer (Ouvert sur Internet)
resource "aws_security_group" "alb_sg" {
  name        = "glycopilot-alb-sg-plan-b"
  description = "Autorise HTTP et HTTPS depuis Internet vers l ALB"
  vpc_id      = aws_vpc.plan_b_vpc.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "glycopilot_alb_sg_plan_b" }
}

# 2. Le Load Balancer (Placé dans les sous-réseaux PUBLICS)
resource "aws_lb" "main" {
  name               = "glycopilot-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = [aws_subnet.public_1.id, aws_subnet.public_2.id]

  tags = { Name = "glycopilot_alb_plan_b" }
}

# 3. Le Target Group (La cible : ton conteneur Django sur le port 8000)
resource "aws_lb_target_group" "backend" {
  name        = "glycopilot-tg"
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.plan_b_vpc.id
  target_type = "ip" # Obligatoire pour AWS Fargate

  # Le Health Check : l'ALB va taper sur /admin/login/ pour vérifier que Django est vivant
  health_check {
    path                = "/admin/login/"
    healthy_threshold   = 2
    unhealthy_threshold = 10
    timeout             = 5
    interval            = 30
    matcher             = "200,302" # On accepte la redirection 302 comme preuve de vie !
  }
}

# 4. Le Listener (Écoute sur le port 80 et redirige vers le Target Group)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}

# Output : L'URL publique de ton site Plan B !
output "alb_dns_name" {
  description = "L'adresse publique de l'Application Load Balancer"
  value       = aws_lb.main.dns_name
}