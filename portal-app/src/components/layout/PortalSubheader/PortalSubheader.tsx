import { useQuery } from '@tanstack/react-query';
import { amrService } from '@services/amr/amrService';
import { PORTAL_PREFIX } from '@utils/common/constants';
import styles from './PortalSubheader.module.css';

const AUX_LINKS = [
  { label: 'How to use the portal', href: `${PORTAL_PREFIX}/usage/` },
  { label: 'About the portal', href: `${PORTAL_PREFIX}/about/` },
];

const PortalSubheader = () => {
  const releaseQuery = useQuery({
    queryKey: ['release'],
    queryFn: () => amrService.getRelease(),
  });
  // Use portal-app public assets so icons work in both Vite dev and merged nginx runtime.
  const ensemblIconBasePath = `${import.meta.env.BASE_URL}assets/images/icons/ensembl-icons`;

  return (
    <div className={styles.root}>
      <div className={styles.leftWrapper}>
        <a href={`${PORTAL_PREFIX}/`} className={styles.homeLink} aria-label="Home page">
          <img src={`${ensemblIconBasePath}/icon_home.svg`} className={styles.homeIcon} alt="" />
          <span className={styles.homeIconFallback} aria-hidden="true">
            ⌂
          </span>
        </a>
        <div className={styles.titleWrapper}>
          <a href={`${PORTAL_PREFIX}/`} className={styles.portalTitleLink}>
            <span className={styles.portalTitle}>Antimicrobial resistance portal</span>
          </a>
          <span className={styles.pageTitle}>Query AMR data</span>
        </div>
        <span className={styles.dataRelease}>
          <span className={styles.dataReleaseLabel}>Latest data release</span>
          <span className={styles.dataReleaseDate}>{releaseQuery.data?.label ?? 'yyyy-mm'}</span>
        </span>
      </div>
      <div className={styles.rightWrapper}>
        {AUX_LINKS.map(link => (
          <a key={link.href} href={link.href} className={styles.linkWithIcon}>
            <span>{link.label}</span>
            <img
              src={
                link.href.includes('usage')
                  ? `${ensemblIconBasePath}/icon_question_circle.svg`
                  : `${ensemblIconBasePath}/icon_info_circle.svg`
              }
              className={styles.circleIcon}
              alt=""
            />
            <span className={styles.circleIconFallback} aria-hidden="true">
              {link.href.includes('usage') ? '?' : 'i'}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
};

export default PortalSubheader;
