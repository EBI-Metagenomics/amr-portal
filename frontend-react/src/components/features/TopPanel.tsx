import { useState } from 'react';
import type { FiltersConfig } from '@interfaces/filtersConfig';
import type { SelectedFilter } from '@interfaces/amrApi';

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

  return (
    <section className={`panel top-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <button
        className="top-panel-toggle"
        onClick={() => setIsCollapsed(prev => !prev)}
        aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
      >
        {isCollapsed ? (
          <svg viewBox="0 0 16 16" width="23" height="23" aria-hidden="true">
            <path d="M4 6.5 8 10.2 12 6.5" stroke="#0ea5e9" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" width="23" height="23" aria-hidden="true">
            <path d="M4 9.5 8 5.8 12 9.5" stroke="#0ea5e9" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      {isCollapsed ? (
        <aside className="left-nav collapsed-nav">
          <h3>Data</h3>
          {filtersConfig.filterViews.map(view => {
            const active = view.id === currentViewId;
            return (
              <button
                key={String(view.id)}
                className="link-button"
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
        <div className="panel-layout">
          <aside className="left-nav">
            <h3>Data</h3>
            {filtersConfig.filterViews.map(view => {
              const active = view.id === currentViewId;
              return (
                <button
                  key={String(view.id)}
                  className="link-button"
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
            <div className="filter-by-label">Filter by</div>
            <div className="group-nav">
              {currentView.categoryGroups.map(group => {
                const active = group.name === activeGroup.name;
                return (
                  <button
                    key={group.name}
                    className="link-button"
                    disabled={active}
                    onClick={() => onGroupChange(group.name)}
                  >
                    {group.name}
                  </button>
                );
              })}
            </div>

            <div className="filters-grid">
              {activeGroup.categories.map(categoryId => {
                const category = filtersConfig.filterCategories[categoryId];
                if (!category) return null;
                return (
                  <div key={category.id} className="filter-category">
                    <h4>{category.label}</h4>
                    {category.filters.map(filter => {
                      const checked = selectedFilters.some(
                        selected =>
                          selected.category === category.id && selected.value === filter.value
                      );
                      return (
                        <label key={filter.value} className="checkbox-row">
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
