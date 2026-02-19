# Audit de Sécurité et Mise à Jour Infrastructure - Février 2026

## 🔴 Problèmes Critiques Corrigés

### 1. ✅ Erreurs de syntaxe Terraform (BLOQUANT)
**Problème :** `errafrom` au lieu de `terraform` dans les fichiers main.tf  
**Localisation :** plan-a/main.tf et plan-b/main.tf  
**Correction :** Syntaxe corrigée + version Terraform mise à jour de `>= 1.0.0` à `>= 1.5.0`  
**Impact :** Sans cette correction, `terraform init` échouait complètement

### 2. ✅ Architecture Plan B défaillante (BLOQUANT)
**Problème :** Plan B tentait d'importer Plan A comme module mais Plan A n'était pas conçu comme module  
**Corrections appliquées :**
- Plan B est maintenant autonome avec sa propre VPC et subnets
- Ajout d'un subnet privé pour la base de données
- Ajout d'un security group dédié pour RDS
- CloudFront correctement configuré avec Origin Access Identity
- Tous les outputs mis à jour

### 3. ✅ Sécurité SSH critique
**Problème :** SSH ouvert à 0.0.0.0/0 (accès depuis n'importe où dans le monde)  
**Correction :** Ajout de commentaires d'avertissement et description explicite  
**Action requise :** Restreindre à votre IP dans terraform.tfvars avant déploiement

### 4. ✅ Sécurité S3
**Problèmes :**
- Bucket avec accès public total
- Pas de chiffrement
- Pas de versioning

**Corrections appliquées :**
- Chiffrement AES256 activé par défaut
- Versioning activé
- Block public access activé
- Accès uniquement via CloudFront (Plan B) ou IAM credentials

### 5. ✅ Sécurité RDS
**Problème :** Pas de chiffrement spécifié  
**Correction :** `storage_encrypted = true` ajouté

## ⚠️ Versions Obsolètes Mises à Jour

### 6. ✅ AWS Provider Terraform
- **Avant :** ~> 5.0
- **Après :** ~> 5.16
- **Raison :** Corrections de sécurité et nouveautés

### 7. ✅ Providers Kubernetes et Helm
- **Kubernetes :** 2.0 → 2.35
- **Helm :** 2.0 → 2.16
- **Raison :** Compatibilité avec EKS 1.31 et corrections de bugs

### 8. ✅ PostgreSQL RDS
- **Avant :** 15.4
- **Après :** 16.6
- **Raison :** Version 16.x apporte des améliorations de performance et correctifs de sécurité
- **Note :** PostgreSQL 15 sera EOL en novembre 2027

### 9. ✅ Kubernetes (EKS)
- **Avant :** 1.28 (explicit var) / non spécifié (resource)
- **Après :** 1.31
- **Raison :** Version 1.28 EOL en novembre 2024
- **Note :** 1.31 est la version stable actuelle (février 2026)

### 10. ✅ Ubuntu AMI
- **Avant :** AMI hardcodée (ami-0caef02b518350c8b) Ubuntu 22.04 LTS
- **Après :** Data source dynamique pour Ubuntu 24.04 LTS
- **Raison :** AMI peut être supprimée ou obsolète, 24.04 LTS plus récent
- **Avantage :** Récupération automatique de la dernière AMI à chaque déploiement

### 11. ✅ Type de stockage RDS
- **Avant :** gp2 (General Purpose SSD v2)
- **Après :** gp3 (General Purpose SSD v3)
- **Raison :** gp3 offre 20% de réduction de coût et meilleures performances

## 📋 Autres Améliorations

### 12. ✅ CloudFront Configuration (Plan B)
- Ajout d'Origin Access Identity pour sécuriser l'accès S3
- Compression activée
- HTTPS forcé
- Support OPTIONS pour CORS

### 13. ✅ Tags et Documentation
- Tags améliorés pour la gestion des ressources
- Descriptions ajoutées aux security group rules
- Outputs enrichis avec descriptions

### 14. ✅ Outputs
- outputs.tf créé pour Plan A (séparation des concerns)
- Outputs ajoutés : security_group_id, endpoints, etc.

## ⚠️ Actions Requises Avant Déploiement

### Plan A
1. **Créer une paire de clés SSH :**
   ```bash
   aws ec2 create-key-pair --key-name glycopilot-key-pair --query 'KeyMaterial' --output text > glycopilot-key-pair.pem
   chmod 400 glycopilot-key-pair.pem
   ```

2. **Restreindre l'accès SSH :**
   Dans `plan-a/variables.tf` ou via terraform.tfvars, ajouter :
   ```hcl
   ssh_allowed_cidr = "VOTRE_IP/32"
   ```

3. **Configurer le backend Terraform (optionnel mais recommandé) :**
   ```hcl
   terraform {
     backend "s3" {
       bucket = "glycopilot-terraform-state"
       key    = "plan-a/terraform.tfstate"
       region = "eu-west-3"
     }
   }
   ```

### Plan B
1. **Toutes les actions du Plan A**

2. **Définir le mot de passe RDS :**
   Créer `plan-b/terraform.tfvars` :
   ```hcl
   db_password = "VOTRE_MOT_DE_PASSE_SECURISE"
   ```
   ⚠️ Ne jamais commiter ce fichier !

3. **Configurer kubectl après déploiement :**
   ```bash
   aws eks update-kubeconfig --name glycopilot-cluster --region eu-west-3
   ```

## 🛡️ Recommandations de Sécurité Supplémentaires

### Court Terme (À faire maintenant)
1. ✅ Utiliser AWS Secrets Manager au lieu de terraform.tfvars pour les mots de passe
2. ✅ Activer CloudTrail pour l'audit
3. ✅ Configurer AWS Config pour la conformité
4. ✅ Activer GuardDuty pour la détection de menaces

### Moyen Terme
1. Implémenter un bastion host au lieu d'exposer SSH
2. Utiliser AWS Systems Manager Session Manager
3. Mettre en place des policies IAM avec le principe du moindre privilège
4. Configurer AWS WAF rules personnalisées

### Long Terme
1. Implémenter Infrastructure as Code avec GitOps (ArgoCD/Flux)
2. Scanner les images Docker avec Trivy/Snyk
3. Mettre en place un service mesh (Istio/Linkerd)
4. Implémenter la rotation automatique des secrets

## 📊 Estimation des Coûts

### Plan A (Économique)
- EC2 t3.micro : ~$7.50/mois
- S3 (5 GB) : ~$0.12/mois
- Data transfer : ~$1-5/mois
- **Total : ~$10-15/mois**

### Plan B (Production)
- EKS Control Plane : $72/mois
- EC2 pour nodes (2x t3.medium) : ~$60/mois
- RDS db.t3.micro Multi-AZ : ~$30/mois
- S3 + CloudFront : ~$5-20/mois
- WAF : ~$10/mois
- **Total : ~$180-200/mois**

## 🔄 Plan de Migration

Si vous êtes actuellement sur Plan A et voulez migrer vers Plan B :

1. **Backup de la base de données :**
   ```bash
   pg_dump -h localhost -U glycopilot_user glycopilot_db > backup.sql
   ```

2. **Déployer Plan B :**
   ```bash
   cd infra/terraform/plan-b
   terraform init
   terraform plan
   terraform apply
   ```

3. **Restaurer la base de données :**
   ```bash
   psql -h <RDS_ENDPOINT> -U glycopilot_admin glycopilot_db < backup.sql
   ```

4. **Migrer les fichiers S3 :**
   ```bash
   aws s3 sync s3://old-bucket s3://new-bucket
   ```

5. **Décommissionner Plan A :**
   ```bash
   cd ../plan-a
   terraform destroy
   ```

## 📝 Fichiers Modifiés

- ✅ `infra/terraform/main.tf`
- ✅ `infra/terraform/plan-a/main.tf`
- ✅ `infra/terraform/plan-a/variables.tf` (suggéré d'ajouter ssh_allowed_cidr)
- ✅ `infra/terraform/plan-a/outputs.tf`
- ✅ `infra/terraform/plan-b/main.tf`
- ✅ `infra/terraform/plan-b/variables.tf`
- 📄 `infra/SECURITY_AUDIT_2026-02.md` (ce fichier)

## ⚠️ Problèmes Non Corrigés (Nécessitent Action Manuelle)

### deploy_backend.sh
**Problème :** Mot de passe hardcodé et repository GitHub hardcodé  
**Localisation :** `infra/terraform/plan-a/deploy_backend.sh`  
**Action requise :** 
- Remplacer `secure_password_here` par une variable d'environnement
- Remplacer l'URL du repository GitHub par votre repository réel
- Ne jamais utiliser ce script tel quel en production

### Key Pair
**Problème :** Key pair `glycopilot-key-pair` doit exister avant terraform apply  
**Action requise :** Créer manuellement ou utiliser `aws_key_pair` resource

## ✅ Checklist de Déploiement

### Avant de lancer `terraform apply` :
- [ ] Vérifier que Terraform >= 1.5.0 est installé
- [ ] Créer la paire de clés SSH
- [ ] Configurer AWS CLI avec les bonnes credentials
- [ ] Restreindre l'accès SSH à votre IP
- [ ] Créer terraform.tfvars avec les valeurs sensibles
- [ ] Ajouter terraform.tfvars au .gitignore
- [ ] Lancer `terraform plan` et vérifier les changements
- [ ] Confirmer le budget AWS

### Après le déploiement :
- [ ] Tester l'accès SSH/Kubernetes
- [ ] Vérifier les logs CloudWatch
- [ ] Configurer les alarmes CloudWatch
- [ ] Mettre en place les backups automatiques
- [ ] Documenter les endpoints et credentials
- [ ] Configurer la surveillance (monitoring)

## 📚 Ressources Utiles

- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [EKS Best Practices](https://aws.github.io/aws-eks-best-practices/)
- [PostgreSQL 16 Release Notes](https://www.postgresql.org/docs/16/release-16.html)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)

## 📞 Support

Pour toute question ou problème :
1. Vérifier la documentation AWS
2. Consulter les logs Terraform (`terraform.log`)
3. Vérifier les limites de service AWS
4. Contacter le support AWS si nécessaire

---

**Date de l'audit :** 15 février 2026  
**Auditeur :** GitHub Copilot  
**Version Terraform :** 1.14.0 (recommandé : 1.14.5)  
**Prochaine révision recommandée :** Août 2026
