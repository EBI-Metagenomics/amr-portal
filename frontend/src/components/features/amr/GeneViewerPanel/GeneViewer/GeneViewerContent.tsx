import { useEffect, useRef, useState } from 'react';
import { JBrowseApp, createViewState } from '@jbrowse/react-app2';
import styles from './GeneViewerContent.module.css';

type ViewState = ReturnType<typeof createViewState>;

const isLikelyGeneId = (rawId: string | null): boolean => {
  if (!rawId) return false;
  const id = rawId.trim();
  if (!id) return false;
  if (/(container|tracks?|svg|placeholder|display)/i.test(id)) return false;
  if (!/[A-Za-z]/.test(id) || !/\d/.test(id)) return false;
  if (/\s/.test(id)) return false;
  return true;
};

type Props = {
  viewState: ViewState | null;
  /** When set, highlights the matching gene / locus in track renderers (`window.selectedGeneId`). */
  highlightLocusId?: string | null;
  onFeatureSelect?: (locusTag: string) => void;
};

type HoveredFeature = {
  id: string;
  left: number;
  top: number;
};

function triggerTrackReload(viewState: ViewState) {
  try {
    const session = viewState.session as {
      views?: Array<{
        tracks?: Array<{
          displays?: Array<{ reload?: () => void; setError?: (e: unknown) => void }>;
        }>;
        setWidth?: (w: number) => void;
        width?: number;
      }>;
    };
    const view = session?.views?.[0];
    view?.tracks?.forEach(track => {
      track.displays?.forEach(display => {
        try {
          if (display.reload) display.reload();
          else if (display.setError) display.setError(undefined);
        } catch {
          /* ignore */
        }
      });
    });
  } catch (err) {
    console.warn('Could not trigger JBrowse re-render:', err);
  }
}

function hideEmbeddedChrome(element: HTMLElement) {
  element.style.cssText =
    'display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;';
  element.setAttribute('aria-hidden', 'true');
}

/** JBrowse app-core ViewHeader / ViewMenu test ids (see @jbrowse/app-core/ui/App/ViewHeader.js). */
const HIDDEN_JBROWSE_VIEW_CONTROL_TEST_IDS = ['view_menu_icon', 'close_view', 'minimize_view'] as const;

function hideJBrowseViewChrome(container: HTMLElement | null) {
  if (!container) return;
  for (const testId of HIDDEN_JBROWSE_VIEW_CONTROL_TEST_IDS) {
    container.querySelectorAll(`[data-testid="${testId}"]`).forEach(el => {
      hideEmbeddedChrome(el as HTMLElement);
    });
  }
}

/**
 * Embedded JBrowse linear genome view with METT-style chrome suppression (no app bar / feature drawer).
 */
