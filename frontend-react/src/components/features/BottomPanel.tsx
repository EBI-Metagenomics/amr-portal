import type { AMRRecordField, LinkArrayData, LinkData } from '@interfaces/amrRecord';
import type { AMRRecordsResponse } from '@interfaces/amrApi';
import type { FiltersView } from '@interfaces/filtersConfig';
import ActionButtons from './ActionButtons';

type SortState = {
  category: string;
  order: 'asc' | 'desc';
} | null;

type Props = {
  currentView: FiltersView | null;
  selectedFilters: Array<{ category: string; value: string }>;
  data?: AMRRecordsResponse;
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

const BottomPanel = ({
  currentView,
  selectedFilters,
  data,
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
      <section className="panel bottom-panel">
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
  if (isLoading) return <section className="panel bottom-panel"><p>Loading...</p></section>;
  if (isError) return <section className="panel bottom-panel"><p>Failed to retrieve data.</p></section>;
  if (!data?.data.length) return <section className="panel bottom-panel"><p>No data.</p></section>;

  const columns = [...(currentView?.columns ?? [])].sort((a, b) => a.rank - b.rank);
  const columnIds = columns.map(column => String(column.id));
  const totalPages = Math.max(1, Math.ceil(data.meta.total_hits / data.meta.per_page));

  return (
    <section className="panel bottom-panel">
      <div className="table-controls">
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
        <div className="pager">
          <button disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            Prev
          </button>
          <span>
            Page {page} / {totalPages}
          </span>
          <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            Next
          </button>
        </div>
        <div>{data.meta.total_hits} results</div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              {columns.map(column => {
                return (
                <th key={String(column.id)}>
                  {column.sortable ? (
                    <button className="sort-button" onClick={() => onSortChange(String(column.id))}>
                      <span>{column.label}</span>
                      <span className="sort-arrows">
                        <span className={sort?.category === String(column.id) && sort.order === 'asc' ? 'active' : ''}>▲</span>
                        <span className={sort?.category === String(column.id) && sort.order === 'desc' ? 'active' : ''}>▼</span>
                      </span>
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {data.data.map((record, index) => (
              <tr key={index}>
                {columnIds.map(columnId => {
                  const field = record.find(cell => String(cell.column_id) === columnId);
                  return <td key={String(columnId)}>{field ? renderField(field) : null}</td>;
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

const renderField = (field: AMRRecordField) => {
  if (isLinkArray(field)) {
    return field.values.map((link, index) => (
      <span key={`${link.url}-${index}`}>
        <a href={link.url} target="_blank" rel="noreferrer">
          {link.value}
        </a>
        {index < field.values.length - 1 ? ', ' : ''}
      </span>
    ));
  }
  if (isLink(field)) {
    if (!field.value) return null;
    return field.url ? (
      <a href={field.url} target="_blank" rel="noreferrer">
        {field.value}
      </a>
    ) : (
      field.value
    );
  }
  return field.value;
};

const isLink = (data: AMRRecordField): data is LinkData => data.type === 'link';
const isLinkArray = (data: AMRRecordField): data is LinkArrayData => data.type === 'array-link';

export default BottomPanel;
