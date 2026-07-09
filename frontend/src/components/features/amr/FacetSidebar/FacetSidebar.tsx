import { useMemo } from 'react';
import type { AMRFacetsResponse, FacetOperator, SelectedFilter } from '@interfaces/amrApi';
import { GLOBAL_SEARCH_MIN_LENGTH } from '@/config/globalSearch';
import panelStyles from '@components/ui/Panel/Panel.module.css';
import { buildFacetMetaMap, formatFacetFilterTagLabel } from './activeFilterLabels';
import { buildFacetHeaderSummary, getActiveScopeTotal } from './facetHeaderSummary';
import FilterIcon from './FilterIcon';
import SearchIcon from './SearchIcon';
import styles from './FacetSidebar.module.css';

type Props = {
  facetsData?: AMRFacetsResponse;
  selectedFilters: SelectedFilter[];
  currentViewId: string | number;
  searchQuery: string;
  activeSearchQuery?: string;
  isGlobalSearchActive: boolean;
  onSearchQueryChange: (value: string) => void;
  onSearchSubmit: () => void;
  onClearSearch: () => void;
  onClearActiveFilters: () => void;
  onViewChange: (viewId: string | number) => void;
  onFilterToggle: (category: string, value: string, isSelected: boolean) => void;
  onClearAllFilters: () => void;
  onFacetSearch: (facetId: string, search: string) => void;
  onFacetLoadMore: (facetId: string, totalOptions: number) => void;
  onFacetToggleExpand: (facetId: string) => void;
  isFacetExpanded: (facetId: string) => boolean;
  hasFacetExpansionState: boolean;
  facetOperators: Record<string, FacetOperator>;
  onFacetOperatorChange: (facetId: string, operator: FacetOperator) => void;
  scopeTotal?: number | null;
};

