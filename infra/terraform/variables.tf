variable "aws_region" {
  description = "la region aws pour les déploiement"
  type        = string
  default     = "eu-west-3"
}

variable "instance_type" {
  description = "Le type d'instance EC2"
  type        = string
  default     = "t3.micro"
}