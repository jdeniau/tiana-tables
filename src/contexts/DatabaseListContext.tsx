import { createContext, use } from 'react';

/** The databases of the connection, by name — the schemas on PostgreSQL. */
export type DatabaseListContext = string[];

const DatabaseListContext = createContext<DatabaseListContext | null>(null);

export function DatabaseListContextProvider({
  children,
  databaseList: DatabaseList,
}: {
  children: React.ReactNode;
  databaseList: DatabaseListContext;
}) {
  return (
    <DatabaseListContext value={DatabaseList}>
      {children}
    </DatabaseListContext>
  );
}

export function useDatabaseListContext(): DatabaseListContext {
  const context = use(DatabaseListContext);

  if (context === null) {
    throw new Error(
      'useTableListContext must be used inside a TableListContextProvider'
    );
  }

  return context;
}
