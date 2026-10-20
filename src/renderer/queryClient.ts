import { QueryClient } from '@tanstack/react-query';

/** the cache of what the servers answered, held in memory until the app reloads */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // a local server answers with no network: 'online' pauses every query while `navigator.onLine` is false
        networkMode: 'always',
        // a SQL error does not heal on its own
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  });
}
