import { createContext, use } from 'react';

export interface ConnexionContextProps {
  currentConnectionSlug: string | null;
  connectionSlugList: Array<string>;
  addConnectionToList: (connectionSlug: string) => void;
  /** Close the connection: its socket ends and it leaves the title bar. */
  closeConnection: (connectionSlug: string) => void;
}

export const ConnectionContext = createContext<ConnexionContextProps>({
  currentConnectionSlug: null,
  connectionSlugList: [],
  addConnectionToList: () => {},
  closeConnection: () => {},
});
ConnectionContext.displayName = 'ConnectionContext';

export function useConnectionContext(): ConnexionContextProps {
  return use(ConnectionContext);
}
