import { html, css, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { SignalWatcher } from '@lit-labs/signals';

import '@ensembl/ensembl-elements-common/components/icon-buttons/expand-button/expand-button.js';

import './top-panel-navigation/top-panel-navigation';
import './top-panel-navigation/top-panel-navigation-collapsed';
import './filters-area/filters-area';

import resetStyles from '@ensembl/ensembl-elements-common/styles/constructable-stylesheets/resets.js';
import { panelStyles } from '../panel/shared-panel-styles';


@customElement('top-panel')
export class TopPanel extends SignalWatcher(LitElement) {

  static styles = [
    resetStyles,
    panelStyles,
    css`
      :host {
        box-sizing: border-box;
        position: relative;
        height: var(--amr-top-panel-height, 360px);
      }

      :host:has(top-panel-navigation-collapsed) {
        display: flex;
        align-items: center;
      }

      .full-content-container {
        height: 100%;
        display: grid;
        grid-template-columns: auto 1fr;
        column-gap: 1rem;
      }

      .toggle-container {
        position: absolute;
        right: 0;
        top: 0;
        transform: translateX(80%);
        background-color: var(--color-white);
        padding-top: 14px;
        padding-bottom: 14px;
        padding-right: 14px;
        border-radius: var(--panel-border-radius);
      }
    `
  ];

  @property({ type: Boolean, attribute: 'collapsed', reflect: true })
  isCollapsed = false;

  #togglePanelCollapsed = () => {
    this.isCollapsed = !this.isCollapsed;
  }

  render() {
    const panelContent = this.isCollapsed
      ? this.#renderCollapsed()
      : this.#renderExpanded();

    return html`
      ${panelContent}
      ${this.#renderToggle()}
    `;
  }

  #renderExpanded() {
    return html`
      <div class="full-content-container">
        <top-panel-navigation></top-panel-navigation>
        <filters-area></filters-area>
      </div>
    `;
  }

  #renderCollapsed() {
    return html`
      <top-panel-navigation-collapsed
        @top-panel-expand-click=${this.#togglePanelCollapsed}
      ></top-panel-navigation-collapsed>
    `;
  }

  #renderToggle() {
    const buttonLabel = this.isCollapsed
      ? 'Expand the panel'
      : 'Collapse the panel';
    
    return html`
      <div class="toggle-container">
        <ens-expand-button
          ?expanded=${!this.isCollapsed}
          @click=${this.#togglePanelCollapsed}
          label=${buttonLabel}
        ></ens-expand-button>
      </div>
    `
  }

}