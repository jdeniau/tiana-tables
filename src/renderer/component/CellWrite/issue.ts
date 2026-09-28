import {
  ConflictReason,
  type UpdateCellOutcome,
  UpdateCellStatus,
} from '../../../sql/updateCell';
import type { CellWrite } from './types';

/** What stopped a write, as the conflict modal shows it. */
export type WriteIssue =
  | { reason: ConflictReason.Changed; currentValue: unknown }
  | { reason: ConflictReason.Deleted }
  | { reason: 'failed'; message: string };

/** A write that did not land, and why. */
export interface PendingIssue {
  write: CellWrite;
  issue: WriteIssue;
}

/** The conflict an outcome reports, `null` when the write landed. */
export function issueOf(outcome: UpdateCellOutcome): WriteIssue | null {
  if (outcome.status === UpdateCellStatus.Updated) {
    return null;
  }

  return outcome.reason === ConflictReason.Deleted
    ? { reason: ConflictReason.Deleted }
    : { reason: ConflictReason.Changed, currentValue: outcome.currentValue };
}

export function failureOf(error: unknown): WriteIssue {
  return {
    reason: 'failed',
    message: error instanceof Error ? error.message : String(error),
  };
}
