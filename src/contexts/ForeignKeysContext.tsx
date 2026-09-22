import { createContext, useContext } from 'react';
import { ForeignKeysHelper } from '../sql/ForeignKeysHelper';
import type { ForeignKey } from '../sql/dialect/metadata';

const foreignKeysContext = createContext<ForeignKeysHelper | null>(null);

export function ForeignKeysContextProvider({
  children,
  foreignKeys,
}: {
  children: React.ReactNode;
  foreignKeys: ForeignKey[];
}) {
  const foreignKeysHelper = new ForeignKeysHelper(foreignKeys);

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
