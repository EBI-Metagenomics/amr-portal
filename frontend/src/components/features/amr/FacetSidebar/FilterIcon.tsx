import styles from './FacetSidebar.module.css';

const FilterIcon = () => (
  <svg className={styles.filterIcon} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
    <path d="M1.75 2.5h12.5L9.5 8.6v4.4l-3 1.5V8.6L1.75 2.5z" fill="currentColor" />
  </svg>
);

export default FilterIcon;
