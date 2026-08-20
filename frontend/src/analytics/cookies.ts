import { PORTAL_PREFIX } from '@/config/appEnv';

const COOKIE_NAME = 'cookies-accepted';
const DECISION_PATTERN = /cookies-accepted=(true|false)/i;

export function hasCookieDecision(): boolean {
  if (typeof document === 'undefined') return true;
  return DECISION_PATTERN.test(document.cookie);
}

export function setCookiesAccepted(accepted: boolean): void {
  if (typeof document === 'undefined') return;
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  const path = PORTAL_PREFIX || '/';
  document.cookie = `${COOKIE_NAME}=${accepted ? 'true' : 'false'};expires=${expires.toUTCString()};path=${path}`;
}