const FacetSidebar = ({
  facetsData,
  selectedFilters,
  currentViewId,
  searchQuery,
  activeSearchQuery,
  isGlobalSearchActive,
  onSearchQueryChange,
  onSearchSubmit,
  onClearSearch,
  onClearActiveFilters,
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
  scopeTotal: scopeTotalProp,
}: Props) => {
  const showAnyAllControls = false;
  const dataTypes = facetsData?.data_type ?? [];
  const facets = facetsData?.facets ?? [];
  const selectedMap = useMemo(
    () => new Set(selectedFilters.map(filter => `${filter.category}::${filter.value}`)),
    [selectedFilters]
  );
  const trimmedSearchLength = searchQuery.trim().length;
  const showSearchMinLengthHint =
    trimmedSearchLength > 0 && trimmedSearchLength < GLOBAL_SEARCH_MIN_LENGTH;
  const facetMeta = useMemo(() => buildFacetMetaMap(facets), [facets]);
  const scopeTotal = useMemo(() => {
    if (scopeTotalProp != null) {
      return scopeTotalProp;
    }
    return getActiveScopeTotal(dataTypes, currentViewId, isGlobalSearchActive);
  }, [scopeTotalProp, dataTypes, currentViewId, isGlobalSearchActive]);
  const activeFilterCount =
    (isGlobalSearchActive ? 1 : 0) + selectedFilters.length;
  const showActiveFilters = activeFilterCount > 0;

  const sectionClass = [panelStyles.root, styles.root].filter(Boolean).join(' ');

  return (
    <section className={sectionClass}>
      <div className={styles.content}>
        <div className={styles.globalSearchSection}>
          <label
            className={[styles.sectionTitle, styles.globalSearchLabel].join(' ')}
            htmlFor="global-search-input"
          >
            Global search
          </label>
          <div className={styles.globalSearchField}>
            <input
              id="global-search-input"
              className={styles.globalSearchInput}
              type="search"
              value={searchQuery}
              placeholder="Search sample accessions, genome accessions, or genes..."
              onChange={event => onSearchQueryChange(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  onSearchSubmit();
                }
              }}
            />
            <button
              type="button"
              className={styles.globalSearchButton}
              aria-label="Search"
              onClick={onSearchSubmit}
            >
              <SearchIcon />
            </button>
          </div>
          {showSearchMinLengthHint ? (
            <p className={styles.globalSearchHint}>
              Enter at least {GLOBAL_SEARCH_MIN_LENGTH} characters, then press Enter or click
              search.
            </p>
          ) : null}
        </div>

        <fieldset className={styles.resultTypeFieldset}>
          <legend className={[styles.sectionTitle, styles.resultTypeLegend].join(' ')}>
            <span>Result type</span>
            {isGlobalSearchActive ? (
              <span className={styles.resultTypeNote}>Counts are based on your current search.</span>
            ) : null}
          </legend>
          <div className={styles.dataTypeGrid}>
            {dataTypes.map(type => {
              const active = Boolean(type.active) || String(type.id) === String(currentViewId);
              const countBadge =
                isGlobalSearchActive && type.search_count != null
                  ? type.search_count.toLocaleString()
                  : null;

              return (
                <label
                  key={String(type.id)}
                  className={[styles.dataTypeCard, active ? styles.dataTypeCardActive : '']
                    .filter(Boolean)
                    .join(' ')}
                >
                  <input
                    type="radio"
                    className={styles.dataTypeRadio}
                    name="result-type"
                    checked={active}
                    onChange={() => onViewChange(type.id)}
                  />
                  <span>{type.name}</span>
                  {countBadge ? (
                    <span className={styles.resultCountBadge} title="Matching records">
                      <span className={styles.resultCountValue}>{countBadge}</span>
                      <span className={styles.resultCountLabel}>matches</span>
                    </span>
                  ) : null}
                </label>
              );
            })}
          </div>
        </fieldset>

        {showActiveFilters ? (
          <section className={styles.activeFiltersSection} aria-label="Active filters">
            <div className={styles.activeFiltersHeader}>
              <h4 className={styles.activeFiltersTitle}>
                Active filters ({activeFilterCount})
              </h4>
              <button type="button" className={styles.clearButton} onClick={onClearActiveFilters}>
                Clear all
              </button>
            </div>
            <div className={styles.activeFiltersList}>
              {isGlobalSearchActive && activeSearchQuery ? (
                <span
                  className={[styles.activeFilterTag, styles.activeFilterTagSearch].join(' ')}
                >
                  <span className={styles.activeFilterTagLabel}>{activeSearchQuery}</span>
                  <button
                    type="button"
                    className={styles.activeFilterRemove}
                    aria-label={`Remove search ${activeSearchQuery}`}
                    onClick={onClearSearch}
                  >
                    ✕
                  </button>
                </span>
              ) : null}
              {selectedFilters.map(filter => {
                const tagLabel = formatFacetFilterTagLabel(
                  filter.category,
                  filter.value,
                  facetMeta
                );
                return (
                  <span key={`${filter.category}::${filter.value}`} className={styles.activeFilterTag}>
                    <span className={styles.activeFilterTagLabel}>{tagLabel}</span>
                    <button
                      type="button"
                      className={styles.activeFilterRemove}
                      aria-label={`Remove filter ${tagLabel}`}
                      onClick={() => onFilterToggle(filter.category, filter.value, false)}
                    >
                      ✕
                    </button>
                  </span>
                );
              })}
            </div>
          </section>
        ) : null}

        <div className={styles.headerRow}>
          <div className={styles.filtersHeadingGroup}>
            <h3 className={styles.sectionTitle}>Filters</h3>
            {/* <p className={styles.filtersHint}>
              Match counts show records in scope. Filter icons show active selections.
            </p> */}
          </div>
          {/* <button type="button" className={styles.clearButton} onClick={onClearAllFilters}>
            Clear all
          </button> */}
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
            const headerSummary = buildFacetHeaderSummary(facet, scopeTotal);
            return (
              <section key={facet.id} className={styles.facetSection}>
                <button
                  type="button"
                  className={styles.facetHeader}
                  onClick={() => onFacetToggleExpand(facet.id)}
                  aria-label={`${facet.label}. ${headerSummary.ariaLabel}`}
                >
                  <span className={styles.facetTitle}>{facet.label}</span>
                  <span className={styles.facetHeaderMeta}>
                    {headerSummary.filterSelectionCount > 0 ? (
                      <span
                        className={styles.facetFilterBadge}
                        title={`${headerSummary.filterSelectionCount} selected`}
                      >
                        <FilterIcon />
                        <span>{headerSummary.filterSelectionCount}</span>
                      </span>
                    ) : null}
                    {headerSummary.matchText ? (
                      <span className={styles.facetMatchSummary}>{headerSummary.matchText}</span>
                    ) : null}
                    <span className={styles.facetChevron}>{expanded ? '▾' : '▸'}</span>
                  </span>
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
                    <div className={styles.optionListHeader} aria-hidden="true">
                      <span>Value</span>
                      <span>Matches</span>
                    </div>
                    <div className={styles.optionList}>
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
                            <span
                              className={styles.optionCount}
                              title="Matching records for this value"
                            >
                              {option.count.toLocaleString()}
                            </span>
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
