# Correctifs de sécurité — Glycopilot

## Résumé

Ce document décrit les correctifs de sécurité appliqués au projet Glycopilot dans la branche `fix/security-issues`.

---

## 1. Rate limiting (protection brute-force)

**Fichiers modifiés :**
- `backend/core/settings.py`
- `backend/apps/auth/views.py`
- `backend/utils/throttles.py` (nouveau)
- `.nginx/default.conf`

**Problème :** Aucune limite de requêtes sur les endpoints d'authentification. Un attaquant pouvait tenter un nombre illimité de connexions.

**Correctif :**
- Ajout de throttling DRF global : 100 req/h pour les anonymes, 1000 req/h pour les utilisateurs authentifiés
- Ajout d'un throttle `AuthRateThrottle` (5 req/min) sur les endpoints `login` et `register`
- Ajout de `limit_req_zone` dans nginx : 10 req/s global, 5 req/min sur `/api/auth/`

---

## 2. Headers de sécurité HTTP

**Fichiers modifiés :**
- `.nginx/default.conf`
- `backend/core/settings.py`

**Problème :** Aucun header de sécurité HTTP n'était configuré, exposant l'application au clickjacking, XSS, MIME sniffing, etc.

**Correctif nginx :**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (caméra, micro, géolocalisation désactivés)
- `Content-Security-Policy` restrictive
- `server_tokens off` (masquer la version nginx)

**Correctif Django (production) :**
- `SECURE_SSL_REDIRECT = True`
- `SECURE_HSTS_SECONDS = 31536000` (1 an)
- `SECURE_HSTS_INCLUDE_SUBDOMAINS = True`
- `SECURE_HSTS_PRELOAD = True`
- `SECURE_BROWSER_XSS_FILTER = True`
- `SECURE_CONTENT_TYPE_NOSNIFF = True`
- `X_FRAME_OPTIONS = "DENY"`

---

## 3. Cookies sécurisés (production)

**Fichier modifié :** `backend/core/settings.py`

**Problème :** Les cookies de session et CSRF n'avaient pas les flags `Secure`, `HttpOnly` et `SameSite`.

**Correctif (activé uniquement hors DEBUG) :**
- `SESSION_COOKIE_SECURE = True`
- `SESSION_COOKIE_HTTPONLY = True`
- `SESSION_COOKIE_SAMESITE = "Strict"`
- `CSRF_COOKIE_SECURE = True`
- `CSRF_COOKIE_HTTPONLY = True`
- `CSRF_COOKIE_SAMESITE = "Strict"`

---

## 4. Renforcement des mots de passe

**Fichiers modifiés :**
- `backend/apps/auth/serializers.py`
- `backend/core/settings.py`

**Problème :** Mot de passe minimum de 8 caractères sans aucune règle de complexité.

**Correctif :**
- Minimum porté à **12 caractères** (register + admin)
- Ajout de `AUTH_PASSWORD_VALIDATORS` Django :
  - Similarité avec les attributs utilisateur
  - Longueur minimum (12)
  - Mots de passe communs interdits
  - Mots de passe entièrement numériques interdits
- Appel à `validate_password()` dans le serializer `RegisterSerializer`

---

## 5. Validation des entrées (glycemia)

**Fichier modifié :** `backend/apps/glycemia/views.py`

**Problème :** Le paramètre `days` était converti avec `int()` sans try/except. Une valeur non-numérique provoquait une erreur 500 avec stack trace.

**Correctif :** Ajout d'un bloc `try/except (ValueError, TypeError)` avec retour d'une erreur 400 propre.

---

## 6. Sécurisation de l'entrypoint Docker

**Fichier modifié :** `backend/entrypoint.sh`

**Problème :**
- Credentials DB en dur dans les valeurs par défaut
- Mots de passe potentiellement affichés dans les logs via `set -x`
- Le fallback Python utilisait des credentials interpolés dans le script

**Correctif :**
- `set +x` en début de script pour éviter l'affichage des commandes
- En **production** (`Django_ENV=production`) : les variables DB sont obligatoires, crash si non définies
- En **développement** : les defaults sont conservés pour ne pas casser le workflow local
- Le fallback Python lit `os.environ.get()` au lieu d'interpoler directement dans le script

---

## 7. Dépendances

**Fichier modifié :** `backend/requirements.txt`

**Problème :**
- `django-rest-passwordreset>=1.3.0` : version flottante, risque de breaking changes
- `requests==2.31.0` dupliqué

**Correctif :**
- Version pinée à `django-rest-passwordreset==1.4.1`
- Suppression du doublon `requests`

