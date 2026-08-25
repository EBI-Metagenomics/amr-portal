const COOKIE_NAME = 'cookies-accepted';
const DECISION_PATTERN = /cookies-accepted=(true|false)/i;

/** Cookie path scoped to the data SPA (Vite base), not the whole portal. */
function cookiePath(): string {
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/') ? base.slice(0, -1) || '/' : base;
}

export function hasCookieDecision(): boolean {
  if (typeof document === 'undefined') return true;
  return DECISION_PATTERN.test(document.cookie);
}

export function setCookiesAccepted(accepted: boolean): void {
  if (typeof document === 'undefined') return;
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = `${COOKIE_NAME}=${accepted ? 'true' : 'false'};expires=${expires.toUTCString()};path=${cookiePath()}`;
}
