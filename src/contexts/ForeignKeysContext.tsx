import { createContext, useContext } from 'react';
import { ForeignKeysHelper } from '../sql/ForeignKeysHelper';
import { KeyColumnUsageRow } from '../sql/types';

const foreignKeysContext = createContext<ForeignKeysHelper | null>(null);

export function ForeignKeysContextProvider({
  children,
  keyColumnUsageRows,
}: {
  children: React.ReactNode;
  keyColumnUsageRows: KeyColumnUsageRow[];
}) {
  const foreignKeysHelper = new ForeignKeysHelper(keyColumnUsageRows);

  return (
    <foreignKeysContext.Provider value={foreignKeysHelper}>
      {children}
    </foreignKeysContext.Provider>
  );
}

export function useForeignKeysContext(): ForeignKeysHelper {
  const context = useContext(foreignKeysContext);

  if (context === null) {
    throw new Error(
      'useForeignKeysContext must be used inside a ForeignKeysContextProvider'
    );
  }

  return context;
}
