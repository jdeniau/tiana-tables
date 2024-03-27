import { createContext, useContext } from 'react';

interface SetDatabaseFunc {
  (theme: string): void;
}
export interface DatabaseContextProps {
  database: string | null;
  setDatabase: SetDatabaseFunc;
}

export const DatabaseContext = createContext<DatabaseContextProps>({
  database: null,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setDatabase: () => {},
});
DatabaseContext.displayName = 'DatabaseContext';

export function useDatabaseContext(): DatabaseContextProps {
  return useContext(DatabaseContext);
}
