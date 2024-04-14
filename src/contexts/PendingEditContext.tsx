import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from 'react';
import { Button } from 'antd';
import { FieldPacket, RowDataPacket } from 'mysql2';
import invariant from 'tiny-invariant';
import { PendingEdit, PendingEditState } from '../sql/types';
import { useConnectionContext } from './ConnectionContext';

type PendingEditContextType = {
  pendingEdits: Array<PendingEdit>;
  addPendingEdit: (edit: Omit<PendingEdit, 'connectionSlug' | 'state'>) => void;
  findPendingEdit: (
    record: RowDataPacket,
    field: FieldPacket
  ) => PendingEdit | undefined;
  findPendingEdits: (
    record: RowDataPacket,
    tableName: string
  ) => Array<PendingEdit>;
  markAllAsApplied: () => void;
};
const PendingEditContext = createContext<PendingEditContextType | null>(null);

type State = Array<PendingEdit>;

type Action = { type: 'add'; edit: PendingEdit } | { type: 'markAllAsApplied' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'add':
      return [...state, action.edit];
    case 'markAllAsApplied':
      return state.map((edit) => ({
        ...edit,
        state: PendingEditState.Applied,
      }));
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

  const markAllAsApplied = useCallback(
    () => dispatch({ type: 'markAllAsApplied' }),
    []
  );

  const findPendingEdits = useCallback(
    (record: RowDataPacket, tableName: string) =>
      pendingEdits.filter(
        (edit) =>
          edit.tableName === tableName &&
          Object.entries(edit.primaryKeys).every(
            ([columnName, pkValue]) => record[columnName] === pkValue
          )
      ),
    [pendingEdits]
  );

  const findPendingEdit = useCallback(
    (record: RowDataPacket, field: FieldPacket) =>
      pendingEdits.findLast(
        (edit) =>
          edit.tableName === field.table &&
          field.name in edit.values &&
          Object.entries(edit.primaryKeys).every(
            ([columnName, pkValue]) => record[columnName] === pkValue
          )
      ),
    [pendingEdits]
  );

  const value = useMemo(
    () => ({
      pendingEdits,
      addPendingEdit,
      markAllAsApplied,
      findPendingEdit,
      findPendingEdits,
    }),
    [
      addPendingEdit,
      pendingEdits,
      markAllAsApplied,
      findPendingEdit,
      findPendingEdits,
    ]
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
  const { pendingEdits, markAllAsApplied } = usePendingEditContext();

  const unappliedPendingEdits = pendingEdits.filter(
    (edit) => edit.state === PendingEditState.Pending
  );

  return (
    <Button
      title="Synchronize"
      danger={unappliedPendingEdits.length > 0}
      onClick={() => {
        window.sql.handlePendingEdits(pendingEdits).then((r) => {
          console.log(r);

          // Mark all as applied
          markAllAsApplied();
        });
        // alert(JSON.stringify(pendingEdits, null, 2));
      }}
    >
      🔃
      {unappliedPendingEdits.length}
    </Button>
  );
}
