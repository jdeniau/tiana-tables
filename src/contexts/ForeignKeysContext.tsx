import { createContext, useContext } from 'react';

export type ForeignKeysContext = Record<
  string,
  {
    referencedTableName: string;
    referencedColumnName: string;
  }
>;

const foreignKeysContext = createContext<ForeignKeysContext | null>(null);

export function ForeignKeysContextProvider({
  children,
  foreignKeys,
}: {
  children: React.ReactNode;
  foreignKeys: ForeignKeysContext;
}) {
  return (
    <foreignKeysContext.Provider value={foreignKeys}>
      {children}
    </foreignKeysContext.Provider>
  );
}

export function useForeignKeysContext(): ForeignKeysContext {
  const context = useContext(foreignKeysContext);

  if (context === null) {
    throw new Error(
      'useForeignKeysContext must be used inside a ForeignKeysContextProvider'
    );
  }

  return context;
}
