# Guide d'Adaptation du Backend Django pour AWS

Ce guide explique comment adapter le backend Django de Glycopilot pour fonctionner avec l'infrastructure AWS déployée via Terraform.

## Configuration pour le Plan A

### 1. Configuration de la Base de Données PostgreSQL

Dans `backend/core/settings.py`, assurez-vous que la configuration PostgreSQL est correcte :

```python
# Database Configuration for Plan A (local PostgreSQL on EC2)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', 'glycopilot_db'),
        'USER': config('DB_USER', 'glycopilot_user'),
        'PASSWORD': config('DB_PASSWORD', ''),
        'HOST': config('DB_HOST', 'localhost'),  # 'localhost' pour Plan A
        'PORT': config('DB_PORT', 5432, cast=int),
    }
}
```

### 2. Configuration S3 pour le Stockage des Médias

La configuration S3 est déjà présente dans le fichier de settings. Assurez-vous que ces variables d'environnement sont définies :

```bash
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_STORAGE_BUCKET_NAME=your-bucket-name-from-terraform
AWS_S3_REGION_NAME=eu-west-3
```

### 3. Configuration des Variables d'Environnement

Créez un fichier `.env` dans le dossier `backend/` avec le contenu suivant (remplacez les valeurs par celles de votre déploiement Terraform) :

```bash
# Django Configuration
DEBUG=False
SECRET_KEY=your-secret-key-from-terraform
SECRET_KEY_ADMIN=your-admin-secret-key
ALLOWED_HOSTS=.glycopilot.com,localhost,127.0.0.1,<EC2_PUBLIC_IP>

# Database Configuration (Plan A - local PostgreSQL)
DB_ENGINE=postgresql
DB_NAME=glycopilot_db
DB_USER=glycopilot_user
DB_PASSWORD=your-db-password
DB_HOST=localhost
DB_PORT=5432

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_STORAGE_BUCKET_NAME=your-bucket-name-from-terraform
AWS_S3_REGION_NAME=eu-west-3

# JWT Configuration
ACCESS_TOKEN_MINUTES=60
REFRESH_TOKEN_DAYS=7

# Frontend URL
FRONTEND_URL=https://your-frontend-url.com

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_USE_TLS=True
```

### 4. Installation des Dépendances Requises

Assurez-vous que ces packages sont dans votre `requirements.txt` :

```bash
psycopg2-binary==2.9.9
django-storages[boto3]==1.14.2
gunicorn==21.2.0
```

Installez-les avec :
```bash
pip install -r requirements.txt
```

### 5. Configuration de Nginx pour Django

Le script de déploiement configure déjà Nginx, mais voici la configuration recommandée :

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location = /favicon.ico { access_log off; log_not_found off; }
    location /static/ {
        root /var/www/glycopilot/backend;
    }

    location /media/ {
        # For S3, you might want to proxy to CloudFront or S3 directly
        proxy_pass https://your-bucket-name.s3.eu-west-3.amazonaws.com/;
    }

    location / {
        include proxy_params;
        proxy_pass http://unix:/var/www/glycopilot/backend/glycopilot.sock;
    }
}
```

## Configuration pour le Plan B

### 1. Configuration de la Base de Données RDS

Pour le Plan B, vous utiliserez RDS au lieu de PostgreSQL local. Mettez à jour votre configuration :

```python
# Database Configuration for Plan B (RDS PostgreSQL)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', 'glycopilot_db'),
        'USER': config('DB_USER', 'glycopilot_admin'),  # Note: different user for RDS
        'PASSWORD': config('DB_PASSWORD', ''),
        'HOST': config('DB_HOST', 'your-rds-endpoint-from-terraform'),  # RDS endpoint
        'PORT': config('DB_PORT', 5432, cast=int),
    }
}
```

### 2. Configuration Kubernetes pour Django

Pour le Plan B, vous devrez créer des manifests Kubernetes. Voici un exemple de base :

**deployment.yaml**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: glycopilot-django
spec:
  replicas: 2
  selector:
    matchLabels:
      app: glycopilot-django
  template:
    metadata:
      labels:
        app: glycopilot-django
    spec:
      containers:
      - name: django
        image: your-django-image:latest
        ports:
        - containerPort: 8000
        envFrom:
        - secretRef:
            name: glycopilot-secrets
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "1000m"
            memory: "1Gi"
```

**service.yaml**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: glycopilot-service
spec:
  selector:
    app: glycopilot-django
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8000
  type: LoadBalancer
```

### 3. Configuration des Secrets Kubernetes

Créez un fichier de secrets pour Kubernetes :

```bash
kubectl create secret generic glycopilot-secrets \
  --from-literal=SECRET_KEY='your-secret-key' \
  --from-literal=DB_PASSWORD='your-db-password' \
  --from-literal=AWS_ACCESS_KEY_ID='your-aws-access-key' \
  --from-literal=AWS_SECRET_ACCESS_KEY='your-aws-secret-key' \
  --from-literal=DB_HOST='your-rds-endpoint'
```

## Migration de Plan A à Plan B

### 1. Sauvegarde de la Base de Données

Avant de migrer, sauvegardez votre base de données Plan A :

```bash
# Sur l'instance EC2 Plan A
pg_dump -U glycopilot_user -d glycopilot_db -f backup.sql
```

### 2. Restauration dans RDS

```bash
# Sur un serveur avec accès à RDS
psql -h your-rds-endpoint -U glycopilot_admin -d glycopilot_db -f backup.sql
```

### 3. Mise à Jour de la Configuration Django

Mettez à jour vos variables d'environnement pour pointer vers RDS et ajuster les paramètres Kubernetes.

## Bonnes Pratiques pour AWS

### 1. Gestion des Secrets

- Utilisez AWS Secrets Manager pour les secrets de production
- Ne commitez jamais de secrets dans Git
- Utilisez des variables d'environnement ou des fichiers `.env` ignorés par Git

### 2. Sécurité

- Configurez les security groups pour limiter l'accès
- Utilisez HTTPS partout
- Activez WAF pour la protection contre les attaques web
- Configurez des sauvegardes automatiques pour RDS

### 3. Performance

- Utilisez CloudFront pour la distribution de contenu statique
- Configurez le caching approprié pour les fichiers médias
- Optimisez vos requêtes database pour RDS
- Utilisez ElastiCache (Redis) pour le caching si nécessaire

### 4. Monitoring

- Configurez CloudWatch pour le monitoring
- Mettez en place des alertes pour les métriques critiques
- Surveillez les coûts AWS régulièrement

## Dépannage

### Problèmes Courants et Solutions

**1. Problème de connexion à la base de données**
- Vérifiez que le security group permet l'accès PostgreSQL
- Assurez-vous que le nom d'utilisateur et mot de passe sont corrects
- Vérifiez que la base de données existe et que l'utilisateur a les permissions

**2. Problèmes avec S3**
- Vérifiez les permissions IAM pour l'accès S3
- Assurez-vous que la politique du bucket permet l'accès approprié
- Vérifiez les variables d'environnement AWS

**3. Problèmes de performance**
- Vérifiez la taille de votre instance EC2/EKS
- Optimisez vos requêtes database
- Configurez le caching approprié

## Ressources Utiles

- [Documentation AWS RDS](https://aws.amazon.com/rds/)
- [Documentation AWS S3](https://aws.amazon.com/s3/)
- [Documentation AWS EKS](https://aws.amazon.com/eks/)
- [Documentation Django avec PostgreSQL](https://docs.djangoproject.com/en/stable/ref/databases/#postgresql-notes)
- [Documentation django-storages](https://django-storages.readthedocs.io/)