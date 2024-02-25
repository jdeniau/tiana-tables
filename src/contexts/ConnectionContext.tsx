import { createContext } from 'react';

interface ConnectToFunc {
  (params: object): void;
}
interface ConnexionContextProps {
  currentConnectionName: string | null;
  connectionNameList: string[];
  connectTo: ConnectToFunc;
  setCurrentConnectionName: (connectionName: string) => void;
}

export const ConnectionContext = createContext<ConnexionContextProps>({
  currentConnectionName: null,
  connectionNameList: [],
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  connectTo: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setCurrentConnectionName: () => {},
});
ConnectionContext.displayName = 'ConnectionContext';
