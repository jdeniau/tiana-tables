import {
  ConflictReason,
  type UpdateCellOutcome,
  UpdateCellStatus,
} from '../../../sql/updateCell';
import type { CellWrite } from './types';

/** Why a write did not land: a conflict the server reported, or a SQL error. */
export enum WriteIssueReason {
  Changed = 'changed',
  Deleted = 'deleted',
  Failed = 'failed',
}

/** What stopped a write, as the conflict modal shows it. */
export type WriteIssue =
  | { reason: WriteIssueReason.Changed; currentValue: unknown }
  | { reason: WriteIssueReason.Deleted }
  | { reason: WriteIssueReason.Failed; message: string };

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
    ? { reason: WriteIssueReason.Deleted }
    : {
        reason: WriteIssueReason.Changed,
        currentValue: outcome.currentValue,
      };
}

export function failureOf(error: unknown): WriteIssue {
  return {
    reason: WriteIssueReason.Failed,
    message: error instanceof Error ? error.message : String(error),
  };
}
