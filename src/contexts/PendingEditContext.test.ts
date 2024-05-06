import { describe, expect, test } from 'vitest';
import { PendingEdit, PendingEditState } from '../sql/types';
import { testables } from './PendingEditContext';

const { reducer, ActionType } = testables;

const edit: PendingEdit = {
  state: PendingEditState.Pending,
  connectionSlug: 'conn',
  tableName: 'tablename',
  primaryKeys: { id: 123 },
  values: { title: 'new title' },
};

const edit2: PendingEdit = {
  state: PendingEditState.Pending,
  connectionSlug: 'conn',
  tableName: 'tablename',
  primaryKeys: { id: 123 },
  values: { status: 'new status' },
};

describe('reducer', () => {
  test('addPendingEdit', () => {
    let newState = reducer([], {
      type: ActionType.Add,
      edit,
    });

    expect(newState).toEqual([edit]);

    newState = reducer(newState, { type: ActionType.Add, edit: edit2 });

    expect(newState).toEqual([edit, edit2]);
  });

  test('markAllAsApplied', () => {
    expect(
      reducer([edit, edit2], { type: ActionType.MarkAllAsApplied })
    ).toEqual([
      { ...edit, state: PendingEditState.Applied },
      { ...edit2, state: PendingEditState.Applied },
    ]);
  });
});
