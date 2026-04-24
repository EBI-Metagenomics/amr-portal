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
        <button className="rail-btn table" disabled aria-label="Table view">☰</button>
        <button className="rail-btn clear" disabled aria-label="Clear filters">✕</button>
        <button className="rail-btn download" disabled aria-label="Download">↓</button>
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
          ☰
        </button>
        <button
          className={`rail-btn clear ${view === 'clear' ? 'active' : ''}`}
          disabled={view === 'clear'}
          onClick={() => setView('clear')}
          aria-label="Clear filters"
        >
          ✕
        </button>
        <button
          className={`rail-btn download ${view === 'download' ? 'active' : ''}`}
          disabled={view === 'download'}
          onClick={() => setView('download')}
          aria-label="Download"
        >
          ↓
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
