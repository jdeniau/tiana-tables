import { createContext, useContext } from 'react';
import { ColumnDetailHelper } from '../sql/ColumnDetailHelper';
import { ColumnDetailResult } from '../sql/types';

const AllColumnsContext = createContext<ColumnDetailHelper | null>(null);

export function AllColumnsContextProvider({
  children,
  allColumns: columnDetails,
}: {
  children: React.ReactNode;
  allColumns: ColumnDetailResult;
}) {
  const columnDetailsHelper = new ColumnDetailHelper(columnDetails);

  return (
    <AllColumnsContext.Provider value={columnDetailsHelper}>
      {children}
    </AllColumnsContext.Provider>
  );
}

export function useAllColumnsContext(): ColumnDetailHelper {
  const context = useContext(AllColumnsContext);

  if (context === null) {
    throw new Error(
      'useAllColumnsContext must be used inside a AllColumnsContextProvider'
    );
  }

  return context;
}
