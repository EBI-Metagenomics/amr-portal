import { useMemo, useState } from 'react';
import type { AMRColumnMeta, AMRRecord, AMRRecordValue } from '@interfaces/amrRecord';
import type { AMRRecordsResponse } from '@interfaces/amrApi';
import panelStyles from '@components/ui/Panel/Panel.module.css';
import ActionButtons from '@components/features/amr/ActionButtons/ActionButtons';
import { buildGenomeViewerRowContext } from '@utils/genomeViewer/recordContext';
import styles from './DataPanel.module.css';

type SortState = {
  category: string;
  order: 'asc' | 'desc';
} | null;

type Props = {
  currentViewId: string | number | null;
  selectedFilters: Array<{ category: string; value: string }>;
  data?: AMRRecordsResponse;
  /** True while any records fetch is in flight (including background refetch). */
  isFetching?: boolean;
  /** True when `data` is from the previous query key until the new request completes. */
  isPlaceholderData?: boolean;
  isLoading: boolean;
  isError: boolean;
  activeSearchQuery?: string;
  page: number;
  perPage: number;
  sort: SortState;
  onPageChange: (page: number) => void;
  onPerPageChange: (value: number) => void;
  onSortChange: (category: string) => void;
  onClearFilters: () => void;
  /** When set, rows are selectable for actions such as opening the genome browser. */
  selectedRowIndex?: number | null;
  onRowSelect?: (rowIndex: number, record: AMRRecord) => void;
  /** When true, show a per-row action to open the genome browser. */
  genomeViewerEnabled?: boolean;
};

const panelSection = (extra?: string) =>
  [panelStyles.root, styles.root, extra].filter(Boolean).join(' ');

const getEmptyResultsMessage = (
  activeSearchQuery?: string,
  selectedFilters: Array<{ category: string; value: string }> = []
) => {
  const hasSearch = Boolean(activeSearchQuery?.trim());
  const hasFilters = selectedFilters.length > 0;

  if (hasSearch && hasFilters) {
    return 'No records match your search and selected filters. Try different keywords or adjust your filters.';
  }
  if (hasSearch) {
    return 'No records match your search. Try different keywords or a broader query.';
  }
  if (hasFilters) {
    return 'No records match the selected filters. Try removing or changing some filters.';
  }
  return 'No records found. Try adjusting your search or filters.';
};

