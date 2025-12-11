// Ce script vérifie que le nom de la branche respecte les conventions

const { execSync } = require("child_process");

// Récupérer le nom de la branche actuelle
const branchName = execSync("git rev-parse --abbrev-ref HEAD")
  .toString()
  .trim();

// Définir le pattern autorisé
// Format: type/description ou type-description
// Exemples: feature/login, fix/button-crash, hotfix/security, feat-dashboard
const branchPattern =
  /^(feat-front|feat-back|feat|fix|hotfix|release|refactor|docs|test|chore)[\/\-][a-z0-9-]+$/;

if (!branchPattern.test(branchName)) {
  console.error(`
❌ Nom de branche invalide: "${branchName}"

Le nom doit suivre ce format: type/description

Types autorisés:
  - feat-front/  : Nouvelle fonctionnalité front-end
  - feat-back/   : Nouvelle fonctionnalité back-end
  - feat/        : Nouvelle fonctionnalité générale
  - fix/         : Correction de bug
  - hotfix/      : Correction urgente
  - release/     : Préparation de versions
  - refactor/    : Refactorisation
  - docs/        : Documentation
  - test/        : Tests
  - chore/       : Tâches techniques

Exemples valides:
  ✅ feat-front/user-authentication
  ✅ feat-back/api-endpoint
  ✅ feat-dashboard
  ✅ fix/login-button
  ✅ hotfix/security-patch
  ✅ release/v1.2.0
  ✅ refactor/code-cleanup
  ✅ docs/api-documentation
  ✅ test/unit-tests

Exemples invalides:
  ❌ Feature/Login (majuscule)
  ❌ my-branch (pas de type)
  ❌ feature/Login_Page (underscore)
  `);
  process.exit(1);
}

console.log(`✅ Nom de branche valide: ${branchName}`);
