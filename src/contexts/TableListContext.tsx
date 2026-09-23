import { createContext, useContext } from 'react';

/** The tables and views of the current database, by name. */
export type TableListContext = string[];

const TableListContext = createContext<TableListContext | null>(null);

export function TableListContextProvider({
  children,
  tableList,
}: {
  children: React.ReactNode;
  tableList: TableListContext;
}) {
  return (
    <TableListContext.Provider value={tableList}>
      {children}
    </TableListContext.Provider>
  );
}

export function useTableListContext(): TableListContext {
  const context = useContext(TableListContext);

  if (context === null) {
    throw new Error(
      'useTableListContext must be used inside a TableListContextProvider'
    );
  }

  return context;
}
