import { createContext, useContext } from 'react';
import { ConnectionObject } from '../sql/types';

interface ConnectToFunc {
  (params: ConnectionObject): Promise<void>;
}
interface ConnexionContextProps {
  currentConnectionName: string | null;
  connectionNameList: string[];
  connectTo: ConnectToFunc;
}

export const ConnectionContext = createContext<ConnexionContextProps>({
  currentConnectionName: null,
  connectionNameList: [],
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  connectTo: () => Promise.resolve(),
});
ConnectionContext.displayName = 'ConnectionContext';

export function useConnectionContext(): ConnexionContextProps {
  return useContext(ConnectionContext);
}
