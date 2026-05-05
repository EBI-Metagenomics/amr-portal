import type { AMRColumnMeta, AMRRecordValue } from '@interfaces/amrRecord';
import type { AMRRecordsResponse } from '@interfaces/amrApi';
import panelStyles from '@components/ui/Panel/Panel.module.css';
import ActionButtons from '@components/features/amr/ActionButtons/ActionButtons';
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
  hasSelectedFilters: boolean;
  page: number;
  perPage: number;
  sort: SortState;
  onPageChange: (page: number) => void;
  onPerPageChange: (value: number) => void;
  onSortChange: (category: string) => void;
  onClearFilters: () => void;
};

const panelSection = (extra?: string) =>
  [panelStyles.root, styles.root, extra].filter(Boolean).join(' ');

const DataPanel = ({
  currentViewId,
  selectedFilters,
  data,
  isFetching = false,
  isPlaceholderData = false,
  isLoading,
  isError,
  hasSelectedFilters,
  page,
  perPage,
  sort,
  onPageChange,
  onPerPageChange,
  onSortChange,
  onClearFilters,
}: Props) => {
  if (!hasSelectedFilters) {
    return (
      <section className={panelSection()}>
        <div className={styles.initialContent}>
          <span className={[styles.initialIcon, styles.initialIconStrong].join(' ')}>
            <TableIcon />
          </span>
          <span className={styles.initialTextStrong}>Select data from the Faceted Filters</span>

          <span className={styles.initialIcon}>
            <DeleteIcon />
          </span>
          <span>Select to clear</span>

          <span className={styles.initialIcon}>
            <DownloadIcon />
          </span>
          <span>Select to download</span>
        </div>
        {currentViewId ? (
          <ActionButtons
            viewId={currentViewId}
            selectedFilters={selectedFilters}
            disabled
            onClearFilters={onClearFilters}
          />
        ) : null}
      </section>
    );
  }
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
        <p>No data.</p>
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

  const columns = data.meta.columns;
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
              {columns.map(column => {
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
              <tr key={index}>
                {columns.map(column => {
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
          onClearFilters={onClearFilters}
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

const TableIcon = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <path d="M29.2910042,21.6909561C30.3164024,21.6909561,31,20.8364563,31,19.9819584v-0.7861366c0-1.0253963-0.8544979-1.7089939-1.7089958-1.7089939H12.201045c-0.8544979,0-1.7089958,0.6835976-1.7089958,1.7089939v0.7861366c0,0.8544979,0.6835985,1.7089977,1.7089958,1.7089977H29.2910042z" />
    <path d="M6.4687872,21.6909561c1.0253978,0,1.7089958-0.8544998,1.7089958-1.7089977v-0.7861366c0-1.0253963-0.8544989-1.7089939-1.7089958-1.7089939H2.7089958C1.854498,17.4868279,1,18.1704254,1,19.1958218v0.7861366c0,0.8544979,0.6835986,1.7089977,1.7089958,1.7089977H6.4687872z" />
    <path d="M29.2910042,28.8687382C30.3164024,28.8687382,31,28.0142403,31,27.1597424v-0.7861366c0-1.0253983-0.8544979-1.7089958-1.7089958-1.7089958H12.201045c-0.8544979,0-1.7089958,0.6835976-1.7089958,1.7089958v0.7861366c0,0.8544979,0.6835985,1.7089958,1.7089958,1.7089958H29.2910042z" />
    <path d="M6.4687872,28.8687382c1.0253978,0,1.7089958-0.8544979,1.7089958-1.7089958v-0.7861366c0-1.0253983-0.8544989-1.7089958-1.7089958-1.7089958H2.7089958C1.854498,24.6646099,1,25.3482075,1,26.3736057v0.7861366c0,0.8544979,0.6835986,1.7089958,1.7089958,1.7089958H6.4687872z" />
    <path d="M29.2910042,14.5131731C30.3164024,14.5131731,31,13.6586742,31,12.8041754v-0.7861357c0-1.0253973-0.8544979-1.7089958-1.7089958-1.7089958H12.201045c-0.8544979,0-1.7089958,0.6835985-1.7089958,1.7089958v0.7861357c0,0.8544989,0.6835985,1.7089977,1.7089958,1.7089977H29.2910042z" />
    <path d="M6.4687872,14.5131731c1.0253978,0,1.7089958-0.8544989,1.7089958-1.7089977v-0.7861357c0-1.0253973-0.8544989-1.7089958-1.7089958-1.7089958H2.7089958C1.854498,10.3090439,1,10.9926424,1,12.0180397v0.7861357c0,0.8544989,0.6835986,1.7089977,1.7089958,1.7089977H6.4687872z" />
    <path d="M29.2910042,7.3353896C30.3164024,7.3353896,31,6.4808912,31,5.6263924V4.8402567c0-1.0253978-0.8544979-1.7089953-1.7089958-1.7089953H12.201045c-0.8544979,0-1.7089958,0.6835976-1.7089958,1.7089953v0.7861357c0,0.8544989,0.6835985,1.7089972,1.7089958,1.7089972H29.2910042z" />
    <path d="M6.4687872,7.3353896c1.0253978,0,1.7089958-0.8544984,1.7089958-1.7089972V4.8402567c0-1.0253978-0.8544989-1.7089953-1.7089958-1.7089953H2.7089958C1.854498,3.1312613,1,3.8148589,1,4.8402567v0.7861357c0,0.8544989,0.6835986,1.7089972,1.7089958,1.7089972H6.4687872z" />
  </svg>
);

const DeleteIcon = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <path d="M4.8000002,28.2000008C4.8000002,29.7000008,6,31,7.5999999,31l0,0H24.5c1.6000004,0,2.7999992-1.2999992,2.7999992-2.7999992l0,0V8.5h-22.5V28.2000008z M20.7000008,13.1999998c0-0.5,0.3999996-0.8999996,0.8999996-0.8999996S22.5,12.6999998,22.5,13.1999998v13.0999994c0,0.5-0.3999996,0.8999996-0.8999996,0.8999996s-0.8999996-0.3999996-0.8999996-0.8999996V13.1999998z M15.1000004,13.1999998c0-0.5,0.3999996-0.8999996,0.8999996-0.8999996s0.8999996,0.3999996,0.8999996,0.8999996v13.0999994c0,0.5-0.3999996,0.8999996-0.8999996,0.8999996s-0.8999996-0.3999996-0.8999996-0.8999996V13.1999998z M9.3999996,13.1999998c0-0.5,0.3999996-0.8999996,0.8999996-0.8999996s0.8999996,0.3999996,0.8999996,0.8999996v13.0999994c0,0.5-0.3999996,0.8999996-0.8999996,0.8999996s-0.8999996-0.3999996-0.8999996-0.8999996V13.1999998z M28.2000008,2.9000001h-7l-0.6000004-1.1C20.3999996,1.3,19.8999996,1,19.2999992,1h-6.6999998c-0.5,0-1,0.3-1.3000002,0.8l-0.6000004,1.1000001h-7c-0.5,0-0.9000001,0.4000001-0.9000001,0.9000001v1.9000001c0,0.5,0.4000001,0.9000001,0.9000001,0.9000001h24.3999996c0.5,0,0.8999996-0.4000001,0.8999996-0.9000001V3.8C29.1000004,3.3,28.7000008,2.9000001,28.2000008,2.9000001z" />
  </svg>
);

const DownloadIcon = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <path d="M3.5999999,2.7C3.5999999,2.8,3.5,2.9000001,3.5,3s0,0.2,0.0999999,0.3L15.5,19.5999985c0.1999998,0.2999992,0.6000004,0.2999992,0.7999992,0.2000008c0.1000004,0,0.1000004-0.1000004,0.2000008-0.2000008L28.3999996,3.3C28.6000004,3,28.5,2.6999998,28.1999989,2.5c-0.1000004-0.0999999-0.2000008-0.0999999-0.2999992-0.0999999H4.0999999C3.9000001,2.4000001,3.7,2.5,3.5999999,2.7z" />
    <path d="M29.3353596,29.6499996c1,0,1.666666-0.833334,1.666666-1.6666679v-1.7666645c0-1-0.833334-1.666666-1.666666-1.666666H2.6686926c-0.8333333,0-1.6666666,0.666666-1.6666666,1.666666v1.7666645c0,0.833334,0.6666669,1.6666679,1.6666666,1.6666679H29.3353596z" />
  </svg>
);

export default DataPanel;
