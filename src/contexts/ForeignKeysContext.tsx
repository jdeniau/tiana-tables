import { createContext, use } from 'react';
import { ForeignKeysHelper } from '../sql/ForeignKeysHelper';
import type { ForeignKey } from '../sql/dialect/metadata';

const ForeignKeysContext = createContext<ForeignKeysHelper | null>(null);

export function ForeignKeysContextProvider({
  children,
  foreignKeys,
  database,
}: {
  children: React.ReactNode;
  foreignKeys: ForeignKey[];
  /** the database whose tables hold `foreignKeys` */
  database: string;
}) {
  const foreignKeysHelper = new ForeignKeysHelper(foreignKeys, database);

  return (
    <ForeignKeysContext value={foreignKeysHelper}>
      {children}
    </ForeignKeysContext>
  );
}

export function useForeignKeysContext(): ForeignKeysHelper {
  const context = use(ForeignKeysContext);

  if (context === null) {
    throw new Error(
      'useForeignKeysContext must be used inside a ForeignKeysContextProvider'
    );
  }

  return context;
}
