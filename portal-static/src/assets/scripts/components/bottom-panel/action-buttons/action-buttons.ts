import { html, css, nothing, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { SignalWatcher } from '@lit-labs/signals';

import { actionView } from './state';

import './popover';

import {
  styles as buttonsColumnStyles,
  renderButtonsColumn
} from './buttons-column';

import type { BackendInterface } from '../../../data-provider/dataProvider';

@customElement('bottom-panel-action-buttons')
export class ActionButtons extends SignalWatcher(LitElement) {

  @property({ type: Object })
  dataProvider!: BackendInterface;

  static styles = [
    buttonsColumnStyles,
    css`
      :host {
        --buttons-column-color: var(--color-white);
        position: absolute;
        right: 0;
        transform: translateX(calc(100% - 10px));
        z-index: 1;
      }

      :host([inert]) {
        --icon-button-color: var(--color-grey);
      }
    `
  ]

  render() {
    const view = actionView.get();
    const shouldShowPopover = !!view;

    return html`
      ${renderButtonsColumn()}
      ${ shouldShowPopover ? html`
        <bottom-panel-action-buttons-popover .dataProvider=${this.dataProvider}>
        </bottom-panel-action-buttons-popover>
      ` : nothing}
    `;
  }

}