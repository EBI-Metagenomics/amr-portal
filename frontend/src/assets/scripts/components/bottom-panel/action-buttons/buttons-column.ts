import { html, css, nothing } from 'lit';

import { actionView, setActionView } from './state';

import '@ensembl/ensembl-elements-common/components/icon-buttons/delete-button/delete-button.js';
import '@ensembl/ensembl-elements-common/components/icon-buttons/download-button/download-button.js';
import '@ensembl/ensembl-elements-common/components/icon-buttons/table-view-button/table-view-button.js';

export const styles = css`
  .buttons-column {
    display: flex;
    flex-direction: column;
    row-gap: 30px;
    background-color: var(--buttons-column-color, transparent);
    padding: 30px 15px 30px 0;
    border-radius: var(--panel-border-radius);

    .active {
      --icon-button-disabled-color: var(--color-black);
    }
  }
`;

const onTableButtonClick = () => {
  setActionView(null);
};

const onDeleteButtonClick = () => {
  setActionView('clear');
};

const onDownloadButtonClick = () => {
  setActionView('download');
}

export const renderButtonsColumn = () => {
  const view = actionView.get();

  return html`
    <div class="buttons-column">
      <ens-table-view-button
        @click=${onTableButtonClick}
        ?disabled=${view === null}
        class=${view === null ? 'active' : nothing}
      ></ens-table-view-button>
      <ens-delete-button
        @click=${onDeleteButtonClick}
        ?disabled=${view === 'clear'}
        class=${view === 'clear' ? 'active' : nothing}
        label="Clear filters"
      ></ens-delete-button>
      <ens-download-button
        @click=${onDownloadButtonClick}
        class=${view === 'download' ? 'active' : nothing}
        ?disabled=${view === 'download'}
      ></ens-download-button>
    </div>
  `;
};