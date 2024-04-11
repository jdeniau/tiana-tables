import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react';
import { Button } from 'antd';
import invariant from 'tiny-invariant';
import { useConnectionContext } from './ConnectionContext';

type PendingEdit = {
  connectionSlug: string;
  tableName: string;
  primaryKeys: Record<string, unknown>;
  values: Record<string, unknown>;
};

type PendingEditContextType = {
  pendingEdits: Array<PendingEdit>;
  addPendingEdit: (edit: Omit<PendingEdit, 'connectionSlug'>) => void;
};
const PendingEditContext = createContext<PendingEditContextType | null>(null);
export function PendingEditContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { currentConnectionSlug } = useConnectionContext();
  const [pendingEdits, setPendingEdits] = useState<Array<PendingEdit>>([]);

  const addPendingEdit = useCallback(
    (edit: Omit<PendingEdit, 'connectionSlug'>) => {
      invariant(currentConnectionSlug, 'Current connection slug should be set');

      setPendingEdits((prev) => [
        ...prev,
        { connectionSlug: currentConnectionSlug, ...edit },
      ]);
    },
    [currentConnectionSlug]
  );

  return (
    <PendingEditContext.Provider value={{ pendingEdits, addPendingEdit }}>
      {children}
    </PendingEditContext.Provider>
  );
}

export function usePendingEditContext() {
  const context = useContext(PendingEditContext);

  if (context === null) {
    throw new Error(
      'usePendingEdits must be used inside a PendingEditContextProvider'
    );
  }

  return context;
}
export function PendingEditDebug() {
  const { pendingEdits } = usePendingEditContext();

  return (
    <Button
      title="Synchronize"
      danger={pendingEdits.length > 0}
      onClick={() => {
        alert(JSON.stringify(pendingEdits, null, 2));
      }}
    >
      🔃
      {pendingEdits.length}
    </Button>
  );
}
