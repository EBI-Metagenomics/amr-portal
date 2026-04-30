import { html, css, LitElement } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { SignalWatcher } from '@lit-labs/signals';

import { getDataProvider, BackendInterface } from '../data-provider/dataProvider';

import filtersStore from '../state/filtersStore';
import Router from '../router/router';

import '../components/header/release';
import '../components/top-panel/top-panel';
import '../components/bottom-panel/bottom-panel';

import '@ensembl/ensembl-elements-common/embl-ebi-components/page-header/page-header.js';
import '@ensembl/ensembl-elements-common/embl-ebi-components/page-footer/page-footer.js';

export type SelectedFilter = {
  category: string;
  value: string;
};

// We are expected to store filters independently against different views
export type SelectedFiltersState = Record<string, SelectedFilter[]>;

@customElement('amr-app')
export class AMRApp extends SignalWatcher(LitElement) {
  static styles = css`
    :host {
      box-sizing: border-box;
      display: grid;
      grid-template-rows: auto 1fr;
      row-gap: 20px;
      overflow: hidden;
    }
    
    top-panel[collapsed],
    top-panel[collapsed] + bottom-panel {
      --amr-top-panel-height: 60px;
    }
  `;

  @state()
  dataProvider: BackendInterface | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.initialise();
  }

  initialise = async () => {
    await this.getDataProvider();
    const filtersConfig = await this.dataProvider!.getFiltersConfig();
    
    filtersStore.setFiltersConfig(filtersConfig);

    Router.init(filtersConfig);
    Router.setViewFromUrl();
  }

  getDataProvider = async () => {
    // const provider = 'local';
    const provider = 'api';
    this.dataProvider = await getDataProvider({ provider });
  }  

  render() {
    const filtersConfig = filtersStore.filtersConfig.get();

    if (!this.dataProvider || !filtersConfig) {
      return html`
        <p>Loading...</p>
      `;
    }

    const selectedFilters = filtersStore.selectedFiltersForViewMode.get();

    return html`
      <top-panel></top-panel>
      <bottom-panel
        .dataProvider=${this.dataProvider}
        .selectedFilters=${selectedFilters}
      ></bottom-panel>
    `;
  }

}