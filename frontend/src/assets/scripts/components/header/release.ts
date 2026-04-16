import appConfig from '../../configs/app-config';

type ReleaseInfo = {
  label: string;
}

export class AMRHeaderRelease extends HTMLElement {

  connectedCallback() {
    const releaseEndpoint = `${appConfig.apiBaseUrl}/release`;
    fetch(releaseEndpoint)
      .then(response => response.json())
      .then((data: ReleaseInfo) => this.#onReleaseDataFetched(data));
  }

  #onReleaseDataFetched(data: ReleaseInfo) {
    const releaseLabel = data.label;
    const releaseLabelContainer = this.querySelector('.data-release-date');
    if (releaseLabelContainer) {
      // this should always be the case
      releaseLabelContainer.textContent = releaseLabel;
      this.dataset.fetched = 'true';
    }
  }

}

customElements.define('amr-header-release', AMRHeaderRelease);