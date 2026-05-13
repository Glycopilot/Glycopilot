# Rapport de Vulnérabilités Sécurité — Glycopilot

> Analyse statique du code source (branche `develop`)  
> Date : 13 mai 2026  
> Périmètre : backend Django, AI service FastAPI, frontend React Native, frontend Web, infrastructure Terraform/Docker

---

## Synthèse

| Criticité    | Nombre |
|--------------|--------|
| 🔴 Critique | 4      |
| 🟠 Haute    | 5      |
| 🟡 Moyenne  | 6      |
| 🔵 Faible   | 4      |
| **Total**   | **19** |

**Critique = C**
**Haute = H**
**Moyenne = M**
**Faible = F**

---

## 🔴 Vulnérabilités Critiques

---

### C-1 — Mot de passe RDS codé en dur dans Terraform

**Fichier :** `infra/terraform-plan-b/rds.tf` — ligne 38  
**Type :** CWE-798 — Hardcoded Credentials

```hcl
password = "GlycopilotSuperSecret2026!"
```

Le mot de passe de l'instance PostgreSQL de production est en clair dans un fichier Terraform versionné sous Git. Toute personne ayant accès au dépôt (ou à l'historique Git) peut se connecter directement à la base de données.

**Remédiation :** Utiliser un secret manager (AWS Secrets Manager, ou variable Terraform sensible non committée) et marquer le champ `sensitive = true`. Ne jamais stocker de credentials dans les fichiers `.tf` ou `.tfvars` committés.

---

### C-2 — Token par défaut `dev_secret` actif en production si non surchargé

**Fichiers :** `ai_service/core/config.py` (ligne 9), `backend/apps/glycemia/services/ia_client.py` (ligne 21)  
**Type :** CWE-1188 — Insecure Default Initialization

```python
# ai_service/core/config.py
internal_token: str = "dev_secret"

# backend/apps/glycemia/services/ia_client.py
AI_SERVICE_TOKEN = getattr(settings, "AI_SERVICE_TOKEN", "dev_secret")
```

Si les variables d'environnement `INTERNAL_TOKEN` / `AI_SERVICE_TOKEN` ne sont pas définies, l'AI service accepte n'importe quel appelant connaissant `dev_secret` — valeur publiquement visible dans le code source. L'authentification inter-services est donc contournable.

**Remédiation :** Supprimer toute valeur par défaut non vide pour les secrets. Lever une exception au démarrage si la variable est absente en production (même pattern que `SECRET_KEY`). Ajouter une vérification dans le CI/CD.

---

### C-3 — JWT transmis en clair dans l'URL WebSocket

**Fichiers :** `backend/apps/glycemia/middleware.py`, `frontend/src/hooks/useGlycemiaWebSocket.ts`  
**Type :** CWE-598 — Sensitive Information in Query String

```
wss://host/ws/glycemia/?token=<JWT_ACCESS_TOKEN>
```

Le JWT (access token) est passé en paramètre de requête dans l'URL WebSocket. Cela expose le token dans les logs de proxy, les logs serveur NGINX, l'historique du navigateur, les en-têtes `Referer`, et les outils de monitoring réseau. Un attaquant ayant accès aux logs peut rejouer le token avant son expiration (1h par défaut).

**Remédiation :** Mettre en œuvre une authentification WebSocket en deux temps : (1) générer un ticket éphémère (courte durée, usage unique) via un endpoint HTTP authentifié, (2) passer ce ticket en query string. Alternativement, utiliser le premier message WebSocket post-connexion pour transmettre le JWT (protocole applicatif).

---

### C-4 — Désérialisation `joblib.load` de fichiers `.pkl` non vérifiés

**Fichiers :** `ai_service/models/baseline.py`, `ai_service/models/ensemble.py`, `ai_service/models/xgboost_model.py`  
**Type :** CWE-502 — Deserialization of Untrusted Data

Les fichiers `.pkl` (modèles XGBoost, baseline, scalers) sont chargés avec `joblib.load()` au démarrage du service. Si un attaquant peut remplacer un fichier `.pkl` dans le volume Docker (SSRF, compromission du pipeline CI/CD, path traversal), l'exécution de code arbitraire est garantie — `pickle` est un vecteur d'exécution de code natif en Python.

