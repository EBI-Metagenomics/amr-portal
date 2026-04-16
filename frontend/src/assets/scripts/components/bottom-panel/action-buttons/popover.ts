import { html, css, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { SignalWatcher } from '@lit-labs/signals';

import '@ensembl/ensembl-elements-common/components/button/button.js';
import '@ensembl/ensembl-elements-common/components/text-button/text-button.js';
import '@ensembl/ensembl-elements-common/components/button-link/button-link.js';
import '@ensembl/ensembl-elements-common/components/external-link/external-link.js';

import appConfig from '../../../configs/app-config';
import { actionView, setActionView } from './state';
import filtersStore from '../../../state/filtersStore';
import { focusFirstEligibleChild } from '../../../utils/focus-utils';
import { checkOutsideClick } from '../../../utils/check-outside-click';

import {
  styles as buttonsColumnStyles,
  renderButtonsColumn
} from './buttons-column';

import type { BackendInterface } from '../../../data-provider/backendInterface';

/**
 * Ideally, this would use the html popover api,
 * because the popover api comes with light-dismiss
 * and with proper handling of keyboard interactions (focus trapping, close on escape).
 * However, a native popover would require a working css anchor positioning,
 * which is still not supported by all our target browsers
 */


@customElement('bottom-panel-action-buttons-popover')
export class ActionButtonsPopover extends SignalWatcher(LitElement) {

  static styles = [
    buttonsColumnStyles,
    css`
      :host {
        --buttons-column-color: transparent;
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        background-color: var(--color-light-grey);
        border-radius: var(--panel-border-radius);
        padding-left: 40px;
        padding-bottom: 30px;
        display: grid;
        grid-template-columns: 1fr auto;
        width: 600px;
      }

      .clear-content {
        display: grid;
        grid-template-columns: 1fr auto;
        grid-template-rows: auto 1fr;
        column-gap: 60px;
        row-gap: 24px;
        grid-template-areas:
          'title title'
          'message buttons';
        padding-right: 70px;

        .title {
          grid-area: title;
          font-weight: var(--font-weight-bold);
          padding-top: 30px; // same as for the buttons column
        }

        .message {
          grid-area: message;
          color: var(--color-red);
        }

        .action-buttons {
          grid-area: buttons;
          display: flex;
          align-items: center;
          align-self: start;
          column-gap: 40px;
        }
      }

      .download-content {
        display: grid;
        grid-template-columns: 1fr auto;
        grid-template-rows: auto 1fr;
        column-gap: 60px;
        row-gap: 24px;
        align-self: start;
        align-items: center;
        grid-template-areas:
          'title title'
          'ftp-link buttons';
        padding-right: 70px;

        .title {
          grid-area: title;
          font-weight: var(--font-weight-bold);
          padding-top: 30px; // same as for the buttons column
        }

        .action-buttons {
          grid-area: buttons;
          display: flex;
          align-items: center;
          align-self: start;
          column-gap: 40px;
        }

        .download-started-button::part(button) {
          background-color: transparent;
          border: 1px solid var(--color-grey);
          color: black;
        }

        .ftp-link {
          grid-area: ftp-link;
        }
      }
    `
  ]

  @property({ type: Object })
  dataProvider!: BackendInterface;

  @state()
  shouldShowDownloadStarted = false;

  protected firstUpdated() {
    focusFirstEligibleChild(this.shadowRoot as ShadowRoot);
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('keyup', this.#onKeyPress);
    document.addEventListener('mousedown', this.#checkOutsideClick);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keyup', this.#onKeyPress);
    document.removeEventListener('mousedown', this.#checkOutsideClick);
  }

  #checkOutsideClick = (event: MouseEvent) => {
    const { isClickOutside } = checkOutsideClick({
      event,
      element: this
    });

    if (isClickOutside) {
      setActionView(null);
    }
  }

  #onKeyPress = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      this.#hidePopover();
    }
  }

  #hidePopover() {
    actionView.set(null);
  }

  #onClear() {
    filtersStore.clearAllFilters();
    actionView.set(null);
  }

  #onDownloadClick = () => {
    this.shouldShowDownloadStarted = true;

    setTimeout(() => {
      this.shouldShowDownloadStarted = false;
    }, 2000);
  }

  #getDownloadLink() {
    const viewId = filtersStore.viewMode.get();
    const selectedFilters = filtersStore.selectedFiltersForViewMode.get();
    const payload = {
      view_id: viewId as string | number,
      selected_filters: selectedFilters,
    };
    const stringifiedPayload = JSON.stringify(payload);
    const base64Payload = btoa(stringifiedPayload);
    const url = new URL(`${appConfig.apiBaseUrl}/amr-records/download`, document.baseURI);
    url.searchParams.set('payload', base64Payload);

    return url.toString();
  }

  render() {
    const view = actionView.get();

    if (view === 'clear') {
      return this.renderClearContent();
    } else if (view === 'download') {
      return this.renderDownloadContent();
    }
  }

  renderClearContent() {
    return html`
      <div class="clear-content">
        <div class="title">
          Clear all data
        </div>
        <div class="message">
          Any configuration of the table will be lost if you clear the data —
          do you wish to continue?
        </div>
        <div class="action-buttons">
          <ens-button
            variant="action"
            @click=${this.#onClear}
            autofocus
          >
            Clear
          </ens-button>
          <ens-text-button @click=${this.#hidePopover}>
            Cancel
          </ens-text-button>
        </div>
      </div>
      ${renderButtonsColumn()}
    `;
  }

  renderDownloadContent() {
    return html`
      <div class="download-content">
        <div class="title">
          Download data
        </div>
        <div class="ftp-link">
          <ens-external-link href="https://ftp.ebi.ac.uk/pub/databases/amr_portal">
            Get data from the ftp site
          </ens-external-link>
        </div>
        <div class="action-buttons">
          ${this.shouldShowDownloadStarted
            ? this.renderDownloadStartedButton()
            : this.renderDownloadLink()
          }
          <ens-text-button @click=${this.#hidePopover}>
            Cancel
          </ens-text-button>
        </div>
      </div>
      ${renderButtonsColumn()}
    `;
  }

  renderDownloadLink() {
    return html`
      <ens-button-link
        variant="action"
        href=${this.#getDownloadLink()}
        download
        @click=${this.#onDownloadClick}
      >
        Download
      </ens-button-link>
    `;
  }

  renderDownloadStartedButton() {
    return html`
      <ens-button class="download-started-button" disabled>
        Starting...
      </ens-button>
    `;
  }



}