import { createContext, use } from 'react';

interface SetDatabaseFunc {
  (theme: string): void;
}
export interface DatabaseContextProps {
  database: string | null;
  setDatabase: SetDatabaseFunc;
}

export const DatabaseContext = createContext<DatabaseContextProps>({
  database: null,
  setDatabase: () => {},
});
DatabaseContext.displayName = 'DatabaseContext';

export function useDatabaseContext(): DatabaseContextProps {
  return use(DatabaseContext);
}
