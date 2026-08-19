import { createContext, useContext, useMemo } from 'react';
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
  // a new helper on every render would invalidate every memo built on it
  const columnDetailsHelper = useMemo(
    () => new ColumnDetailHelper(columnDetails),
    [columnDetails]
  );

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