const GeneViewerContent = ({ viewState, highlightLocusId, onFeatureSelect }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<HoveredFeature | null>(null);

  useEffect(() => {
    const hideMenuBarAndFeaturePanel = () => {
      hideJBrowseViewChrome(containerRef.current);

      const buttons = Array.from(document.querySelectorAll('button[data-testid="dropDownMenuButton"]'));
      const fileButton = buttons.find(btn => btn.textContent?.includes('File'));
      if (fileButton) {
        let parent: HTMLElement | null = fileButton.parentElement;
        while (parent) {
          if (parent.classList.contains('MuiToolbar-root')) {
            const hasSvgLogo = parent.querySelector('svg[viewBox="0 0 641 175"]');
            if (hasSvgLogo) {
              let appBarParent: HTMLElement | null = parent.parentElement;
              while (appBarParent) {
                if (appBarParent.classList.contains('MuiAppBar-root')) {
                  appBarParent.style.display = 'none';
                  return;
                }
                appBarParent = appBarParent.parentElement;
              }
            }
          }
          parent = parent.parentElement;
        }
      }

      const selectorsToHide = [
        '.MuiDrawer-root',
        '.MuiDrawer-modal',
        '.MuiDrawer-paper',
        '.MuiDrawer-docked',
        '[class*="MuiDrawer"]',
        'div[class^="MuiDrawer"]',
        'aside[class*="MuiDrawer"]',
        '[class*="BaseFeatureDetail"]',
        '[class*="FeatureDetails"]',
        '[class*="featureDetails"]',
        '[class*="DrawerWidget"]',
        '[class*="FeatureWidget"]',
        '.MuiBackdrop-root',
        '[class*="MuiBackdrop"]',
        '[role="presentation"]',
        '[aria-label*="drawer"]',
        '[aria-label*="Drawer"]',
        '[class*="MuiPaper-root"]:has([class*="BaseFeature"])',
      ];

      selectorsToHide.forEach(selector => {
        try {
          document.querySelectorAll(selector).forEach(el => {
            const element = el as HTMLElement;
            element.style.cssText = `
                            display: none !important;
                            visibility: hidden !important;
                            opacity: 0 !important;
                            pointer-events: none !important;
                            width: 0px !important;
                            height: 0px !important;
                            overflow: hidden !important;
                            position: fixed !important;
                            top: -9999px !important;
                            left: -9999px !important;
                        `;
            element.setAttribute('aria-hidden', 'true');
          });
        } catch {
          /* invalid selector */
        }
      });
    };

    hideMenuBarAndFeaturePanel();
    const observer = new MutationObserver(() => hideMenuBarAndFeaturePanel());
    observer.observe(document.body, { childList: true, subtree: true });
    const t1 = setTimeout(hideMenuBarAndFeaturePanel, 100);
    const t2 = setTimeout(hideMenuBarAndFeaturePanel, 500);
    const t3 = setTimeout(hideMenuBarAndFeaturePanel, 1000);
    return () => {
      observer.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [viewState]);

  useEffect(() => {
    if (!viewState) return;
    const id = highlightLocusId?.trim();
    if (id) window.selectedGeneId = id;
    else delete window.selectedGeneId;
    if (id) triggerTrackReload(viewState);
  }, [viewState, highlightLocusId]);

  useEffect(() => {
    if (!viewState) return;

    const handleFeatureClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!containerRef.current?.contains(target)) return;
      const featureElement = target.closest('[data-testid]') as HTMLElement | null;
      if (!featureElement) return;
      const featureId = featureElement.getAttribute('data-testid');
      if (!featureId || !isLikelyGeneId(featureId)) return;

      event.stopPropagation();
      event.preventDefault();
      window.selectedGeneId = featureId;
      triggerTrackReload(viewState);
      onFeatureSelect?.(featureId);
    };

    const handleDoubleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!containerRef.current?.contains(target)) return;
      const featureElement = target.closest('[data-testid]') as HTMLElement | null;
      if (!featureElement) return;
      const featureId = featureElement.getAttribute('data-testid');
      if (!isLikelyGeneId(featureId)) return;

      event.stopPropagation();
      event.preventDefault();

      const closeDrawers = () => {
        try {
          const session = viewState.session as {
            widgets?: { has: (id: string) => boolean };
            activeWidgets?: Map<string, { hide?: () => void }>;
            hideWidget?: (w: unknown) => void;
          };
          if (session?.widgets?.has('baseFeature')) {
            const widget = session.activeWidgets?.get('baseFeature');
            if (widget && session.hideWidget) session.hideWidget(widget);
          }
          session?.activeWidgets?.forEach(widget => {
            try {
              widget?.hide?.();
            } catch {
              /* ignore */
            }
          });
        } catch {
          /* ignore */
        }
      };
      closeDrawers();
      setTimeout(closeDrawers, 10);
      setTimeout(closeDrawers, 50);
      setTimeout(closeDrawers, 100);
    };

    document.addEventListener('click', handleFeatureClick, true);
    document.addEventListener('dblclick', handleDoubleClick, true);
    return () => {
      document.removeEventListener('click', handleFeatureClick, true);
      document.removeEventListener('dblclick', handleDoubleClick, true);
    };
  }, [onFeatureSelect, viewState]);

  useEffect(() => {
    const container = containerRef.current;
    if (!viewState || !container) return;

    const updateHoverCard = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!container.contains(target)) {
        setHoveredFeature(null);
        return;
      }

      const featureElement = target.closest('[data-testid]') as HTMLElement | null;
      const featureId = featureElement?.getAttribute('data-testid');
      if (!featureElement || !featureId || !isLikelyGeneId(featureId)) {
        setHoveredFeature(null);
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const featureRect = featureElement.getBoundingClientRect();
      const maxLeft = Math.max(8, containerRect.width - 190);
      const maxTop = Math.max(8, containerRect.height - 60);
      const preferredTop = featureRect.top - containerRect.top - 44;
      const fallbackTop = featureRect.bottom - containerRect.top + 8;
      const nextHover = {
        id: featureId,
        left: Math.min(Math.max(8, featureRect.left - containerRect.left), maxLeft),
        top: Math.min(preferredTop >= 8 ? preferredTop : fallbackTop, maxTop),
      };

      setHoveredFeature(prev =>
        prev &&
        prev.id === nextHover.id &&
        prev.left === nextHover.left &&
        prev.top === nextHover.top
          ? prev
          : nextHover
      );
    };

    const clearHoverCard = () => setHoveredFeature(null);

    container.addEventListener('mousemove', updateHoverCard);
    container.addEventListener('mouseleave', clearHoverCard);

    return () => {
      container.removeEventListener('mousemove', updateHoverCard);
      container.removeEventListener('mouseleave', clearHoverCard);
    };
  }, [viewState]);

  if (!viewState) {
    return <p className={styles.loading}>Loading genome viewer…</p>;
  }

  return (
    <div className={styles.jbrowseViewer}>
      <div ref={containerRef} className={styles.jbrowseContainer}>
        <JBrowseApp viewState={viewState} />
      </div>
      {hoveredFeature ? (
        <div
          className={styles.hoverCard}
          style={{ left: `${hoveredFeature.left}px`, top: `${hoveredFeature.top}px` }}
          role="tooltip"
        >
          <div className={styles.hoverCardLabel}>Gene</div>
          <div className={styles.hoverCardValue}>{hoveredFeature.id}</div>
        </div>
      ) : null}
    </div>
  );
};

export default GeneViewerContent;
