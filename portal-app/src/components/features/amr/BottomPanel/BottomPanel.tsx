import type { AMRRecordField, LinkArrayData, LinkData } from '@interfaces/amrRecord';
import type { AMRRecordsResponse } from '@interfaces/amrApi';
import type { FiltersView } from '@interfaces/filtersConfig';
import panelStyles from '@components/ui/Panel/Panel.module.css';
import ActionButtons from '@components/features/amr/ActionButtons/ActionButtons';
import styles from './BottomPanel.module.css';

type SortState = {
  category: string;
  order: 'asc' | 'desc';
} | null;

type Props = {
  currentView: FiltersView | null;
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

const BottomPanel = ({
  currentView,
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
        <p>Select data from the options above to start.</p>
        {currentView ? (
          <ActionButtons
            viewId={currentView.id}
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

  const columns = [...(currentView?.columns ?? [])].sort((a, b) => a.rank - b.rank);
  const columnIds = columns.map(column => String(column.id));
  const totalPages = Math.max(1, Math.ceil(data.meta.total_hits / data.meta.per_page));

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
          Per page:{' '}
          <select value={perPage} onChange={e => onPerPageChange(Number(e.target.value))}>
            {[100, 200, 500, 1000].map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.pager}>
          <button
            type="button"
            className={styles.pagerButton}
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Prev
          </button>
          <span>
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            className={styles.pagerButton}
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </button>
        </div>
        <div>{data.meta.total_hits} results</div>
      </div>

      <div className={tableWrapClass}>
        <table>
          <thead>
            <tr>
              {columns.map(column => {
                const isSortedColumn = sort?.category === String(column.id);
                return (
                  <th key={String(column.id)}>
                    {column.sortable ? (
                      <button
                        type="button"
                        className={[styles.sortButton, isSortedColumn ? styles.sortButtonActive : '']
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => onSortChange(String(column.id))}
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
                {columnIds.map(columnId => {
                  const field = record.find(cell => String(cell.column_id) === columnId);
                  return (
                    <td key={String(columnId)}>
                      {field ? renderField(field, styles.externalLink) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {currentView ? (
        <ActionButtons
          viewId={currentView.id}
          selectedFilters={selectedFilters}
          onClearFilters={onClearFilters}
        />
      ) : null}
    </section>
  );
};

const renderField = (field: AMRRecordField, externalLinkClass: string) => {
  if (isLinkArray(field)) {
    return field.values.map((link, index) => (
      <span key={`${link.url}-${index}`}>
        <ExternalLink href={link.url} className={externalLinkClass}>
          {link.value}
        </ExternalLink>
        {index < field.values.length - 1 ? ', ' : ''}
      </span>
    ));
  }
  if (isLink(field)) {
    if (!field.value) return null;
    return field.url ? (
      <ExternalLink href={field.url} className={externalLinkClass}>
        {field.value}
      </ExternalLink>
    ) : (
      field.value
    );
  }
  return field.value;
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

const isLink = (data: AMRRecordField): data is LinkData => data.type === 'link';
const isLinkArray = (data: AMRRecordField): data is LinkArrayData => data.type === 'array-link';

export default BottomPanel;
