# GlycoPilot - Frontends Proche

Ce dossier regroupe les interfaces dédiées au profil `proche`.

Un proche peut être un membre de la famille, un voisin ou une structure d'aide à la personne. Son objectif est de surveiller la glycémie d'un patient autorisé et de communiquer avec lui.

## Structure

```text
frontend_proche/
├── frontend_proche_web/
└── frontend_proche_mobile/
```

## Web

```bash
cd frontend_proche/frontend_proche_web
npm install
PORT=3003 npm start
```

## Mobile

```bash
cd frontend_proche/frontend_proche_mobile
npm install
npm start
```

La version actuelle utilise des données locales simulées pour valider le parcours avant branchement backend.
