import { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL, FTP_DOWNLOAD_URL } from '@utils/common/constants';
import { getDownloadLink } from '@utils/download';
import styles from './ActionButtons.module.css';

type ActionView = 'columns' | 'clear' | 'download' | null;

type Props = {
  viewId: string | number;
  selectedFilters: Array<{ category: string; value: string }>;
  columns: Array<{ id: string; label: string }>;
  hiddenColumnIds: string[];
  disabled?: boolean;
  onClearFilters: () => void;
  onHiddenColumnsChange: (columnIds: string[]) => void;
};

const ActionButtons = ({
  viewId,
  selectedFilters,
  columns,
  hiddenColumnIds,
  disabled,
  onClearFilters,
  onHiddenColumnsChange,
}: Props) => {
  const [view, setView] = useState<ActionView>(null);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const selectableColumnIds = useMemo(() => columns.map(column => column.id), [columns]);

  const downloadLink = useMemo(
    () =>
      getDownloadLink({
        apiBaseUrl: API_BASE_URL,
        viewId,
        selectedFilters,
      }),
    [viewId, selectedFilters]
  );

  useEffect(() => {
    if (!view) return;

    const onDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!popoverRef.current || !target) return;
      if (!popoverRef.current.contains(target)) {
        setView(null);
      }
    };

    document.addEventListener('mousedown', onDocumentMouseDown);
    return () => {
      document.removeEventListener('mousedown', onDocumentMouseDown);
    };
  }, [view]);

  if (disabled) {
    return (
      <aside className={`${styles.rail} ${styles.railDisabled}`}>
        <ActionIconButton type="table" label="View table" disabled />
        <ActionIconButton type="columns" label="Select columns" disabled />
        <ActionIconButton type="clear" label="Clear filters" disabled />
        <ActionIconButton type="download" label="Download" disabled />
      </aside>
    );
  }

  return (
    <>
      <aside className={styles.rail}>
        <ActionIconButton
          type="table"
          active={view === null}
          disabled={view === null}
          onClick={() => setView(null)}
          label="View table"
        />
        <ActionIconButton
          type="columns"
          active={view === 'columns'}
          disabled={view === 'columns'}
          onClick={() => setView('columns')}
          label="Select columns"
        />
        <ActionIconButton
          type="clear"
          active={view === 'clear'}
          disabled={view === 'clear'}
          label="Clear filters"
          onClick={() => setView('clear')}
        />
        <ActionIconButton
          type="download"
          active={view === 'download'}
          disabled={view === 'download'}
          onClick={() => setView('download')}
          label="Download"
        />
      </aside>

      {view === 'columns' ? (
        <div ref={popoverRef} className={[styles.popover, styles.columnsPopover].join(' ')}>
          <h4 className={styles.popoverTitle}>Select columns to display</h4>
          <div className={styles.columnsActions}>
            <button
              type="button"
              className={styles.popoverButton}
              onClick={() => onHiddenColumnsChange([])}
            >
              Select all
            </button>
            <button
              type="button"
              className={styles.popoverButton}
              onClick={() => onHiddenColumnsChange(selectableColumnIds)}
            >
              Deselect all
            </button>
          </div>
          <div className={styles.columnsList}>
            {columns.map(column => (
              <label key={column.id} className={styles.columnOption}>
                <input
                  type="checkbox"
                  checked={!hiddenColumnIds.includes(column.id)}
                  onChange={() =>
                    onHiddenColumnsChange(
                      hiddenColumnIds.includes(column.id)
                        ? hiddenColumnIds.filter(id => id !== column.id)
                        : [...hiddenColumnIds, column.id]
                    )
                  }
                />
                <span>{column.label}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {view === 'clear' ? (
        <div ref={popoverRef} className={[styles.popover, styles.clearPopover].join(' ')}>
          <h4 className={styles.popoverTitle}>Clear all data</h4>
          <p className={styles.clearMessage}>
            Any configuration of the table will be lost if you clear the data — do you wish to
            continue?
          </p>
          <div className={styles.confirmActions}>
            <button
              type="button"
              className={styles.popoverButton}
              onClick={() => {
                onClearFilters();
                setView(null);
              }}
            >
              Clear
            </button>
            <button type="button" className={styles.popoverButton} onClick={() => setView(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {view === 'download' ? (
        <div ref={popoverRef} className={[styles.popover, styles.downloadPopover].join(' ')}>
          <h4 className={styles.popoverTitle}>Download data</h4>
          <a
            className={styles.ftpLink}
            href={FTP_DOWNLOAD_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLinkIcon />
            Get data from the ftp site
          </a>
          <div className={styles.confirmActions}>
            <a
              className={styles.popoverLink}
              href={downloadLink}
              download
              onClick={() => {
                setDownloadStarted(true);
                window.setTimeout(() => setDownloadStarted(false), 2000);
              }}
            >
              {downloadStarted ? 'Starting...' : 'Download'}
            </a>
            <button type="button" className={styles.cancelButton} onClick={() => setView(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
};

type ActionIconButtonProps = {
  type: 'table' | 'columns' | 'clear' | 'download';
  label: string;
  disabled?: boolean;
  active?: boolean;
  onClick?: () => void;
};

const ActionIconButton = ({ type, label, disabled, active, onClick }: ActionIconButtonProps) => (
  <button
    type="button"
    className={[styles.iconButton, active ? styles.iconButtonActive : ''].filter(Boolean).join(' ')}
    disabled={disabled}
    onClick={onClick}
    aria-label={label}
    title={label}
  >
    {type === 'table' ? <TableIcon /> : null}
    {type === 'columns' ? <ColumnsIcon /> : null}
    {type === 'clear' ? <DeleteIcon /> : null}
    {type === 'download' ? <DownloadIcon /> : null}
  </button>
);

const ColumnsIcon = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <path d="M3.5 4.5h7v23h-7zM12.5 4.5h7v23h-7zM21.5 4.5h7v23h-7z" />
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

const ExternalLinkIcon = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <path d="M22,5.2l-0.1,0.1L13.4,14c-1,1-1,2.5,0,3.5l1.2,1.2c1,1,2.5,1,3.5,0l8.5-8.7l0.1-0.1l2.6,2.7c1,1,1.7,0.6,1.7-0.7V1.8C31,1.4,30.6,1,30.2,1h-9.8c-1.4,0-1.7,0.8-0.7,1.8L22,5.2z M6,1C3.2,1,1,3.2,1,6v20c0,2.8,2.2,5,5,5h20c2.8,0,5-2.2,5-5V13.1v7.1L26,16v7.5c0,1.4-1.1,2.5-2.5,2.5h-15C7.1,26,6,24.9,6,23.5v-15C6,7.1,7.1,6,8.5,6H16l-4.2-5h7.1H6z" />
  </svg>
);

export default ActionButtons;
