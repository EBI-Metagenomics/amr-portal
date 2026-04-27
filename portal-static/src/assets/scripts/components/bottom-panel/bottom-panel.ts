import { html, css, render, LitElement, PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { SignalWatcher } from '@lit-labs/signals';
import { effect } from 'signal-utils/subtle/microtask-effect';
import { ifDefined } from 'lit/directives/if-defined.js';

import biosampleStore from '../../state/biosampleStore';
import filtersStore from '../../state/filtersStore';

import '@ensembl/ensembl-elements-common/components/external-link/external-link.js';
import '@ensembl/ensembl-elements-common/components/select/select.js';
import '@ensembl/ensembl-elements-common/components/paginator/paginator.js';
import '@ensembl/ensembl-elements-common/components/table/sortable-column-header.js';
import '@ensembl/ensembl-elements-common/components/icon-buttons/delete-button/delete-button.js';
import '@ensembl/ensembl-elements-common/components/icon-buttons/download-button/download-button.js';
import '@ensembl/ensembl-elements-common/components/icon-buttons/table-view-button/table-view-button.js';
import './action-buttons/action-buttons';

import tableStyles from '@ensembl/ensembl-elements-common/styles/constructable-stylesheets/table.js';

import type { BackendInterface } from '../../data-provider/dataProvider';
import type { AMRRecord, AMRRecordField, LinkData, LinkArrayData } from '../../types/amrRecord';
import type { AMRRecordsResponse } from '../../data-provider/backendInterface';
import type { FiltersView } from '../../types/filters/filtersConfig';

import { panelStyles } from '../panel/shared-panel-styles';

@customElement('bottom-panel')
export class BottomPanel extends SignalWatcher(LitElement) {

  biosamplesResource: ReturnType<typeof biosampleStore.createBiosampleResource> | null = null;

  static styles = [
    tableStyles,
    panelStyles,
    css`
      :host {
        position: relative;
        box-sizing: border-box;
        display: grid;
        grid-template-rows: auto 1fr;
        padding-top: 24px;
        padding-left: 30px;
        padding-right: 30px;
        min-height: 360px;
        height: calc(100vh - var(--amr-header-height) - var(--amr-subheader-height) - var(--amr-top-panel-height) - 20px - 20px);
      }

      .table-controls-area {
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        column-gap: 1.5rem;
        padding-bottom: 1rem;
      }

      .table-container {
        overflow: auto;
        white-space: nowrap;
      }

      .per-page-container {
        display: flex;
        align-items: center;
        column-gap: 1rem;
      }

      .per-page-label {
        font-weight: var(--font-weight-light);
      }

      .error {
        color: var(--color-red);
      }

      .initial-content {
        --icon-button-height: 20px;
        --icon-button-width: 20px;
        display: grid;
        grid-template-columns: auto 1fr;
        column-gap: 30px;
        row-gap: 30px;

        .strong {
          --icon-button-disabled-color: var(--color-black);
          font-weight: var(--font-weight-bold);
        }
      }
    `
  ];

  @property({ type: Object })
  dataProvider!: BackendInterface;

  unwatchFiltersStore: ( () => void ) | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.initialise();
  }

  disconnectedCallback() {
    this.unwatchFiltersStore?.();
    super.disconnectedCallback();
  }

  protected update(changedProperties: PropertyValues) {
    try {
      super.update(changedProperties);
    } catch (e) {
      render(this.#renderError(), this.renderRoot, this.renderOptions);
    }
  }

  initialise() {
    this.unwatchFiltersStore = effect(() => {
      const filters = filtersStore.selectedFiltersForViewMode.get();
      const view = filtersStore.viewMode.get();
      biosampleStore.setFilters({
        filters,
        viewId: view as FiltersView['id']
      });
    });

    const biosamplesResource = biosampleStore.createBiosampleResource({
      dataProvider: this.dataProvider
    });
    this.biosamplesResource = biosamplesResource;
  }

  onPageChange = (event: CustomEvent<number>) => {
    const page = event.detail;
    biosampleStore.setPage(page);
  }

  onPerPageChange = (event: Event) => {
    const selectElement = event.target as HTMLSelectElement;
    const newValue = parseInt(selectElement.value);
    biosampleStore.setPerPage(newValue);
  }

  onOrderChange = (category: string) => {
    biosampleStore.setOrder(category);
  }
 
  render() {
    const view = filtersStore.viewMode.get();
    const biosamplesResource = this.biosamplesResource;
    const selectedFilters = filtersStore.selectedFiltersForViewMode.get();
    const isComplete = biosamplesResource?.status === 'complete';
    const hasData = biosamplesResource?.value?.requestParams.viewId === view
      && Boolean(biosamplesResource?.value?.data.length);
    const isError = Boolean(biosamplesResource?.error);
    const isLoading = !biosamplesResource || biosamplesResource?.status === 'pending' && !hasData;

    try {
      return this.#doRender({
        isInitial: !selectedFilters.length,
        isError,
        isComplete,
        hasData,
        isLoading,
        data: biosamplesResource?.value as AMRRecordsResponse ?? null
      })
    } catch {
      return html`
        <p>There has been an error rendering the table</p>
      `
    }
  }

  #renderError({ isLoadingError }: { isLoadingError?: boolean } = {}) {
    const errorMessage = isLoadingError
      ? html`
        <p class="error">There has been an error retrieving the data.</p>
      ` : html`
        <p class="error">An error occurred during the rendering of the data.</p>
      `;

    return html`
      ${errorMessage}
      ${this.#renderActionButtons({ disabled: true })}
    `;
  }

  #doRender({
    isInitial,
    isError,
    isLoading,
    isComplete,
    hasData,
    data
  }: {
    isInitial: boolean;
    isError: boolean;
    isComplete: boolean;
    hasData: boolean;
    isLoading: boolean;
    data: AMRRecordsResponse | null;
  }) {
    if (isInitial) {
      return this.#renderInitial();
    }

    if (isError) {
      return this.#renderError({ isLoadingError: true });
    }

    if (isLoading) {
      return html`
        <p>Loading...</p>
        ${this.#renderActionButtons({ disabled: true })}
      `
    }

    if (isComplete && !hasData) {
      return html`
        <p>No data</p>
        ${this.#renderActionButtons({ disabled: true })}
      `
    }

    if (data) {
      const { meta, data: records } = data;

      return html`
        ${this.renderTableControlsArea({ responseMeta: meta })}
        <div class="table-container">
          ${this.renderTable(records)}
        </div>
        ${this.#renderActionButtons()}
      `;      
    }

  }

  #renderActionButtons({
    disabled
  }: { disabled?: boolean } = {}) {
    return html`
      <bottom-panel-action-buttons
        ?inert=${disabled}
        .dataProvider=${this.dataProvider}
      >
      </bottom-panel-action-buttons>
    `;
  }

  #renderInitial() {
    return html`
      <div class="initial-content">
        <ens-table-view-button disabled class="strong"></ens-table-view-button>
        <span class="strong">Select data from the options above to start</span>

        <ens-delete-button disabled></ens-delete-button>
        <span>Select to clear</span>

        <ens-download-button disabled></ens-download-button>
        <span>Select to download</span>
       </div>
       ${this.#renderActionButtons({ disabled: true })}
    `;
  }


  renderTableControlsArea({
    responseMeta
  }: {
    responseMeta: AMRRecordsResponse['meta']
  }) {
    return html`
      <div class="table-controls-area">
        ${this.renderPerPageSelector()}
        ${this.renderPaginator({ responseMeta })}
        ${this.renderTotalHitsCount({ responseMeta })}
      </div>
    `;
  }

  renderPerPageSelector() {
    const values = [100, 200, 500, 1000];
    const currenValue = biosampleStore.perPage.get();

    const optionElements = values.map(value => html`
      <option
        value=${value}
        ?selected=${value===currenValue}
      >
        ${value}
      </option>
    `);

    return html`
      <div class="per-page-container">
        <ens-select>
          <select
            aria-label="Table rows per page"
            @change=${this.onPerPageChange}
          >
            ${optionElements}
          </select>
        </ens-select>
        <span class="per-page-label">
          per page
        </span>
      </div>
    `;
  }

  renderPaginator({
    responseMeta
  }: {
    responseMeta: AMRRecordsResponse['meta']
  }) {
    const currentPage = biosampleStore.page.get();
    const { per_page, total_hits } = responseMeta;
    const totalPages = Math.ceil(total_hits / per_page);

    return html`
      <ens-paginator
        current-page=${currentPage}
        total-pages=${totalPages}
        @ens-paginator-page-change=${this.onPageChange}
      ></ens-paginator>
    `;
  }


  renderTable(data: AMRRecord[]) {
    return html`
      <table class="ens-table">
        <thead class="sticky-table-head">
          <tr>
            ${this.renderTableColumnNames(data[0])}
          </tr>
        </thead>
        <tbody>
          ${data.map(rowData => this.renderTableRow(rowData))}
        </tbody>
      </table>
    `;
  }

  renderTableColumnNames = (fields: AMRRecord) => {
    const columnsMap = filtersStore.amrTableColumnsMap.get();

    if (!columnsMap) {
      // this should not happen
      return null;
    }

    return repeat(fields, (field) => field.column_id, (field) => {
      const column = columnsMap[field.column_id];

      if (column.sortable) {
        return html`
          <th>
            <ens-table-sortable-column-head
              sort-order=${ifDefined(this.getSortOrderFor(field.column_id))}
              @click=${() => this.onOrderChange(field.column_id)}
            >
              ${ column.label }
            </ens-table-sortable-column-head>
          </th>
        `;
      }

      return html`
        <th>${ column.label }</th>
      `;
    });
  };

  renderTableRow = (record: AMRRecord) => {
    const cells = repeat(record, (field) => field.column_id, (field) => {
      let cellContent;
      if (isLinkArray(field)) {
        cellContent = this.renderLinks(field);
      } else if (isLink(field)) {
        cellContent = this.renderLink(field);
      } else {
        cellContent = field.value;
      }

      return html`
        <td>${ cellContent }</td>
      `;
    });

    return html`
      <tr>
        ${cells}
      </tr>
    `;
  };

  renderLink(data: LinkData) {
    if (!data.value) {
      return null;
    } else if (!data.url) {
      // semantically, this should not happen; but nothing in the data types guards against this 
      return data.value;
    }

    return html`
      <ens-external-link href="${data.url}">
        ${data.value}
      </ens-external-link>
    `;
  }

  renderLinks(data: LinkArrayData) {
    if (!data.values.length) {
      return null;
    }

    return data.values.map((linkData, index) => {
      const isLastLink = index === data.values.length - 1;

      return html`
        <ens-external-link href="${linkData.url}">
          ${linkData.value}
        </ens-external-link>
        ${!isLastLink ? ', ' : null}
      `;
    });
  }

  renderTotalHitsCount = ({
    responseMeta
  }: {
    responseMeta: AMRRecordsResponse['meta']
  }) => {
    const { total_hits } = responseMeta;

    return html`
      <span class="total-hits">
        <span>${ total_hits }</span>
        <span class="total-hits-label">
          results
        </span>
      </span>
    `
  }

  getSortOrderFor = (category: string) => {
    const sortOrder = biosampleStore.order.get();
    if (sortOrder?.category === category) {
      return sortOrder.order;
    } else {
      return null;
    }
  };

}


const isLinkArray = (data: AMRRecordField): data is LinkArrayData => {
  return data.type === 'array-link';
}

const isLink = (data: AMRRecordField): data is LinkData => {
  return data.type === 'link';
}