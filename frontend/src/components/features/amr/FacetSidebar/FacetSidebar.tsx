import { useMemo } from 'react';
import type { AMRFacetsResponse, FacetOperator, SelectedFilter } from '@interfaces/amrApi';
import panelStyles from '@components/ui/Panel/Panel.module.css';
import styles from './FacetSidebar.module.css';

type Props = {
  facetsData?: AMRFacetsResponse;
  selectedFilters: SelectedFilter[];
  currentViewId: string | number;
  onViewChange: (viewId: string | number) => void;
  onFilterToggle: (category: string, value: string, isSelected: boolean) => void;
  onClearAllFilters: () => void;
  onFacetSearch: (facetId: string, search: string) => void;
  onFacetLoadMore: (facetId: string, nextOffset: number) => void;
  onFacetToggleExpand: (facetId: string) => void;
  isFacetExpanded: (facetId: string) => boolean;
  hasFacetExpansionState: boolean;
  facetOperators: Record<string, FacetOperator>;
  onFacetOperatorChange: (facetId: string, operator: FacetOperator) => void;
};

const FacetSidebar = ({
  facetsData,
  selectedFilters,
  currentViewId,
  onViewChange,
  onFilterToggle,
  onClearAllFilters,
  onFacetSearch,
  onFacetLoadMore,
  onFacetToggleExpand,
  isFacetExpanded,
  hasFacetExpansionState,
  facetOperators,
  onFacetOperatorChange,
}: Props) => {
  const showAnyAllControls = false;
  const dataTypes = facetsData?.data_type ?? [];
  const facets = facetsData?.facets ?? [];
  const selectedMap = useMemo(
    () => new Set(selectedFilters.map(filter => `${filter.category}::${filter.value}`)),
    [selectedFilters]
  );

  const sectionClass = [panelStyles.root, styles.root].filter(Boolean).join(' ');

  return (
    <section className={sectionClass}>
      <div className={styles.content}>
        <div className={styles.headerRow}>
          <h3 className={styles.heading}>Filter Results</h3>
          <button type="button" className={styles.clearButton} onClick={onClearAllFilters}>
            Clear all
          </button>
        </div>
        <div className={styles.dataTypeGrid}>
          {dataTypes.map(type => {
            const active = Boolean(type.active) || String(type.id) === String(currentViewId);
            return (
              <button
                key={String(type.id)}
                type="button"
                className={[styles.dataTypeCard, active ? styles.dataTypeCardActive : '']
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onViewChange(type.id)}
              >
                <span>{type.name}</span>
                {type.selected_count > 0 ? (
                  <span className={styles.filterCountCircle}>{type.selected_count}</span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className={styles.facetList}>
          {facets.map((facet, index) => {
            const expanded = hasFacetExpansionState ? isFacetExpanded(facet.id) : index === 0;
            const isAndMode = facetOperators[facet.id] === 'AND';
            const selectedValuesForFacet = selectedFilters
              .filter(filter => filter.category === facet.id)
              .map(filter => filter.value);
            const missingSelectedOptions = selectedValuesForFacet
              .filter(selectedValue => !facet.options.some(option => option.value === selectedValue))
              .map(selectedValue => ({
                value: selectedValue,
                label: selectedValue,
                count: 0,
                selected: true,
              }));
            const sortedOptions = [...facet.options, ...missingSelectedOptions].sort((a, b) => {
              if (a.selected !== b.selected) return a.selected ? -1 : 1;
              return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
            });
            const optionListClass = [
              styles.optionList,
              sortedOptions.length > 10 ? styles.optionListScrollable : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <section key={facet.id} className={styles.facetSection}>
                <button
                  type="button"
                  className={styles.facetHeader}
                  onClick={() => onFacetToggleExpand(facet.id)}
                >
                  <span className={styles.facetTitle}>
                    {facet.label}
                    <span className={styles.facetCount}>{facet.selected_count}</span>
                  </span>
                  <span className={styles.facetChevron}>{expanded ? '▾' : '▸'}</span>
                </button>
                {expanded ? (
                  <div className={styles.facetBody}>
                    {showAnyAllControls ? (
                      <div className={styles.anyAllRow}>
                        <label className={styles.logicSwitchLabel}>
                          <input
                            type="checkbox"
                            className={styles.logicToggleSwitch}
                            checked={isAndMode}
                            onChange={event =>
                              onFacetOperatorChange(facet.id, event.target.checked ? 'AND' : 'OR')
                            }
                            aria-label={`Toggle between ANY and ALL for ${facet.label}`}
                          />
                          <span className={styles.logicSwitchTrack}>
                            <span className={styles.logicSwitchKnob}>{isAndMode ? 'ALL' : 'ANY'}</span>
                          </span>
                        </label>
                        <span className={styles.logicText}>of these should be present:</span>
                      </div>
                    ) : null}
                    <input
                      className={styles.searchInput}
                      type="search"
                      placeholder={`Search ${facet.label.toLowerCase()}`}
                      onChange={event => onFacetSearch(facet.id, event.target.value)}
                    />
                    <div className={optionListClass}>
                      {sortedOptions.map(option => {
                        const checked = selectedMap.has(`${facet.id}::${option.value}`);
                        return (
                          <label key={option.value} className={styles.checkboxRow}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={event =>
                                onFilterToggle(facet.id, option.value, event.target.checked)
                              }
                            />
                            <span className={styles.optionLabel}>{option.label}</span>
                            <span className={styles.optionCount}>{option.count.toLocaleString()}</span>
                          </label>
                        );
                      })}
                    </div>
                    {facet.has_more && facet.next_offset !== null ? (
                      <button
                        type="button"
                        className={styles.loadMoreButton}
                        onClick={() => onFacetLoadMore(facet.id, facet.total_options)}
                      >
                        Load all
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </section>
            );
          })}
          {!facets.length ? <div className={styles.emptyState}>Loading facets...</div> : null}
        </div>
      </div>
    </section>
  );
};

export default FacetSidebar;
