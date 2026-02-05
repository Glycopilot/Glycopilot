export const colors = {
  // Primaires
  primary: '#1D4EFF',
  primaryLight: '#0080ff',
  primaryDark: '#0f4dddff',

  // Secondaires
  secondary: '#1d8de9ff',

  // Backgrounds
  backgroundColor: '#fff',
  lightBg: '#e1eaffff',

  // Texte
  textPrimary: '#333',
  textSecondary: '#555',
  textMuted: '#666',

  // Statuts
  success: '✓',
  error: '✗',
  errorRed: '#ff6b6bff',

  // Bordures
  border: '#ddd',

  // Autres
  transparent: 'transparent',
} as const;

export type ColorKeys = keyof typeof colors;
