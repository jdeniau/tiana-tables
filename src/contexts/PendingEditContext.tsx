import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useState,
} from 'react';
import { Button } from 'antd';
import invariant from 'tiny-invariant';
import { useConnectionContext } from './ConnectionContext';

enum PendingEditState {
  Pending = 'pending',
  Applied = 'applied',
}

type PendingEdit = {
  connectionSlug: string;
  tableName: string;
  primaryKeys: Record<string, unknown>;
  values: Record<string, unknown>;
  state: PendingEditState;
};

type PendingEditContextType = {
  pendingEdits: Array<PendingEdit>;
  addPendingEdit: (edit: Omit<PendingEdit, 'connectionSlug' | 'state'>) => void;
};
const PendingEditContext = createContext<PendingEditContextType | null>(null);

type State = Array<PendingEdit>;

type Action = { type: 'add'; edit: PendingEdit };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'add':
      return [...state, action.edit];
    default:
      return state;
  }
}

export function PendingEditContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { currentConnectionSlug } = useConnectionContext();
  const [pendingEdits, dispatch] = useReducer(reducer, []);

  const addPendingEdit = useCallback(
    (edit: Omit<PendingEdit, 'connectionSlug' | 'state'>) => {
      invariant(currentConnectionSlug, 'Current connection slug should be set');

      dispatch({
        type: 'add',
        edit: {
          state: PendingEditState.Pending,
          connectionSlug: currentConnectionSlug,
          ...edit,
        },
      });
    },
    [currentConnectionSlug]
  );

  const value = useMemo(
    () => ({ pendingEdits, addPendingEdit }),
    [addPendingEdit, pendingEdits]
  );

  return (
    <PendingEditContext.Provider value={value}>
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
      danger={
        pendingEdits.filter((edit) => edit.state === PendingEditState.Pending)
          .length > 0
      }
      onClick={() => {
        alert(JSON.stringify(pendingEdits, null, 2));
      }}
    >
      🔃
      {pendingEdits.length}
    </Button>
  );
}
