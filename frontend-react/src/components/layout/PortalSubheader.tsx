import { useQuery } from '@tanstack/react-query';
import { amrService } from '@services/amr/amrService';

const AUX_LINKS = [
  { label: 'How to use the portal', href: '/usage/' },
  { label: 'About the portal', href: '/about/' },
];

const PortalSubheader = () => {
  const releaseQuery = useQuery({
    queryKey: ['release'],
    queryFn: () => amrService.getRelease(),
  });
  const iconBasePath = `${import.meta.env.BASE_URL}assets/images/icons/ensembl-icons`;

  return (
    <div className="portal-subheader">
      <div className="left-wrapper">
        <a href="/" className="home-link" aria-label="Home page">
          <img src={`${iconBasePath}/icon_home.svg`} className="home-icon" alt="" />
          <span className="home-icon-fallback" aria-hidden="true">⌂</span>
        </a>
        <div className="title-wrapper">
          <span className="portal-title">Antimicrobial resistance portal</span>
          <span className="page-title">Query AMR data</span>
        </div>
        <span className="data-release">
          <span className="data-release-label">Latest data release</span>
          <span className="data-release-date">
            {releaseQuery.data?.label ?? 'yyyy-mm'}
          </span>
        </span>
      </div>
      <div className="right-wrapper">
        {AUX_LINKS.map(link => (
          <a key={link.href} href={link.href} className="link-with-icon">
            <span>{link.label}</span>
            <img
              src={
                link.href.includes('usage')
                  ? `${iconBasePath}/icon_question_circle.svg`
                  : `${iconBasePath}/icon_info_circle.svg`
              }
              className="circle-icon"
              alt=""
            />
            <span className="circle-icon-fallback" aria-hidden="true">
              {link.href.includes('usage') ? '?' : 'i'}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
};

export default PortalSubheader;
