import { describe, expect, test } from 'vitest';
import { applyColumnOrder } from './columnOrder';

const COLUMNS = ['id', 'firstname', 'lastname', 'email'];

describe('applyColumnOrder', () => {
  test('keeps the database order when nothing is configured', () => {
    expect(applyColumnOrder(COLUMNS, undefined)).toEqual(COLUMNS);
    expect(applyColumnOrder(COLUMNS, {})).toEqual(COLUMNS);
  });

  test('moves a column after the one it is anchored to', () => {
    expect(applyColumnOrder(COLUMNS, { email: 'id' })).toEqual([
      'id',
      'email',
      'firstname',
      'lastname',
    ]);
  });

  test('moves a column backwards as well as forwards', () => {
    expect(applyColumnOrder(COLUMNS, { firstname: 'lastname' })).toEqual([
      'id',
      'lastname',
      'firstname',
      'email',
    ]);
  });

  test('follows a chain of anchors', () => {
    expect(
      applyColumnOrder(COLUMNS, { email: 'id', lastname: 'email' })
    ).toEqual(['id', 'email', 'lastname', 'firstname']);
  });

  test('keeps two columns sharing an anchor in database order', () => {
    expect(applyColumnOrder(COLUMNS, { lastname: 'id', email: 'id' })).toEqual([
      'id',
      'lastname',
      'email',
      'firstname',
    ]);
  });

  test('ignores a column the table no longer has', () => {
    expect(applyColumnOrder(COLUMNS, { nickname: 'id' })).toEqual(COLUMNS);
  });

  test('puts a column back in its place when its anchor was dropped', () => {
    // `lastname` displays after `firstname`, which is not a column any more
    expect(
      applyColumnOrder(['id', 'lastname'], { lastname: 'firstname' })
    ).toEqual(['id', 'lastname']);
  });

  test('drops a chain whose first anchor was dropped, one link at a time', () => {
    // firstname is gone: lastname goes back to its place, and email keeps
    // following lastname there
    expect(
      applyColumnOrder(['id', 'lastname', 'email'], {
        lastname: 'firstname',
        email: 'lastname',
      })
    ).toEqual(['id', 'lastname', 'email']);
  });

  test('ignores a column anchored to itself', () => {
    expect(applyColumnOrder(COLUMNS, { email: 'email' })).toEqual(COLUMNS);
  });

  test('displays every column of a cycle', () => {
    const ordered = applyColumnOrder(COLUMNS, {
      firstname: 'lastname',
      lastname: 'firstname',
    });

    expect([...ordered].sort()).toEqual([...COLUMNS].sort());
  });

  test('displays every column of a cycle reached from outside it', () => {
    const ordered = applyColumnOrder(COLUMNS, {
      email: 'firstname',
      firstname: 'lastname',
      lastname: 'firstname',
    });

    expect([...ordered].sort()).toEqual([...COLUMNS].sort());
  });

  test('displays every column of a three-column cycle', () => {
    const ordered = applyColumnOrder(COLUMNS, {
      id: 'email',
      email: 'lastname',
      lastname: 'id',
    });

    expect([...ordered].sort()).toEqual([...COLUMNS].sort());
  });
});
