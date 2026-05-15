let handler = () => {
  if (typeof window !== 'undefined') window.location.href = '/login';
};

export function registerAuthRedirect(fn) {
  handler = fn;
}

export function triggerAuthRedirect() {
  handler();
}
