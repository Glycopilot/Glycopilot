# Landing page GlycoPilot

Landing page statique et autonome pour presenter l'application GlycoPilot.

## Ouvrir la page

Ouvrir directement le fichier suivant dans un navigateur :

```text
landing_page/index.html
```

La page reference les assets existants du projet dans `frontend/assets/`.

## Deploiement

La pipeline GitHub Actions `Master Deployment Pipeline` peut deployer la landing page avec l'option :

```text
deploy_landing_page = true
```

Par defaut, le site est publie dans le bucket `S3_BUCKET_FRONTEND`, sous le prefixe :

```text
/landing/
```

Variables repository optionnelles :

- `S3_BUCKET_LANDING_PAGE` : bucket dedie si la landing ne doit pas utiliser le bucket frontend web.
- `S3_LANDING_PREFIX` : chemin S3 voulu, par defaut `landing`.

Pendant le deploiement, la pipeline copie `favicon.png` et `glycopilot.png` depuis `frontend/assets/` dans un dossier `assets/` local a la landing, puis adapte les chemins HTML.

## Fichiers

- `index.html` : structure de la page.
- `styles.css` : design responsive.
- `script.js` : animation canvas de la courbe glycemique et header dynamique.