const DataPanel = ({
  currentViewId,
  selectedFilters,
  data,
  isFetching = false,
  isPlaceholderData = false,
  isLoading,
  isError,
  activeSearchQuery,
  page,
  perPage,
  sort,
  onPageChange,
  onPerPageChange,
  onSortChange,
  onClearFilters,
  selectedRowIndex = null,
  onRowSelect,
  genomeViewerEnabled = false,
}: Props) => {
  const [hiddenColumnIds, setHiddenColumnIds] = useState<string[]>([]);
  const columns = useMemo(() => data?.meta.columns ?? [], [data]);
  const visibleColumns = useMemo(
    () => columns.filter(column => !hiddenColumnIds.includes(column.id)),
    [columns, hiddenColumnIds]
  );
  const handleClearFilters = () => {
    setHiddenColumnIds([]);
    onClearFilters();
  };

  if (isLoading && !data) {
    return (
      <section className={panelSection()}>
        <p>Loading...</p>
      </section>
    );
  }
  if (isError && !data) {
    return (
      <section className={panelSection()}>
        <p>Failed to retrieve data.</p>
      </section>
    );
  }
  if (data && !data.data.length && !isPlaceholderData) {
    return (
      <section className={panelSection()}>
        <p className={styles.emptyState}>
          {getEmptyResultsMessage(activeSearchQuery, selectedFilters)}
        </p>
      </section>
    );
  }
  if (!data) {
    return (
      <section className={panelSection()}>
        <p>Loading...</p>
      </section>
    );
  }

  const totalPages = Math.max(1, Math.ceil(data.meta.total_hits / data.meta.per_page));
  const onPageInputCommit = (rawValue: string) => {
    const value = rawValue.trim();
    if (!value) return;
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    const nextPage = Math.min(totalPages, Math.max(1, Math.floor(parsed)));
    if (nextPage !== page) {
      onPageChange(nextPage);
    }
  };

  const tableWrapClass = [
    styles.tableContainer,
    isFetching && isPlaceholderData ? styles.tableRefreshing : '',
  ]
    .filter(Boolean)
    .join(' ');

  const showBrowserColumn = genomeViewerEnabled && Boolean(onRowSelect);
  const numericViewId = currentViewId != null ? Number(currentViewId) : null;

  return (
    <section className={panelSection()}>
      <div className={styles.tableControls}>
        <label>
          <select
            className={styles.perPageSelect}
            value={perPage}
            onChange={e => onPerPageChange(Number(e.target.value))}
            aria-label="Rows per page"
          >
            {[100, 200, 500, 1000].map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <span className={styles.perPageLabel}>per page</span>
        </label>
        <div className={styles.pager}>
          <button
            type="button"
            className={styles.pagerButton}
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            &#8249;
          </button>
          <input
            key={`page-input-${page}`}
            className={styles.pageInput}
            type="text"
            inputMode="numeric"
            defaultValue={String(page)}
            aria-label="Current page"
            onKeyDown={event => {
              if (event.key === 'Enter') {
                onPageInputCommit(event.currentTarget.value);
                event.currentTarget.blur();
              }
            }}
            onBlur={event => {
              onPageInputCommit(event.currentTarget.value);
              event.currentTarget.value = String(page);
            }}
          />
          <span className={styles.ofPages}>of {totalPages}</span>
          <button
            type="button"
            className={styles.pagerButton}
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            &#8250;
          </button>
        </div>
        <div className={styles.resultCount}>{data.meta.total_hits} results</div>
      </div>

      <div className={tableWrapClass}>
        <table>
          <thead>
            <tr>
              {showBrowserColumn ? <th className={styles.browserColumn}>Genome browser</th> : null}
              {visibleColumns.map(column => {
                const isSortedColumn = sort?.category === column.id;
                return (
                  <th key={column.id}>
                    {column.sortable ? (
                      <button
                        type="button"
                        className={[styles.sortButton, isSortedColumn ? styles.sortButtonActive : '']
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => onSortChange(column.id)}
                      >
                        <span
                          className={[
                            styles.sortArrow,
                            isSortedColumn ? styles.sortArrowActive : '',
                            sort?.order === 'asc' ? styles.sortArrowUp : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          aria-hidden="true"
                        >
                          ▲
                        </span>
                        <span>{column.label}</span>
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody aria-busy={isFetching && isPlaceholderData}>
            {data.data.map((record, index) => (
              <tr
                key={index}
                aria-selected={onRowSelect ? selectedRowIndex === index : undefined}
                className={[
                  onRowSelect ? styles.clickableRow : '',
                  selectedRowIndex === index ? styles.rowSelected : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={
                  onRowSelect
                    ? () => {
                        onRowSelect(index, record);
                      }
                    : undefined
                }
              >
                {showBrowserColumn && onRowSelect ? (
                  <td className={styles.browserColumn}>
                    {numericViewId != null && buildGenomeViewerRowContext(record, columns, numericViewId) ? (
                      <button
                        type="button"
                        className={styles.browserButton}
                        aria-label="View this record in the genome browser"
                        onClick={event => {
                          event.stopPropagation();
                          onRowSelect(index, record);
                        }}
                      >
                        View in browser
                      </button>
                    ) : (
                      <span className={styles.browserUnavailable} title="Assembly ID not available for this row">
                        —
                      </span>
                    )}
                  </td>
                ) : null}
                {visibleColumns.map(column => {
                  const value = record[column.id];
                  return (
                    <td key={column.id}>
                      {renderValue(value, column, styles.externalLink)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {currentViewId ? (
        <ActionButtons
          viewId={currentViewId}
          selectedFilters={selectedFilters}
          searchQuery={activeSearchQuery}
          columns={columns}
          hiddenColumnIds={hiddenColumnIds}
          onClearFilters={handleClearFilters}
          onHiddenColumnsChange={setHiddenColumnIds}
        />
      ) : null}
    </section>
  );
};

const renderValue = (value: AMRRecordValue | undefined, column: AMRColumnMeta, externalLinkClass: string) => {
  if (value === null || value === undefined) return null;

  if (column.type === 'array-link') {
    if (!Array.isArray(value) || !value.length) return null;
    return value.map((entry, index) => {
      const displayValue = String(entry);
      const link = formatUrl(column.url_template, displayValue);
      return (
        <span key={`${displayValue}-${index}`}>
          {link ? (
            <ExternalLink href={link} className={externalLinkClass}>
              {displayValue}
            </ExternalLink>
          ) : (
            displayValue
          )}
          {index < value.length - 1 ? ', ' : ''}
        </span>
      );
    });
  }

  const displayValue = String(value);
  if (!displayValue) return null;
  if (column.type === 'link') {
    const link = formatUrl(column.url_template, displayValue);
    return link ? (
      <ExternalLink href={link} className={externalLinkClass}>
        {displayValue}
      </ExternalLink>
    ) : (
      displayValue
    );
  }
  if (column.type === 'labelled-link') {
    const parsed = parseLabelledLink(displayValue);
    if (!parsed) return displayValue;
    return (
      <ExternalLink href={parsed.url} className={externalLinkClass}>
        {parsed.label}
      </ExternalLink>
    );
  }

  return displayValue;
};

const formatUrl = (urlTemplate: string | undefined, value: string) =>
  urlTemplate
    ? urlTemplate.includes('{value}')
      ? urlTemplate.replace('{value}', value)
      : urlTemplate.replace('{}', value)
    : null;

const parseLabelledLink = (value: string): { label: string; url: string } | null => {
  const separatorIndex = value.indexOf('|');
  if (separatorIndex <= 0 || separatorIndex >= value.length - 1) return null;
  const label = value.slice(0, separatorIndex).trim();
  const url = value.slice(separatorIndex + 1).trim();
  if (!label || !url) return null;
  return { label, url };
};

const ExternalLink = ({
  href,
  children,
  className,
}: {
  href: string;
  children: string;
  className: string;
}) => (
  <a className={className} href={href} target="_blank" rel="noopener noreferrer">
    <ExternalLinkIcon />
    {children}
  </a>
);

const ExternalLinkIcon = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <path d="M22,5.2l-0.1,0.1L13.4,14c-1,1-1,2.5,0,3.5l1.2,1.2c1,1,2.5,1,3.5,0l8.5-8.7l0.1-0.1l2.6,2.7c1,1,1.7,0.6,1.7-0.7V1.8C31,1.4,30.6,1,30.2,1h-9.8c-1.4,0-1.7,0.8-0.7,1.8L22,5.2z M6,1C3.2,1,1,3.2,1,6v20c0,2.8,2.2,5,5,5h20c2.8,0,5-2.2,5-5V13.1v7.1L26,16v7.5c0,1.4-1.1,2.5-2.5,2.5h-15C7.1,26,6,24.9,6,23.5v-15C6,7.1,7.1,6,8.5,6H16l-4.2-5h7.1H6z" />
  </svg>
);

export default DataPanel;
