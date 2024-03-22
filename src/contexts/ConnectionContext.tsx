import { createContext, useContext } from 'react';

export interface ConnexionContextProps {
  currentConnectionSlug: string | null;
  connectionSlugList: Array<string>;
  addConnectionToList: (connectionSlug: string) => void;
}

export const ConnectionContext = createContext<ConnexionContextProps>({
  currentConnectionSlug: null,
  connectionSlugList: [],
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  addConnectionToList: () => {},
});
ConnectionContext.displayName = 'ConnectionContext';

export function useConnectionContext(): ConnexionContextProps {
  return useContext(ConnectionContext);
}
