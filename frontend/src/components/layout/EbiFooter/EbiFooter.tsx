import styles from './EbiFooter.module.css';

const EbiFooter = () => {
  return (
    <footer className={`${styles.root} vf-footer`} data-vf-google-analytics-region="embl-footer">
      <div className="vf-footer__inner">
        <p className="vf-footer__notice">
          <a className="vf-footer__link" href="//www.ebi.ac.uk/about/our-impact">
            EMBL-EBI is the home for big data in biology.
          </a>
        </p>
        <p className="vf-footer__notice">
          We help scientists exploit complex information to make discoveries that benefit humankind.
        </p>
        <div className="vf-footer__links-group vf-grid">
          <div className="vf-links">
            <div className="vf-links__heading">
              <a className="vf-heading__link" href="//www.ebi.ac.uk/services">
                Services
              </a>
            </div>
            <ul className="vf-links__list vf-list">
              <li className="vf-list__item">
                <a href="//www.ebi.ac.uk/services/data-resources-and-tools" className="vf-list__link">
                  Data resources and tools
                </a>
              </li>
              <li className="vf-list__item">
                <a href="//www.ebi.ac.uk/submission" className="vf-list__link">
                  Data submission
                </a>
              </li>
              <li className="vf-list__item">
                <a href="//www.ebi.ac.uk/support" className="vf-list__link">
                  Support and feedback
                </a>
              </li>
              <li className="vf-list__item">
                <a href="//www.ebi.ac.uk/licencing" className="vf-list__link">
                  Licensing
                </a>
              </li>
              <li className="vf-list__item">
                <a href="//www.ebi.ac.uk/long-term-data-preservation" className="vf-list__link">
                  Long-term data preservation
                </a>
              </li>
            </ul>
          </div>
          <div className="vf-links">
            <div className="vf-links__heading">
              <a className="vf-heading__link" href="//www.ebi.ac.uk/research">
                Research
              </a>
            </div>
            <ul className="vf-links__list vf-list">
              <li className="vf-list__item">
                <a href="//www.ebi.ac.uk/research/publications" className="vf-list__link">
                  Publications
                </a>
              </li>
              <li className="vf-list__item">
                <a href="//www.ebi.ac.uk/research/groups" className="vf-list__link">
                  Research groups
                </a>
              </li>
              <li className="vf-list__item">
                <a href="//www.ebi.ac.uk/research/postdocs" className="vf-list__link">
                  Postdocs
                </a>{' '}
                and{' '}
                <a href="//www.ebi.ac.uk/research/eipp" className="vf-list__link">
                  PhDs
                </a>
              </li>
            </ul>
          </div>
          <div className="vf-links">
            <div className="vf-links__heading">
              <a className="vf-heading__link" href="//www.ebi.ac.uk/training">
                Training
              </a>
            </div>
            <ul className="vf-links__list vf-list">
              <li className="vf-list__item">
                <a href="//www.ebi.ac.uk/training/live-events" className="vf-list__link">
                  Live training
                </a>
              </li>
              <li className="vf-list__item">
                <a href="//www.ebi.ac.uk/training/on-demand" className="vf-list__link">
                  On-demand training
                </a>
              </li>
              <li className="vf-list__item">
                <a href="//www.ebi.ac.uk/training/trainer-support" className="vf-list__link">
                  Support for trainers
                </a>
              </li>
              <li className="vf-list__item">
                <a href="//www.ebi.ac.uk/training/contact-us" className="vf-list__link">
                  Contact organisers
                </a>
              </li>
            </ul>
          </div>
          <div className="vf-links">
            <div className="vf-links__heading">
              <a className="vf-heading__link" href="//www.ebi.ac.uk/industry">
                Industry
              </a>
            </div>
            <ul className="vf-links__list vf-list">
              <li className="vf-list__item">
                <a href="//www.ebi.ac.uk/industry/private/members-area/" className="vf-list__link">
                  Members Area
                </a>
              </li>
              <li className="vf-list__item">
                <a href="//www.ebi.ac.uk/industry/contact-us" className="vf-list__link">
                  Contact Industry team
                </a>
              </li>
            </ul>
          </div>
          <div className="vf-links">
            <div className="vf-links__heading">
              <a className="vf-heading__link" href="//www.ebi.ac.uk/about">
                About
              </a>
            </div>
            <ul className="vf-links__list vf-list">
              <li className="vf-list__item">
                <a href="//www.ebi.ac.uk/about/contact" className="vf-list__link">
                  Contact us
                </a>
              </li>
              <li className="vf-list__item">
                <a href="//www.ebi.ac.uk/about/events" className="vf-list__link">
                  Events
                </a>
              </li>
              <li className="vf-list__item">
                <a href="//www.ebi.ac.uk/about/jobs" className="vf-list__link">
                  Jobs
                </a>
              </li>
              <li className="vf-list__item">
                <a href="//www.ebi.ac.uk/about/news" className="vf-list__link">
                  News
                </a>
              </li>
              <li className="vf-list__item">
                <a href="//www.ebi.ac.uk/about/people" className="vf-list__link">
                  People and groups
                </a>
              </li>
              <li className="vf-list__item">
                <a href="//intranet.ebi.ac.uk" className="vf-list__link">
                  Intranet for staff
                </a>
              </li>
            </ul>
          </div>
        </div>
        <p className="vf-footer__legal">
          <span className="vf-footer__legal-text">
            <a
              className="vf-footer__link"
              href="https://www.google.co.uk/maps/place/Hinxton,+Saffron+Walden+CB10+1SD/@52.0815334,0.1891518,17z/data=!3m1!4b1!4m5!3m4!1s0x47d87ccbfbd2538b:0x7bbdb4cde2779ff3!8m2!3d52.0800838!4d0.186415"
            >
              EMBL-EBI, Wellcome Genome Campus, Hinxton, Cambridgeshire, CB10 1SD, UK.
            </a>
          </span>
          <span className="vf-footer__legal-text">
            <a className="vf-footer__link" href="tel:00441223494444">
              Tel: +44 (0)1223 49 44 44
            </a>
          </span>
          <span className="vf-footer__legal-text">
            <a className="vf-footer__link" href="//www.ebi.ac.uk/about/contact">
              Full contact details
            </a>
          </span>
        </p>
        <p className="vf-footer__legal">
          <span className="vf-footer__legal-text">Copyright © EMBL 2025</span>
          <span className="vf-footer__legal-text">
            EMBL-EBI is part of the{' '}
            <a className="vf-footer__link" href="//www.embl.org">
              European Molecular Biology Laboratory
            </a>
          </span>
          <span className="vf-footer__legal-text">
            <a className="vf-footer__link" href="//www.ebi.ac.uk/about/terms-of-use">
              Terms of use
            </a>
          </span>
        </p>
      </div>
    </footer>
  );
};

export default EbiFooter;
