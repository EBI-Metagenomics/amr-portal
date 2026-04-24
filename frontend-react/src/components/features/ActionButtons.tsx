import { useMemo, useState } from 'react';
import { API_BASE_URL, FTP_DOWNLOAD_URL } from '@utils/common/constants';
import { getDownloadLink } from '@utils/download';

type ActionView = 'clear' | 'download' | null;

type Props = {
  viewId: string | number;
  selectedFilters: Array<{ category: string; value: string }>;
  disabled?: boolean;
  onClearFilters: () => void;
};

const TableViewIcon = ({ dark }: { dark?: boolean }) => (
  <svg viewBox="0 0 16 16" width="23" height="23" aria-hidden="true">
    <path d="M3 4h10M3 8h10M3 12h10" stroke={dark ? '#1f2937' : '#0ea5e9'} strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="2" cy="4" r="0.9" fill={dark ? '#1f2937' : '#0ea5e9'} />
    <circle cx="2" cy="8" r="0.9" fill={dark ? '#1f2937' : '#0ea5e9'} />
    <circle cx="2" cy="12" r="0.9" fill={dark ? '#1f2937' : '#0ea5e9'} />
  </svg>
);

const DeleteIcon = () => (
  <svg viewBox="0 0 16 16" width="23" height="23" aria-hidden="true">
    <path d="M3.5 5.5h9M6.2 5.5v6M8 5.5v6m1.8-6v6M5.5 3.5h5l.6 1.2H4.9l.6-1.2Z" stroke="#0ea5e9" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DownloadIcon = () => (
  <svg viewBox="0 0 16 16" width="23" height="23" aria-hidden="true">
    <path d="M8 3.2v6.1m0 0 2.4-2.3M8 9.3 5.6 7M4 12.5h8" stroke="#0ea5e9" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ActionButtons = ({ viewId, selectedFilters, disabled, onClearFilters }: Props) => {
  const [view, setView] = useState<ActionView>(null);
  const [downloadStarted, setDownloadStarted] = useState(false);

  const downloadLink = useMemo(
    () =>
      getDownloadLink({
        apiBaseUrl: API_BASE_URL,
        viewId,
        selectedFilters,
      }),
    [viewId, selectedFilters]
  );

  if (disabled) {
    return (
      <aside className="action-rail disabled">
        <button className="rail-btn table" disabled aria-label="Table view"><TableViewIcon dark /></button>
        <button className="rail-btn clear" disabled aria-label="Clear filters"><DeleteIcon /></button>
        <button className="rail-btn download" disabled aria-label="Download"><DownloadIcon /></button>
      </aside>
    );
  }

  return (
    <>
      <aside className="action-rail">
        <button
          className={`rail-btn table ${view === null ? 'active' : ''}`}
          disabled={view === null}
          onClick={() => setView(null)}
          aria-label="Table view"
        >
          <TableViewIcon dark />
        </button>
        <button
          className={`rail-btn clear ${view === 'clear' ? 'active' : ''}`}
          disabled={view === 'clear'}
          onClick={() => setView('clear')}
          aria-label="Clear filters"
        >
          <DeleteIcon />
        </button>
        <button
          className={`rail-btn download ${view === 'download' ? 'active' : ''}`}
          disabled={view === 'download'}
          onClick={() => setView('download')}
          aria-label="Download"
        >
          <DownloadIcon />
        </button>
      </aside>

      {view === 'clear' ? (
        <div className="action-popover">
          <h4>Clear all data</h4>
          <p>Any table configuration will be lost if you clear the data.</p>
          <div className="confirm-actions">
            <button
              onClick={() => {
                onClearFilters();
                setView(null);
              }}
            >
              Clear
            </button>
            <button onClick={() => setView(null)}>Cancel</button>
          </div>
        </div>
      ) : null}

      {view === 'download' ? (
        <div className="action-popover">
          <h4>Download data</h4>
          <a href={FTP_DOWNLOAD_URL} target="_blank" rel="noreferrer">
            Get data from the ftp site
          </a>
          <div className="confirm-actions">
            <a
              href={downloadLink}
              download
              onClick={() => {
                setDownloadStarted(true);
                window.setTimeout(() => setDownloadStarted(false), 2000);
              }}
            >
              {downloadStarted ? 'Starting...' : 'Download'}
            </a>
            <button onClick={() => setView(null)}>Cancel</button>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default ActionButtons;
