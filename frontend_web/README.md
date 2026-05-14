# Glycopilot — Frontend Web

Interface web médecin de Glycopilot. Bootstrapée avec Create React App.

## Prérequis

- Node.js 18+
- npm 9+

## Installation

```bash
npm install
```

## Scripts

| Commande | Description |
| --- | --- |
| `npm start` | Lance le serveur de dev sur http://localhost:3000 |
| `npm test` | Lance Jest en mode watch |
| `npm run test:ci` | Lance la suite complète sans watcher (CI) |
| `npm run build` | Génère un build de production dans `build/` |

## Variables d'environnement

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `REACT_APP_API_URL` | `http://localhost:8006/api` | URL de base de l'API Django |
| `REACT_APP_API_TIMEOUT` | `10000` | Timeout des requêtes axios (ms) |
| `HOST` | `0.0.0.0` | Interface d'écoute du dev server (utile en Docker) |
| `PORT` | `3000` | Port du dev server |
| `BROWSER` | `none` | Désactive l'ouverture automatique du navigateur |
| `WATCHPACK_POLLING` | `true` | Active le polling de fichiers (nécessaire sous Docker / WSL) |

Un fichier `.env` à la racine du module fournit les valeurs par défaut pour le dev local. Pour des overrides personnels non commités, utilisez `.env.local`.

## Stack

- React 18
- react-scripts 5 (CRA)
- axios pour les appels HTTP
- lucide-react pour les icônes
- react-toastify pour les notifications
- Testing Library + Jest pour les tests
