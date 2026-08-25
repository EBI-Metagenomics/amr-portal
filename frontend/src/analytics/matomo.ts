import { getMatomoConfig, isMatomoEnabled } from '@/config/appEnv';

declare global {
  interface Window {
    _paq?: unknown[][];
  }
}

const COOKIES_ACCEPTED_TRUE = /cookies-accepted=true/i;

let initialized = false;

function push(...args: unknown[]): void {
  if (typeof window === 'undefined') return;
  window._paq = window._paq || [];
  window._paq.push(args);
}

export function hasAnalyticsConsent(): boolean {
  if (typeof document === 'undefined') return false;
  return COOKIES_ACCEPTED_TRUE.test(document.cookie);
}

/** Load Matomo when the master switch is on. Always requires consent (hmmer-style). */
export function initMatomo(): void {
  if (initialized || typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!isMatomoEnabled()) return;

  const { url, siteId, scriptUrl } = getMatomoConfig();
  initialized = true;

  window._paq = window._paq || [];
  push('requireConsent');
  if (hasAnalyticsConsent()) {
    push('setConsentGiven');
  }
  push('setTrackerUrl', `${url}/matomo.php`);
  push('setSiteId', siteId);
  push('enableLinkTracking');
  push('trackPageView');

  const script = document.createElement('script');
  script.async = true;
  script.src = scriptUrl;
  const first = document.getElementsByTagName('script')[0];
  first?.parentNode?.insertBefore(script, first);
}

export function grantMatomoConsent(): void {
  if (!isMatomoEnabled()) return;
  push('setConsentGiven');
}

export function trackPageView(customUrl?: string, documentTitle?: string): void {
  if (!isMatomoEnabled() || !hasAnalyticsConsent()) return;
  if (customUrl) push('setCustomUrl', customUrl);
  if (documentTitle) push('setDocumentTitle', documentTitle);
  push('trackPageView');
}

export function trackEvent(
  category: string,
  action: string,
  name?: string,
  value?: number
): void {
  if (!isMatomoEnabled() || !hasAnalyticsConsent()) return;
  if (name !== undefined && value !== undefined) {
    push('trackEvent', category, action, name, value);
    return;
  }
  if (name !== undefined) {
    push('trackEvent', category, action, name);
    return;
  }
  push('trackEvent', category, action);
}
