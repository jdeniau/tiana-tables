import {
  type ReactElement,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import invariant from 'tiny-invariant';
import { ConflictReason } from '../../../sql/updateCell';
import CellConflictModal from './CellConflictModal';
import { type PendingIssue, failureOf, issueOf } from './issue';
import type { CellWrite, SaveCell } from './types';

interface CellWriteContextValue {
  /**
   * Writes the value, guarded on the one it was loaded with.
   * A conflict is handed over to the conflict modal; a SQL error is thrown back to the caller.
   */
  writeCell(write: CellWrite): Promise<void>;
  /** Shows a write that failed where the caller has nowhere to show it. */
  reportFailure(write: CellWrite, error: unknown): void;
}

const CellWriteContext = createContext<CellWriteContextValue | null>(null);

interface CellWriteProviderProps {
  save: SaveCell;
  /** patches the grid with the value the server holds, once the user kept it */
  onValueUpdated?: (
    rowIndex: number,
    columnName: string,
    value: unknown
  ) => void;
  children: ReactNode;
}

/** Owns every write of a grid's cells, and the modal that settles those that did not land. */
export function CellWriteProvider({
  save,
  onValueUpdated,
  children,
}: CellWriteProviderProps): ReactElement {
  const [pending, setPending] = useState<PendingIssue | null>(null);

  const writeCell = useCallback(
    async (write: CellWrite) => {
      const issue = issueOf(await save({ ...write, force: false }));

      if (issue) {
        setPending({ write, issue });
      }
    },
    [save]
  );

  const reportFailure = useCallback((write: CellWrite, error: unknown) => {
    setPending({ write, issue: failureOf(error) });
  }, []);

  // the modal closes at once: the cell flashes once written, and the modal
  // reopens on what the forced write still meets (a row deleted in between, a SQL error)
  const overwrite = useCallback(
    async (write: CellWrite) => {
      setPending(null);

      try {
        const issue = issueOf(await save({ ...write, force: true }));

        if (issue) {
          setPending({ write, issue });
        }
      } catch (error) {
        reportFailure(write, error);
      }
    },
    [save, reportFailure]
  );

  // cancelling a changed cell keeps the server's value, which the grid then shows
  const close = useCallback(() => {
    if (pending?.issue.reason === ConflictReason.Changed) {
      onValueUpdated?.(
        pending.write.detail.rowIndex,
        pending.write.detail.column.name,
        pending.issue.currentValue
      );
    }

    setPending(null);
  }, [pending, onValueUpdated]);

  const value = useMemo(
    () => ({ writeCell, reportFailure }),
    [writeCell, reportFailure]
  );

  return (
    <CellWriteContext.Provider value={value}>
      {children}

      <CellConflictModal
        pending={pending}
        onOverwrite={(write) => void overwrite(write)}
        onClose={close}
      />
    </CellWriteContext.Provider>
  );
}

export function useCellWrite(): CellWriteContextValue {
  const context = useContext(CellWriteContext);

  invariant(context, 'useCellWrite must be used within a CellWriteProvider');

  return context;
}
