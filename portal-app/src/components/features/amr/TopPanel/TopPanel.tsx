import { useState } from 'react';
import type { FiltersConfig } from '@interfaces/filtersConfig';
import type { SelectedFilter } from '@interfaces/amrApi';
import panelStyles from '@components/ui/Panel/Panel.module.css';
import linkStyles from '@components/ui/LinkButton/LinkButton.module.css';
import styles from './TopPanel.module.css';

type Props = {
  filtersConfig: FiltersConfig;
  selectedFilters: SelectedFilter[];
  currentViewId: string | number;
  activeGroupName: string | null;
  appliedFilterCount: number;
  onViewChange: (viewId: string | number) => void;
  onGroupChange: (groupName: string) => void;
  onFilterToggle: (category: string, value: string, isSelected: boolean) => void;
};

const TopPanel = ({
  filtersConfig,
  selectedFilters,
  currentViewId,
  activeGroupName,
  appliedFilterCount,
  onViewChange,
  onGroupChange,
  onFilterToggle,
}: Props) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const currentView = filtersConfig.filterViews.find(view => view.id === currentViewId);
  const activeGroup = currentView?.categoryGroups.find(group => group.name === activeGroupName);

  if (!currentView || !activeGroup) return null;

  const sectionClass = [panelStyles.root, styles.root, isCollapsed ? styles.collapsed : '']
    .filter(Boolean)
    .join(' ');

  return (
    <section className={sectionClass}>
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setIsCollapsed(prev => !prev)}
        aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
      >
        {isCollapsed ? (
          <svg className={styles.toggleIcon} viewBox="0 0 16 16" width="23" height="23" aria-hidden="true">
            <path d="M4 6.5 8 10.2 12 6.5" />
          </svg>
        ) : (
          <svg className={styles.toggleIcon} viewBox="0 0 16 16" width="23" height="23" aria-hidden="true">
            <path d="M4 9.5 8 5.8 12 9.5" />
          </svg>
        )}
      </button>
      {isCollapsed ? (
        <aside className={`${styles.leftNav} ${styles.leftNavCollapsed}`}>
          <h3>Data</h3>
          {filtersConfig.filterViews.map(view => {
            const active = view.id === currentViewId;
            return (
              <button
                key={String(view.id)}
                type="button"
                className={linkStyles.root}
                disabled={active}
                onClick={() => onViewChange(view.id)}
              >
                {view.name}
                {active && appliedFilterCount > 0 ? ` (${appliedFilterCount})` : ''}
              </button>
            );
          })}
        </aside>
      ) : (
        <div className={styles.panelLayout}>
          <aside className={styles.leftNav}>
            <h3>Data</h3>
            {filtersConfig.filterViews.map(view => {
              const active = view.id === currentViewId;
              return (
                <button
                  key={String(view.id)}
                  type="button"
                  className={linkStyles.root}
                  disabled={active}
                  onClick={() => onViewChange(view.id)}
                >
                  {view.name}
                  {active && appliedFilterCount > 0 ? ` (${appliedFilterCount})` : ''}
                </button>
              );
            })}
          </aside>

          <div>
            <div className={styles.filterByRow}>
              <span className={styles.filterByLabel}>Filter by</span>
              <div className={styles.groupNav}>
                {currentView.categoryGroups.map(group => {
                  const active = group.name === activeGroup.name;
                  return (
                    <button
                      key={group.name}
                      type="button"
                      className={linkStyles.root}
                      disabled={active}
                      onClick={() => onGroupChange(group.name)}
                    >
                      {group.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.filtersGrid}>
              {activeGroup.categories.map(categoryId => {
                const category = filtersConfig.filterCategories[categoryId];
                if (!category) return null;
                return (
                  <div key={category.id} className={styles.filterCategory}>
                    {category.filters.map(filter => {
                      const checked = selectedFilters.some(
                        selected =>
                          selected.category === category.id && selected.value === filter.value
                      );
                      return (
                        <label key={filter.value} className={styles.checkboxRow}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={event =>
                              onFilterToggle(category.id, filter.value, event.target.checked)
                            }
                          />
                          <span>{filter.label}</span>
                        </label>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default TopPanel;
