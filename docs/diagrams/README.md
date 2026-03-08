# Diagrams

Ce dossier centralise les schémas d'architecture du projet.

## Fichiers

- `technical-architecture.puml` : vue technique (composants, flux API/WS, DB, Redis).
- `technical-architecture.drawio` : version éditable visuelle de la vue technique.
- `functional-architecture.puml` : vue fonctionnelle (acteurs et cas d'usage).
- `functional-architecture.drawio` : version éditable visuelle de la vue fonctionnelle.

## Convention de nommage

- Format recommandé : `<type>-architecture.<ext>`
- `type` : `technical`, `functional`, `deployment`, `sequence`, etc.
- Extensions :
  - `.puml` pour PlantUML (source texte versionnable)
  - `.drawio` pour diagrams.net (édition visuelle)

Exemples :
- `deployment-architecture.puml`
- `auth-sequence.puml`
- `alerts-sequence.drawio`

## Rendu PlantUML

Depuis la racine du repo :

```bash
plantuml docs/diagrams/technical-architecture.puml
plantuml docs/diagrams/functional-architecture.puml
```

Pour générer tous les `.puml` du dossier :

```bash
plantuml docs/diagrams/*.puml
```

## Bonnes pratiques

- Garder une cohérence entre `.puml` et `.drawio` pour un même schéma.
- Faire des commits atomiques : un schéma (ou un objectif) par commit.
- Préférer des messages de commit explicites, par exemple :
  - `docs(architecture): add deployment architecture diagram`
  - `docs(architecture): update technical architecture flows`
