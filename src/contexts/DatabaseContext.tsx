import { createContext } from 'react';

interface SetDatabaseFunc {
  (theme: string): void;
}
interface DatabaseContextProps {
  database: string | null;
  setDatabase: SetDatabaseFunc;
  executeQuery: (query: string) => Promise<unknown>;
}

export const DatabaseContext = createContext<DatabaseContextProps>({
  database: null,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setDatabase: () => {},
  executeQuery: () => Promise.resolve(),
});
DatabaseContext.displayName = 'DatabaseContext';

export function useDatabaseContext(): DatabaseContextProps {
  return useContext(DatabaseContext);
}
