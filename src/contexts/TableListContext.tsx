import { createContext, use } from 'react';

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
    <TableListContext value={tableList}>
      {children}
    </TableListContext>
  );
}

export function useTableListContext(): TableListContext {
  const context = use(TableListContext);

  if (context === null) {
    throw new Error(
      'useTableListContext must be used inside a TableListContextProvider'
    );
  }

  return context;
}