---

## 8. Sécurisation JWT — algorithme fixé

**Fichier modifié :** `backend/utils/jwt_auth.py`

**Problème :** L'algorithme JWT pour la clé admin était lu dynamiquement via `getattr(api_settings, "ALGORITHM", "HS256")`. Une attaque par confusion d'algorithme (ex: forcer RS256 avec une clé publique) pouvait compromettre la validation.

**Correctif :**
- Algorithme fixé en dur à `["HS256"]` dans le `jwt.decode()` de la clé admin
- Ajout de logging sur les erreurs inattendues de validation de token (au lieu de `except Exception: pass` silencieux)

---

## 9. Authentification WebSocket renforcée

**Fichier modifié :** `backend/apps/glycemia/middleware.py`

**Problème :** Quand un token WebSocket était invalide ou absent, le middleware retournait `AnonymousUser()` et laissait la connexion s'établir. Même si le consumer rejetait ensuite l'anonyme, la connexion était brièvement ouverte.

**Correctif :**
- Le middleware retourne `None` au lieu de `AnonymousUser()` en cas d'échec
- Rejet immédiat de la connexion WebSocket (code 4001) directement dans le middleware, avant même d'atteindre le consumer

---

## 10. Configuration CORS renforcée

**Fichier modifié :** `backend/core/settings.py`

**Problème :** `CORS_ALLOW_CREDENTIALS` n'était pas défini explicitement et `CSRF_TRUSTED_ORIGINS` n'était pas configuré.

**Correctif :**
- Ajout de `CORS_ALLOW_CREDENTIALS = True`
- Ajout de `CSRF_TRUSTED_ORIGINS` en production (utilise la même liste que `CORS_ALLOWED_ORIGINS`)

---

## 11. Suppression de données sensibles des API responses

**Fichiers modifiés :**
- `backend/apps/glycemia/serializers.py`
- `backend/apps/profiles/serializers.py`

**Problème :**
- Le serializer `GlycemiaSerializer` exposait `user_email` dans chaque réponse de glycémie
- Le serializer `ProfileSerializer` exposait le champ `is_active` (fuite d'information sur l'état des comptes)

**Correctif :**
- Suppression de `user_email` du `GlycemiaSerializer`
- Suppression de `is_active` du `ProfileSerializer`

---

## 12. URL admin Django configurable

**Fichier modifié :** `backend/core/urls.py`

**Problème :** Le panel admin Django était accessible sur le chemin prévisible `/admin/`, facilitant les attaques ciblées.

**Correctif :**
- L'URL admin est maintenant configurable via la variable d'environnement `ADMIN_URL` (défaut : `admin`)
- En production, il suffit de définir `ADMIN_URL=mon-chemin-secret` dans le `.env`

---

## 13. Sécurisation du frontend web

**Fichier modifié :** `frontend_web/src/services/authService.js`

**Problèmes :**
- `console.error()` loguait des données de réponse sensibles (stack traces, détails d'erreur)
- L'objet `user` complet (avec toutes les données imbriquées) était stocké en JSON dans `localStorage`

**Correctifs :**
- Suppression des `console.error` / `console.warn` qui exposaient des données
- Stockage minimal dans `localStorage` : seulement `user_id` et `user_email` au lieu de l'objet complet
- Mise à jour de `getStoredUser()` pour reconstruire un objet minimal depuis les clés séparées
- Nettoyage cohérent de toutes les clés localStorage au logout et au refresh fail

---

## Actions manuelles restantes (non corrigées par cette branche)

> Ces points nécessitent une intervention manuelle de l'équipe.

### Rotation des secrets exposés
Le fichier `.env` a été commité dans l'historique git avec des secrets en clair (SECRET_KEY Django, mots de passe DB, credentials SMTP Gmail). Il faut :
1. **Révoquer immédiatement** : changer le mot de passe app Gmail, les mots de passe DB, régénérer les SECRET_KEY
2. **Nettoyer l'historique git** avec `git filter-branch` ou [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
3. Vérifier que `.env` est bien dans `.gitignore`

### HTTPS
Le serveur nginx écoute uniquement en HTTP (port 80). En production, il faut configurer un certificat SSL/TLS (Let's Encrypt ou autre) et forcer la redirection HTTP -> HTTPS.

### Stockage des tokens frontend
Les tokens JWT sont toujours stockés dans `localStorage`, vulnérable aux attaques XSS. La migration vers des cookies `HttpOnly` nécessite des changements côté backend (set-cookie) et frontend. Ce changement est invasif et devrait être planifié séparément.
