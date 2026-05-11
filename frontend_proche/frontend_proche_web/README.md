# GlycoPilot - Frontend Web Proche

Interface web dédiée au profil `proche`.

Objectif : permettre à un proche, un voisin ou une structure d'aide à la personne de surveiller la glycémie d'un patient autorisé et de communiquer avec lui.

## Fonctionnalités

- tableau de bord de surveillance glycémique ;
- code couleur GlycoPilot :
  - vert : valeur dans la cible ;
  - orange : valeur à surveiller ;
  - rouge : hypo/hyperglycémie ;
  - bleu : information ou action standard ;
- courbe glycémique journalière ;
- événements récents et rappels ;
- fiche du patient surveillé ;
- messagerie proche-patient style Messenger ;
- ajout de pièces jointes locales ;
- modification et suppression des messages envoyés par le proche.

## Lancer en local

Depuis la racine du projet :

```bash
cd frontend_proche/frontend_proche_web
npm install
PORT=3003 npm start
```

Puis ouvrir :

```text
http://localhost:3003
```

Cette première version utilise des données locales simulées afin de valider le parcours utilisateur avant branchement backend.
