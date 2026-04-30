import styles from './EbiHeader.module.css';

const PRIMARY_NAV_LINKS = [
  { label: 'EMBL-EBI home', href: 'https://www.ebi.ac.uk' },
  { label: 'Services', href: 'https://www.ebi.ac.uk/services' },
  { label: 'Research', href: 'https://www.ebi.ac.uk/research' },
  { label: 'Training', href: 'https://www.ebi.ac.uk/training' },
  { label: 'About us', href: 'https://www.ebi.ac.uk/about' },
];

const EbiHeader = () => {
  return (
    <header className={styles.root}>
      <nav className={styles.nav}>
        <ul>
          {PRIMARY_NAV_LINKS.map(link => (
            <li key={link.href}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
        </ul>
        <span className={styles.logo}>EMBL-EBI</span>
      </nav>
    </header>
  );
};

export default EbiHeader;
