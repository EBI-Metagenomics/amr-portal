import type { BackendInterface } from './backendInterface';
export type { ApiBackend } from './apiBackend';

export type { BackendInterface };

type ProviderType = 'api';

/**
 * NOTE: A little bit of history.
 * When this project was started, we were not sure whether to have a dedicated backend,
 * or to make the client fetch a copy of the database (duckdb), and read the data locally.
 * This module was intended to switch between the two implementations of data providers:
 * one that fetched data from a backend api, and another that fetched the whole db
 * and ran data queries locally.
 * It has since become clear that a dedicated backend was a winning approach,
 * and the alternative approach was removed.
 */

export const getDataProvider = async ({
  provider
}: {
  provider: ProviderType;
}): Promise<BackendInterface> => {
  if (provider === 'api') {
    const { ApiBackend } = await import('./apiBackend'); // our new API-based backend
    return new ApiBackend(); // optionally: pass base URL as new ApiBackend(baseUrl)
  }

  throw new Error(`Unknown provider: ${provider}`);
};
