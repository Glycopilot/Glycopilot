// Ce script vérifie que le nom de la branche respecte les conventions

const { execSync } = require('child_process');

// Récupérer le nom de la branche actuelle
const branchName = execSync('git rev-parse --abbrev-ref HEAD')
  .toString()
  .trim();

// Définir le pattern autorisé
// Format: type/description
// Exemples: feature/login, fix/button-crash, hotfix/security
const branchPattern = /^(feature|fix|hotfix|release|chore)\/[a-z0-9-]+$/;

if (!branchPattern.test(branchName)) {
  console.error(`
❌ Nom de branche invalide: "${branchName}"

Le nom doit suivre ce format: type/description

Types autorisés:
  - feature/  : Nouvelle fonctionnalité
  - fix/      : Correction de bug
  - hotfix/   : Correction urgente
  - release/  : Préparation de release
  - chore/    : Tâches techniques

Exemples valides:
  ✅ feature/user-authentication
  ✅ fix/login-button
  ✅ hotfix/security-patch

Exemples invalides:
  ❌ Feature/Login (majuscule)
  ❌ my-branch (pas de type)
  ❌ feature/Login_Page (underscore)
  `);
  process.exit(1);
}

console.log(`✅ Nom de branche valide: ${branchName}`);