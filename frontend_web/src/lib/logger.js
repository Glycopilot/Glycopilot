const isDev = process.env.NODE_ENV !== 'production';

export const devLog = (...args) => { if (isDev) console.log(...args); };
export const devWarn = (...args) => { if (isDev) console.warn(...args); };
export const devError = (...args) => { if (isDev) console.error(...args); };
