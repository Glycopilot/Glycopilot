/**
 * Simple navigation ref to allow navigation from outside components (e.g. App.tsx).
 * The AppNavigator sets this when it mounts.
 */
let _navigate: ((screen: string) => void) | null = null;

export function setNavigate(fn: (screen: string) => void) {
  _navigate = fn;
}

export function navigate(screen: string) {
  _navigate?.(screen);
}
