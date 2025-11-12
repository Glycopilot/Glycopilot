# API d'Authentification - Glycopilot Backend

## Vue d'ensemble

Le backend Glycopilot dispose d'un système d'authentification complet basé sur JWT (JSON Web Tokens) avec les fonctionnalités suivantes :
- Inscription de nouveaux utilisateurs
- Connexion avec email/mot de passe
- Génération de tokens JWT (access + refresh)
- Rafraîchissement du token d'accès
- Déconnexion
- Récupération des informations utilisateur

## Configuration

### Dépendances installées
- `Django==4.2.7`
- `djangorestframework==3.14.0`
- `djangorestframework-simplejwt==5.3.1`
- `django-cors-headers==4.3.1`

### Modèle User

Le modèle utilisateur (`backend/models/user.py`) hérite de `AbstractBaseUser` et `PermissionsMixin` de Django et inclut :

**Champs :**
- `email` : EmailField unique (utilisé comme identifiant)
- `first_name` : Prénom de l'utilisateur
- `last_name` : Nom de l'utilisateur
- `password` : Mot de passe hashé avec bcrypt
- `is_active` : Statut actif/inactif
- `is_staff` : Accès à l'admin Django
- `is_superuser` : Droits superutilisateur
- `created_at` : Date de création
- `updated_at` : Date de dernière modification

**Méthodes :**
- `set_password(raw_password)` : Hash et définit le mot de passe
- `check_password(raw_password)` : Vérifie le mot de passe

### Configuration JWT

Configuration dans `backend/settings.py` :

```python
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": False,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "AUTH_HEADER_TYPES": ("Bearer",),
}
```

## Endpoints API

Base URL : `http://localhost:8006/api/auth`

### 1. Inscription (Register)

**Endpoint :** `POST /api/auth/register`

**Body :**
```json
{
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "password": "securepassword123",
  "password_confirm": "securepassword123"
}
```

**Validation :**
- Email : doit être unique et valide
- Prénom/Nom : requis
- Mot de passe : minimum 8 caractères
- Les deux mots de passe doivent correspondre

**Response 201 (Success) :**
```json
{
  "access": "<ACCESS_TOKEN>",
  "refresh": "<REFRESH_TOKEN>",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "created_at": "2025-11-05T21:00:00Z"
  }
}
```

**Response 400 (Error) :**
```json
{
  "email": ["Cet email est déjà utilisé."],
  "password_confirm": ["Les mots de passe ne correspondent pas."]
}
```

### 2. Connexion (Login)

**Endpoint :** `POST /api/auth/login`

**Body :**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response 200 (Success) :**
```json
{
  "access": "<ACCESS_TOKEN>",
  "refresh": "<REFRESH_TOKEN>",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "created_at": "2025-11-05T21:00:00Z"
  }
}
```

**Response 400 (Error) :**
```json
{
  "email": ["Identifiants incorrects."],
  "password": ["Identifiants incorrects."]
}
```

### 3. Rafraîchir le Token (Refresh)

**Endpoint :** `POST /api/auth/refresh`

**Body :**
```json
{
  "refresh": "<REFRESH_TOKEN>"
}
```

**Response 200 (Success) :**
```json
{
  "access": "<ACCESS_TOKEN>"
}
```

**Response 401 (Error) :**
```json
{
  "error": "Token invalide ou expiré."
}
```

### 4. Déconnexion (Logout)

**Endpoint :** `POST /api/auth/logout`

**Headers :**
```
Authorization: Bearer <access_token>
```

**Body :**
```json
{
  "refresh": "<REFRESH_TOKEN>"
}
```

**Response 200 (Success) :**
```json
{
  "message": "Déconnexion réussie."
}
```

**Note :** Le refresh token est blacklisté et ne peut plus être utilisé.

### 5. Informations Utilisateur (Me)

**Endpoint :** `GET /api/auth/me`

**Headers :**
```
Authorization: Bearer <access_token>
```

**Response 200 (Success) :**
```json
{
  "id": 1,
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "created_at": "2025-11-05T21:00:00Z"
}
```

**Response 401 (Unauthorized) :**
```json
{
  "detail": "Authentication credentials were not provided."
}
```

## Utilisation des Tokens

### Access Token
- Durée de vie : **1 heure**
- À inclure dans le header `Authorization` de chaque requête protégée
- Format : `Authorization: Bearer <access_token>`

### Refresh Token
- Durée de vie : **7 jours**
- Utilisé pour obtenir un nouveau access token sans se reconnecter
- À conserver de manière sécurisée côté client

### Flow d'authentification recommandé

1. **Première connexion :**
   - Appeler `/api/auth/login` ou `/api/auth/register`
   - Stocker les tokens `access` et `refresh` de manière sécurisée

