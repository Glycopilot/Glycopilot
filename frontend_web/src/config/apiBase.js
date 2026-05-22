export function getApiBase() {
  return (process.env.REACT_APP_API_URL || '').trim().replace(/\/$/, '');
}
