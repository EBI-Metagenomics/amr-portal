import { html, css, LitElement } from 'lit';
import { property, customElement } from 'lit/decorators.js';

/**
 * It isn't quite clear how reusable this component is.
 * Something resembling it has been used in ensembl-client (e.g. in the BLAST view);
 * but there, it has different colours.
 */

@customElement('circle-counter')
export class CircleCounter extends LitElement {
  static styles = css`
    :host {
      min-width: 18px;
      height: 18px;
      border-radius: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--circile-counter-color, var(--color-green));
      color: white;
      font-weight: var(--font-weight-bold);
      padding: 2px;
    }

    :host([dimmed]) {
      background-color: var(--circile-counter-dimmed-color, var(--color-grey));
    }
  `

  @property({ type: Boolean })
  dimmed: boolean = false;

  render() {
    return html`
      <slot></slot>
    `;
  }
}