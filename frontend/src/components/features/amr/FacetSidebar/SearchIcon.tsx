import styles from './FacetSidebar.module.css';

const SearchIcon = () => (
  <svg className={styles.searchIcon} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
    <path
      d="M8.5 3a5.5 5.5 0 0 1 4.33 8.84l3.57 3.57a.75.75 0 1 1-1.06 1.06l-3.57-3.57A5.5 5.5 0 1 1 8.5 3zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"
      fill="currentColor"
    />
  </svg>
);

export default SearchIcon;
