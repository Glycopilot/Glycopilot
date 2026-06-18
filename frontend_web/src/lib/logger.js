// Évalué à chaque appel — sinon la valeur capturée à l'import reste figée
// (problématique pour les tests qui basculent NODE_ENV à chaud).
const isDev = () => process.env.NODE_ENV !== 'production';

export const devLog   = (...args) => { if (isDev()) console.log(...args); };
export const devWarn  = (...args) => { if (isDev()) console.warn(...args); };
export const devError = (...args) => { if (isDev()) console.error(...args); };
