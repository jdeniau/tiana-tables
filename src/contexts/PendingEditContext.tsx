import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from 'react';
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

enum ActionType {
  Add = 'add',
  MarkAllAsApplied = 'MarkAllAsApplied',
}

type Action =
  | { type: ActionType.Add; edit: PendingEdit }
  | { type: ActionType.MarkAllAsApplied };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case ActionType.Add:
      return [...state, action.edit];
    case ActionType.MarkAllAsApplied:
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
        type: ActionType.Add,
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
    () => dispatch({ type: ActionType.MarkAllAsApplied }),
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
export const testables = {
  reducer,
  ActionType,
};
