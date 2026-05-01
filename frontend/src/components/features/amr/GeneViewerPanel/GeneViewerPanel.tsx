import panelStyles from '@components/ui/Panel/Panel.module.css';
import styles from './GeneViewerPanel.module.css';

type Props = {
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
};

const GeneViewerPanel = ({ isCollapsed, onToggleCollapsed }: Props) => {
  const sectionClass = [panelStyles.root, styles.root].filter(Boolean).join(' ');

  return (
    <section className={sectionClass} aria-label="Gene viewer panel">
      <button
        type="button"
        className={styles.toggle}
        onClick={onToggleCollapsed}
        aria-label={isCollapsed ? 'Expand gene viewer panel' : 'Collapse gene viewer panel'}
      >
        {isCollapsed ? '▾' : '▴'}
      </button>
    </section>
  );
};

export default GeneViewerPanel;
