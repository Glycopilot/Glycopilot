module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // Nouvelle fonctionnalité
        'fix',      // Correction de bug
        'docs',     // Documentation
        'style',    // Formatage, pas de changement de code
        'refactor', // Refactorisation
        'perf',     // Amélioration de performance
        'test',     // Ajout/modification de tests
        'chore',    // Tâches techniques
        'revert',   // Annulation d'un commit
      ],
    ],
    'subject-case': [2, 'never', ['upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 250],
  },
};