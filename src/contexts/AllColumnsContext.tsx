import { createContext, use } from 'react';
import { ColumnDetailHelper } from '../sql/ColumnDetailHelper';
import type { ColumnDetail } from '../sql/dialect/metadata';

const AllColumnsContext = createContext<ColumnDetailHelper | null>(null);

export function AllColumnsContextProvider({
  children,
  allColumns: columnDetails,
}: {
  children: React.ReactNode;
  allColumns: ColumnDetail[];
}) {
  const columnDetailsHelper = new ColumnDetailHelper(columnDetails);

  return (
    <AllColumnsContext value={columnDetailsHelper}>
      {children}
    </AllColumnsContext>
  );
}

export function useAllColumnsContext(): ColumnDetailHelper {
  const context = use(AllColumnsContext);

  if (context === null) {
    throw new Error(
      'useAllColumnsContext must be used inside a AllColumnsContextProvider'
    );
  }

  return context;
}
