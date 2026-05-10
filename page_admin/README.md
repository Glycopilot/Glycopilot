# Page admin GlycoPilot

Page statique autonome pour valider ou refuser les profils medecins en attente.

## Lancer la page

Depuis la racine du projet :

```bash
cd page_admin
python3 -m http.server 5501
```

Puis ouvrir :

```text
http://localhost:5501
```

## Prerequis

Le backend Django doit tourner sur :

```text
http://localhost:8006
```

La page utilise par defaut :

```text
http://localhost:8006/api
```

## Compte local de test

Si la base locale contient le superadmin de developpement :

```text
superadmin@example.com
StrongPass123!
```

## Endpoints utilises

- `POST /api/auth/login/`
- `GET /api/doctors/verification/`
- `POST /api/doctors/verification/<doctor_id>/accept/`
- `POST /api/doctors/verification/<doctor_id>/decline/`