2. **Requêtes API :**
   - Inclure l'access token dans le header de chaque requête
   - Format : `Authorization: Bearer <access_token>`

3. **Token expiré :**
   - Si une requête retourne 401, l'access token est expiré
   - Appeler `/api/auth/refresh` avec le refresh token
   - Obtenir un nouveau access token
   - Réessayer la requête initiale

4. **Déconnexion :**
   - Appeler `/api/auth/logout` avec le refresh token
   - Supprimer les tokens du stockage local

## Exemple avec cURL

### Inscription
```bash
curl -X POST http://localhost:8006/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "first_name": "Test",
    "last_name": "User",
    "password": "password123",
    "password_confirm": "password123"
  }'
```

### Connexion
```bash
curl -X POST http://localhost:8006/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Requête protégée
```bash
curl -X GET http://localhost:8006/api/auth/me \
  -H "Authorization: Bearer <votre_access_token>"
```

### Rafraîchir le token
```bash
curl -X POST http://localhost:8006/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh": "<votre_refresh_token>"
  }'
```

## Exemple avec JavaScript (Axios)

```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8006/api';

// Inscription
async function register(userData) {
  const response = await axios.post(`${API_BASE_URL}/auth/register`, {
    email: userData.email,
    first_name: userData.firstName,
    last_name: userData.lastName,
    password: userData.password,
    password_confirm: userData.passwordConfirm
  });

  // Stocker les tokens
  localStorage.setItem('access_token', response.data.access);
  localStorage.setItem('refresh_token', response.data.refresh);

  return response.data;
}

// Connexion
async function login(email, password) {
  const response = await axios.post(`${API_BASE_URL}/auth/login`, {
    email,
    password
  });

  localStorage.setItem('access_token', response.data.access);
  localStorage.setItem('refresh_token', response.data.refresh);

  return response.data;
}

// Configuration d'axios avec intercepteur pour le token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur pour gérer le refresh automatique
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh: refreshToken
        });

        localStorage.setItem('access_token', response.data.access);
        originalRequest.headers.Authorization = `Bearer ${response.data.access}`;

        return axios(originalRequest);
      } catch (err) {
        // Refresh token invalide, déconnecter l'utilisateur
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

// Obtenir les infos utilisateur
async function getCurrentUser() {
  const response = await axios.get(`${API_BASE_URL}/auth/me`);
  return response.data;
}

// Déconnexion
async function logout() {
  const refreshToken = localStorage.getItem('refresh_token');
  await axios.post(`${API_BASE_URL}/auth/logout`, {
    refresh: refreshToken
  });

  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}
```

## Sécurité

### Bonnes pratiques implémentées :
- ✅ Mots de passe hashés avec bcrypt (via Django)
- ✅ Tokens JWT signés avec HMAC-SHA256
- ✅ Validation email unique
- ✅ Validation longueur mot de passe (min 8 caractères)
- ✅ CORS configuré (actuellement en mode développement : all origins)
- ✅ Refresh token pour limiter l'exposition de l'access token

### Recommandations pour la production :
- 🔒 Configurer CORS pour n'autoriser que les domaines spécifiques
- 🔒 Utiliser HTTPS uniquement
- 🔒 Augmenter les exigences de complexité du mot de passe
- 🔒 Implémenter le rate limiting sur les endpoints d'authentification
- 🔒 Activer le blacklisting des refresh tokens
- 🔒 Ajouter l'authentification à deux facteurs (2FA)
- 🔒 Changer la SECRET_KEY en production
- 🔒 Mettre DEBUG=False en production

## Tests

Pour tester l'API, vous pouvez :

1. **Démarrer le backend avec Docker :**
   ```bash
   docker-compose up backend
   ```

2. **Créer un utilisateur via l'API :**
   ```bash
   curl -X POST http://localhost:8006/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","first_name":"Test","last_name":"User","password":"testpass123","password_confirm":"testpass123"}'
   ```

3. **Se connecter :**
   ```bash
   curl -X POST http://localhost:8006/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"testpass123"}'
   ```

## Structure des fichiers

```
backend/
├── models/
│   ├── user.py                    # Modèle User avec authentification
│   └── migrations/
│       ├── 0001_initial.py
│       └── 0002_update_user_auth.py
├── serializers/
│   ├── auth_serializer.py         # Serializers pour auth (Register, Login, etc.)
│   └── __init__.py
├── controllers/
│   ├── auth_controller.py         # Contrôleurs pour les endpoints auth
│   └── __init__.py
├── settings.py                    # Configuration Django + JWT
├── routes.py                      # Routes de l'API
└── requirements.txt               # Dépendances Python
```

## Support

Pour toute question ou problème :
- Consulter la documentation Django REST Framework : https://www.django-rest-framework.org/
- Consulter la documentation Simple JWT : https://django-rest-framework-simplejwt.readthedocs.io/
