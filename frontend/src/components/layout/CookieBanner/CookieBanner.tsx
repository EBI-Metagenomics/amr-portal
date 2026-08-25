import { useState } from 'react';
import { isMatomoEnabled } from '@/config/appEnv';
import { hasCookieDecision, setCookiesAccepted } from '@/analytics/cookies';
import { grantMatomoConsent } from '@/analytics/matomo';
import styles from './CookieBanner.module.css';

const privacyNoticeHref =
  'https://ftp.ebi.ac.uk/pub/databases/metagenomics/media/privacy-notice.pdf;

const CookieBanner = () => {
  const [display, setDisplay] = useState(
    () => isMatomoEnabled() && typeof document !== 'undefined' && !hasCookieDecision()
  );

  if (!display) return null;

  const handleAccept = () => {
    setCookiesAccepted(true);
    grantMatomoConsent();
    setDisplay(false);
  };

  const handleReject = () => {
    setCookiesAccepted(false);
    setDisplay(false);
  };

  return (
    <div className={`vf-banner vf-banner--fixed vf-banner--bottom vf-banner--notice ${styles.root}`}>
      <div className="vf-banner__content">
        <p className={`vf-banner__text vf-banner__text--lg ${styles.text}`}>
          This site uses cookies. We use essential cookies for site functionality, and non-essential
          cookies to help improve the service using Matomo analytics. No data is shared with third
          parties for advertising. See our{' '}
          <a className="vf-banner__link" href={privacyNoticeHref}>
            Privacy Notice
          </a>{' '}
          and{' '}
          <a className="vf-banner__link" href="//www.ebi.ac.uk/about/terms-of-use">
            Terms Of Use
          </a>
          .
        </p>
        <div className={styles.actions}>
          <button className="vf-button vf-button--primary" onClick={handleAccept} type="button">
            Accept all
          </button>
          <button className="vf-button vf-button--secondary" onClick={handleReject} type="button">
            Reject non-essential
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
