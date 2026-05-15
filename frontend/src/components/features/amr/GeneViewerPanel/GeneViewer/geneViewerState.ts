/**
 * AMR portal — mirrors METT `dataportal-app/.../gene-viewer/GeneViewer/geneViewerState.ts`.
 * Uses `makeWorkerInstance` from `@jbrowse/react-app2` (Vite stubs it in dev when needed).
 */

import { useEffect, useState } from 'react';
import { createViewState } from '@jbrowse/react-app2';
import makeWorkerInstance from '@jbrowse/react-app2/esm/makeWorkerInstance';
import * as CorePlugins from '@jbrowse/core/pluggableElementTypes';
import Plugin from '@jbrowse/core/Plugin';
import EnhancedGeneFeaturePlugin from '@/plugins/EnhancedGeneFeaturePlugin';

export interface Track {
  type: string;
  trackId: string;
  name: string;
  assemblyNames: string[];
  adapter: {
    type: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

type PluginConstructor = new (...args: unknown[]) => Plugin;

function isPluginConstructor(value: unknown): value is typeof Plugin {
  return typeof value === 'function' && value.prototype instanceof Plugin;
}

const useGeneViewerState = (
  assembly: Record<string, unknown> | null,
  tracks: Track[],
  defaultSession: Record<string, unknown> | null,
  initKey?: string
) => {
  const [viewState, setViewState] = useState<ReturnType<typeof createViewState> | null>(null);
  const [initializationError, setInitializationError] = useState<Error | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        if (!assembly) {
          setViewState(null);
          setInitializationError(null);
          return;
        }

        const corePluginConstructors = (Object.values(CorePlugins) as unknown[]).filter(
          (plugin): plugin is PluginConstructor => isPluginConstructor(plugin)
        );

        const plugins: PluginConstructor[] = [EnhancedGeneFeaturePlugin, ...corePluginConstructors];

        const config = {
          assemblies: [assembly],
          tracks: tracks.map(track => ({
            ...track,
            visible: true,
          })),
          configuration: {
            disableAnalytics: true,
            rpc: {
              defaultDriver: 'MainThreadRpcDriver',
            },
            theme: {
              palette: {
                primary: { main: '#0D233F' },
                secondary: { main: '#721E63' },
              },
            },
          },
          defaultSession: defaultSession ? { ...defaultSession, name: 'defaultSession' } : undefined,
        };

        const state = createViewState({
          config,
          plugins,
          makeWorkerInstance,
        });

        try {
          const session = state.session;
          if (session) {
            session.showWidget = () => undefined;
            session.addWidget = () => undefined;
          }
        } catch (error) {
          console.warn('Failed to override widget methods:', error);
        }

        setViewState(state);
        setInitializationError(null);

        const assemblyManager = state.assemblyManager;
        const assemblyInstance = assemblyManager.get(assembly.name as string);
        if (assemblyInstance) {
          await assemblyInstance.load();
        }
      } catch (error) {
        setInitializationError(error instanceof Error ? error : new Error(String(error)));
        setViewState(null);
      }
    };

    void initialize();
  }, [assembly, tracks, defaultSession, initKey]);

  return { viewState, initializationError };
};

export default useGeneViewerState;
