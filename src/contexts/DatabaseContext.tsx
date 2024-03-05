import { createContext, useContext } from 'react';
import { QueryResult, QueryReturnType } from '../sql/types';

interface SetDatabaseFunc {
  (theme: string): void;
}
export interface DatabaseContextProps {
  database: string | null;
  setDatabase: SetDatabaseFunc;
  executeQuery: <T extends QueryReturnType>(query: string) => QueryResult<T>;
}

export const DatabaseContext = createContext<DatabaseContextProps>({
  database: null,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setDatabase: () => {},
  // @ts-expect-error -- do we want ean empty context function here ?
  executeQuery: () => Promise.resolve(),
});
DatabaseContext.displayName = 'DatabaseContext';

export function useDatabaseContext(): DatabaseContextProps {
  return useContext(DatabaseContext);
}