**Remédiation :** Vérifier l'intégrité des artefacts ML via une signature cryptographique (HMAC-SHA256) avant chargement. Stocker les checksum dans un registre séparé. Pour les modèles PyTorch, le paramètre `weights_only=True` est déjà utilisé (bonne pratique) mais il manque pour les fichiers `joblib`.

---

## 🟠 Vulnérabilités Hautes

---

### H-1 — NGINX sans HTTPS : données médicales en clair sur le réseau

**Fichier :** `.nginx/default.conf`  
**Type :** CWE-319 — Cleartext Transmission of Sensitive Information

La configuration NGINX écoute uniquement sur le port 80 (HTTP). Les données de glycémie, les tokens JWT, et les informations médicales transitent en clair. `SECURE_SSL_REDIRECT` est défini à `False` par défaut dans les settings Django.

**Remédiation :** Configurer TLS (Let's Encrypt / AWS Certificate Manager), rediriger HTTP → HTTPS, activer `SECURE_SSL_REDIRECT = True` en production.

---

### H-2 — Service token d'authentification inter-services à privilèges excessifs

**Fichier :** `backend/utils/service_token_auth.py`  
**Type :** CWE-269 — Improper Privilege Management

```python
service_user = (
    AuthAccount.objects.filter(is_superuser=True).first()
    or AuthAccount.objects.filter(is_staff=True).first()
)
```

Quand l'AI service s'authentifie avec son `ServiceToken`, il est identifié comme le premier compte **superadmin** de la base. L'AI service dispose donc de toutes les permissions Django — y compris la gestion des utilisateurs, des médecins, et de l'administration. Le principe du moindre privilège est violé.

**Remédiation :** Créer un compte de service dédié avec uniquement les permissions nécessaires (lecture des données glycémiques d'un patient donné). Ne jamais réutiliser un compte admin pour l'authentification machine-to-machine.

---

### H-3 — `refresh_token` endpoint sans rate limiting

**Fichier :** `backend/apps/auth/views.py` — vue `refresh_token`  
**Type :** CWE-307 — Improper Restriction of Excessive Authentication Attempts

Le endpoint `POST /api/auth/refresh` ne porte aucun décorateur `@throttle_classes`, contrairement à `login` et `register`. Un attaquant peut appeler ce endpoint sans restriction pour tenter des tokens de refresh (bruteforce ou fuzzing).

**Remédiation :** Ajouter `@throttle_classes([AuthRateThrottle])` sur la vue `refresh_token`.

---

### H-4 — `device` et `epochs` contrôlés par l'appelant dans le fine-tuning

**Fichier :** `ai_service/api/routes/finetune.py`  
**Type :** CWE-20 — Improper Input Validation

```python
class FinetuneRequest(BaseModel):
    epochs: int = 30
    device: str = "cpu"   # ← valeur fournie par le client
```

Le paramètre `device` est transmis sans validation à `torch.load(..., map_location=device)`. Une valeur malformée peut provoquer un crash ou un comportement inattendu. `epochs` sans plafond peut déclencher un fine-tuning interminable et saturer les ressources CPU/GPU.

**Remédiation :** Valider `device` avec une whitelist (`Literal["cpu", "cuda"]`). Plafonner `epochs` (ex. `le=100`). Utiliser les validators Pydantic.

---

### H-5 — Redis sans authentification

**Fichier :** `docker-compose.yml`  
**Type :** CWE-306 — Missing Authentication for Critical Function

Aucun mot de passe Redis n'est configuré ni en local ni en production AWS. Redis stocke les Channel Layers Django Channels (sessions WebSocket) et peut être utilisé comme vecteur de messages arbitraires vers les consommateurs WebSocket.

**Remédiation :** Configurer `requirepass` dans Redis et la clé `password` dans `CHANNEL_LAYERS["CONFIG"]`. En production AWS, utiliser ElastiCache avec auth token.

---

## 🟡 Vulnérabilités Moyennes

---

### M-1 — Énumération d'emails différenciée à la connexion

**Fichier :** `backend/apps/auth/serializers.py`  
**Type :** CWE-204 — Observable Response Discrepancy

```python
except AuthAccount.DoesNotExist:
    raise serializers.ValidationError({"email": "Identifiants incorrects."})
# ...
if not account.check_password(password):
    raise serializers.ValidationError({"password": "Identifiants incorrects."})
```

Bien que les messages soient identiques, l'erreur est rattachée au champ `email` quand l'email n'existe pas, et au champ `password` quand le mot de passe est faux. Un attaquant peut distinguer les deux cas et confirmer l'existence d'un compte.

**Remédiation :** Retourner systématiquement l'erreur sur `non_field_errors` avec le message générique "Identifiants incorrects." sans préciser quel champ est incorrect.

---

### M-2 — Endpoint de reset de mot de passe sans rate limiting personnalisé

**Fichier :** `backend/core/urls.py` (include `django_rest_passwordreset`)  
**Type :** CWE-307 — Brute Force

Le package `django_rest_passwordreset` est inclus sans configuration de rate limiting dédiée. Bien que NGINX applique une limite globale de 5r/m sur `/api/auth/`, les endpoints `/api/auth/password_reset/` ne bénéficient pas d'un throttle applicatif Django et peuvent être atteints via des chemins alternatifs.

**Remédiation :** Configurer `IP_THROTTLE_RATE` dans `DJANGO_REST_PASSWORDRESET` settings et appliquer un throttle Django sur ces endpoints.

---

### M-3 — Rôle utilisateur lu depuis la DB à chaque requête sans mise en cache, mais non vérifié dans le JWT

**Fichier :** `backend/apps/users/models/auth_account.py` — propriété `role`  
**Type :** CWE-284 — Improper Access Control (design concern)

Le rôle est encodé dans le JWT (`access["role"] = primary_role`), mais la vérification des accès (`allowed_roles`) relit le rôle depuis la base de données via la propriété `user.role`. Ce double-tracking peut créer des incohérences temporaires (ex : rôle changé côté DB, token encore valide avec ancien rôle). Plus préoccupant, si une future implémentation lit le rôle depuis le payload JWT au lieu de la DB, une élévation de privilèges serait possible.

**Remédiation :** Documenter explicitement que le rôle du JWT n'est pas utilisé pour les décisions d'accès. Supprimer le claim `role` du JWT ou ajouter une note de sécurité. Toujours résoudre le rôle depuis la DB.

---

### M-4 — WebSocket sans `AllowedHostsOriginValidator` en développement

**Fichier :** `backend/core/asgi.py`  
**Type :** CWE-346 — Origin Validation Error

```python
if not settings.DEBUG:
    websocket_application = AllowedHostsOriginValidator(websocket_application)
```

En mode développement (et si `DEBUG=True` est accidentellement activé en staging), n'importe quelle origine peut se connecter au WebSocket. Un attaquant sur le même réseau peut effectuer une attaque CSRF WebSocket.

**Remédiation :** Appliquer `AllowedHostsOriginValidator` même en développement, ou configurer une liste d'origines autorisées explicite dans tous les environnements.

---

### M-5 — Fichiers média servis sans authentification en local

**Fichiers :** `backend/core/settings.py`, `.nginx/default.conf`  
**Type :** CWE-284 — Improper Access Control

En mode local (sans S3), les fichiers média (`/media/`) sont servis directement par NGINX sans vérification d'authentification. Si des photos de profil ou documents médicaux sont stockés dans ce répertoire, ils sont accessibles sans token.

**Remédiation :** Passer les requêtes media via Django avec vérification d'authentification (ex. `X-Accel-Redirect` + middleware Django), ou s'assurer qu'aucune donnée sensible n'est stockée dans `/media/` non protégé.

---

### M-6 — `SECRET_KEY_ADMIN` vide = fallback silencieux sur `SECRET_KEY`

**Fichier :** `backend/utils/jwt_auth.py`, `backend/apps/auth/serializers.py`  
**Type :** CWE-636 — Not Failing Securely

Si `SECRET_KEY_ADMIN` n'est pas défini, les tokens admin sont signés avec `SECRET_KEY` (ligne `SIGNING_KEY: SECRET_KEY` dans `SIMPLE_JWT`). La séparation des clés admin/user n'est active que si la variable est configurée. Ce comportement n'est pas documenté comme obligatoire en production et peut passer inaperçu.

**Remédiation :** Lever une `ImproperlyConfigured` si `SECRET_KEY_ADMIN` est vide en production (même pattern que `SECRET_KEY`). Documenter l'obligation dans le README de déploiement.

---

## 🔵 Vulnérabilités Faibles

---

### F-1 — `skip_final_snapshot = true` sur RDS en production

**Fichier :** `infra/terraform-plan-b/rds.tf`  
**Type :** Mauvaise pratique opérationnelle / DORA compliance

`skip_final_snapshot = true` signifie que `terraform destroy` supprime la base sans backup final. Si exécuté accidentellement en production, les données patients sont irrécupérables.

**Remédiation :** Passer à `skip_final_snapshot = false` et configurer un `final_snapshot_identifier` en production. Utiliser `prevent_destroy = true` dans le lifecycle.

---

### F-2 — `multi_az = false` sur RDS

**Fichier :** `infra/terraform-plan-b/rds.tf`  
**Type :** Disponibilité / DORA compliance

Une instance RDS single-AZ sans réplication est un single point of failure. En cas de défaillance de la zone AWS, la base est inaccessible.

**Remédiation :** Activer `multi_az = true` en production.

---

### F-3 — Endpoint de modèle personnel expose le chemin du fichier système

**Fichier :** `ai_service/api/routes/finetune.py` — endpoint `GET /{patient_id}/status`  
**Type :** CWE-200 — Information Exposure

```python
model_path = os.path.join(settings.artifacts_dir, "patients", patient_id, f"lstm_personal_{version}.pt")
return FinetuneStatus(..., model_path=model_path)
```

Le chemin absolu du fichier modèle est retourné dans la réponse API. Cela révèle la structure du système de fichiers du conteneur.

**Remédiation :** Ne pas exposer les chemins internes dans les réponses API. Retourner uniquement un identifiant logique.

---

### F-4 — Logs WebSocket incluent l'`id_auth` utilisateur

**Fichier :** `backend/apps/glycemia/consumers.py`  
**Type :** CWE-532 — Insertion of Sensitive Information into Log File

```python
logger.info(f"WebSocket connected: user {self.user.id_auth}")
logger.info(f"WebSocket disconnected: user {self.user.id_auth}, code {close_code}")
```

Les UUIDs des utilisateurs sont loggués en clair à chaque connexion/déconnexion WebSocket. Ces logs peuvent constituer des données personnelles (RGPD) si corrélés avec d'autres informations.

**Remédiation :** Hasher ou tronquer les identifiants dans les logs, ou supprimer ces logs de niveau INFO en production.

---

## Récapitulatif par composant

| Composant | Critiques | Hautes | Moyennes | Faibles |
|-----------|-----------|--------|----------|---------|
| Backend Django | 1 (C-2) | 3 (H-2, H-3, H-5) | 4 (M-1, M-2, M-3, M-6) | 1 (F-4) |
| AI Service FastAPI | 2 (C-2, C-4) | 1 (H-4) | 0 | 1 (F-3) |
| WebSocket | 1 (C-3) | 0 | 2 (M-4, M-5) | 1 (F-4) |
| Infrastructure | 1 (C-1) | 1 (H-1) | 0 | 2 (F-1, F-2) |
| Authentification | 0 | 0 | 1 (M-3) | 0 |

---

## Priorités de remédiation recommandées

**Sprint immédiat (bloquant pour mise en production) :**
1. C-1 : Supprimer le mot de passe RDS du code et utiliser un secret manager
2. C-2 : Supprimer le token `dev_secret` par défaut — lever une exception au démarrage
3. H-1 : Activer HTTPS sur NGINX
4. H-2 : Créer un compte de service dédié avec moindre privilège

**Sprint suivant :**
5. C-3 : Ticket éphémère pour l'authentification WebSocket
6. H-3 : Ajouter rate limiting sur `refresh_token`
7. H-5 : Activer l'authentification Redis

**Backlog sécurité :**
8. C-4 : Signature des artefacts ML
9. M-1 à M-6 : Corrections design/hardening
10. F-1 à F-4 : Bonnes pratiques opérationnelles

---

*Rapport généré par analyse statique — à compléter par des tests dynamiques (DAST) et une revue de pénétration en conditions réelles.*
