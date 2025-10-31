# Authentification & Profil

## Objectifs métier

- Garantir un accès sécurisé aux modules F02/F03.
- Permettre à l’utilisateur de configurer unités, seuils personnels et plages de silence.
- Préparer les données nécessaires aux widgets personnalisés.

## Tables concernées

| Table MPC | Colonnes utiles | Actions |
| --- | --- | --- |
| `USERS` | `user_id`, `email`, `password`, `first_name`, `last_name`, `phone_number`, `birth_date`, `adress`, `medical_comment`, `actif`, `created_at`, `medical_id` | Ajouter `unit`, `low_threshold`, `high_threshold`, `quiet_hours_start`, `quiet_hours_end`, `quiet_hours_critical`, `role_cache` |
| `PROFILS`, `USERS_PROFILS` | Rôles associés | Lecture seule |
| `CONTACT` | Contacts d’urgence | (consommé par d’autres modules) |

Migrations à prévoir : ajout des colonnes dans `USERS`, index sur `email`, champs booléens, valeurs par défaut.

## Endpoints

### `POST /api/v1/auth/token`

- **Usage** : renouvellement JWT à partir d’un refresh.
- **Headers** : `Content-Type: application/json`
- **Body** : `{ "refreshToken": "string" }`
- **Réponse 200** : `{ "accessToken": "string", "expiresIn": 3600 }`
- **Validations** : refresh Token non expiré, signature valide, utilisateur actif.
- **Erreurs** : `401` (token invalide), `403` (user inactif), `429` (trop de tentatives).

### `POST /api/v1/auth/logout`

- **Usage** : invalider l’access token et fermer les WebSockets.
- **Réponse 204** : pas de contenu.
- **Traitement** : stocker token dans table `revoked_tokens` ou cache Redis avec TTL.

### `GET /api/v1/user/profile`

- **Usage** : alimenter les écrans profil et personnalisation.
- **Réponse 200** :
  ```json
  {
    "userId": "uuid",
    "displayName": "John Doe",
    "email": "john@example.com",
    "unit": "mg/dL",
    "lowThreshold": 70,
    "highThreshold": 180,
    "createdAt": "2025-10-31T08:10:00Z",
    "role": "patient"
  }
  ```
- **Persistance** : lecture `USERS`, optionnellement `USERS_PROFILS` pour exposer `roles`.

### `PATCH /api/v1/user/profile`

- **Usage** : modifier nom, unité, téléphone, commentaire médical.
- **Body** : champs partiels (`displayName`, `unit`, `phoneNumber`, `medicalComment`).
- **Validations** : unité ∈ {`mg/dL`, `mmol/L`} ; `phoneNumber` format E.164.
- **Persistance** : update `USERS`.

### `GET /api/v1/user/preferences`

- **Usage** : récupérer seuils et plages silencieuses pour configurer alertes.
- **Réponse 200** :
  ```json
  {
    "glucose": { "low": 70, "high": 180 },
    "quietHours": {
      "enabled": true,
      "start": "22:00",
      "end": "06:00",
      "allowCritical": true
    }
  }
  ```
- **Persistance** : champs `USERS.low_threshold`, `USERS.high_threshold`, `USERS.quiet_hours_start`, etc.

### `PATCH /api/v1/user/preferences`

- **Validations** : `low < high`, plage silencieuse ne couvre pas 24 h complète, `start`/`end` format HH:mm.
- **Erreurs** : `400` plage invalide, `409` conflit (utilisateur sous régime médical spécial).

## Détails de développement

- Créer des sérialiseurs dédiés (ex. `ProfileSerializer`, `PreferencesSerializer`).
- Centraliser la logique d’unité et de seuils dans un service (`services/user_preferences.py`).
- Prévoir une tâche pour recalculer les alertes si les seuils changent (mise à jour `USER_ALERTS`).
- Mettre en place la table `revoked_tokens` (ou Redis) pour gérer le logout.
- Mettre en cache le rôle (champ `role_cache` ou claim JWT) pour éviter les jointures fréquentes sur `USERS_PROFILS`.

## Tests recommandés

- **Unitaires** : validations des sérialiseurs (unités, plages, formats). Tests de service refresh.
- **Intégration** :
  - Auth token → accès à `/user/profile` → patch → relecture.
  - Modification des seuils → vérification base (`USERS`).
- **Security** : tentative d’accès sans token (`401`), avec rôle inadapté (`403`).

## Décisions & hypothèses

- Les rôles (`patient`, `clinician`, `admin`) seront exposés dans la réponse profil si la donnée `PROFILS` est pertinente pour le front.
- Les plages silencieuses sont stockées en UTC. Le front convertit selon fuseau utilisateur.
- La vérification de permissions utilise le rôle principal (`role_cache`) ; si un utilisateur possède plusieurs profils, définir une règle de priorité (ex. `admin` > `doctor` > `patient`).

