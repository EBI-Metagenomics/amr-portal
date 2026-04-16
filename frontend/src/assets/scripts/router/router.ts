/**
 * This is the router for the main client-side app.
 * Its only responsibility so far is to respond to the `view` query parameter,
 * and to change the view accordingly.
 */

import filtersStore from '../state/filtersStore';

import type { FiltersConfig, FiltersView } from '../types/filters/filtersConfig';

class Router {

  static config: FiltersConfig;

  static init(config: FiltersConfig) {
    this.config = config;
    this.#setListeners();
  }

  // This method sets listener for the popstate event, which is produced on back/forward navigation
  // If we just use replaceState, this method won't be necessary
  static #setListeners() {
    window.addEventListener('popstate', () => {
      this.setViewFromUrl();
    });      
  }

  static setViewFromUrl() {
    // read view parameter from the url
    const url = new URL(window.location.href);
    const searchParams = url.searchParams;
    const viewParam = searchParams.get('view');

    // validate the view parameter
    const config = this.config;

    let viewId;
    
    if (viewParam) {
      const view = config.filterViews.find(view => view.url_name === viewParam);
      viewId = view?.id;
    }

    // set the view
    if (viewId) {
      this.setView(viewId);
    } else {
      // in case there is no view parameter in the url,
      // or if no corresponding view has been found,
      // enable the first view
      const firstView = config.filterViews[0];
      const viewId = firstView.id;
      this.changeView(viewId);
    }
  }

  static changeView(viewId: FiltersView['id']) {
    const filtersConfig = this.config;
    const view = filtersConfig.filterViews.find(view => view.id === viewId);

    if (!view) {
      // this shouldn't happen
      return;
    }

    // Change the view parameter in the url
    // (use a history replace so as not to add this to history)
    const url = new URL(window.location.href);
    url.searchParams.set('view', view.url_name);
    window.history.replaceState(null, '', url);

    this.setView(viewId);
  }

  static setView(viewId: FiltersView['id']) {
    filtersStore.setViewMode(viewId);
  }

}

export default Router;