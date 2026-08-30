import { describe, expect, it } from 'vitest';
import { fromPrefixedRange, toPrefixedPosition } from './queryPrefix';

const PREFIX = 'SELECT * FROM `city` WHERE ';

describe('toPrefixedPosition', () => {
  it('shifts the first line by the prefix', () => {
    expect(toPrefixedPosition(PREFIX, { lineNumber: 1, column: 1 })).toEqual({
      lineNumber: 1,
      column: PREFIX.length + 1,
    });
  });

  it('leaves the following lines alone', () => {
    expect(toPrefixedPosition(PREFIX, { lineNumber: 2, column: 4 })).toEqual({
      lineNumber: 2,
      column: 4,
    });
  });
});

describe('fromPrefixedRange', () => {
  it('brings a range of the first line back into the editor', () => {
    expect(
      fromPrefixedRange(PREFIX, {
        startLineNumber: 1,
        startColumn: PREFIX.length + 3,
        endLineNumber: 1,
        endColumn: PREFIX.length + 8,
      })
    ).toEqual({
      startLineNumber: 1,
      startColumn: 3,
      endLineNumber: 1,
      endColumn: 8,
    });
  });

  it('drops what belongs to the prefix, which the user cannot fix', () => {
    expect(
      fromPrefixedRange(PREFIX, {
        startLineNumber: 1,
        startColumn: 15,
        endLineNumber: 1,
        endColumn: 21,
      })
    ).toBeNull();
  });

  it('keeps a multiline range anchored on its later lines', () => {
    expect(
      fromPrefixedRange(PREFIX, {
        startLineNumber: 2,
        startColumn: 1,
        endLineNumber: 3,
        endColumn: 5,
      })
    ).toEqual({
      startLineNumber: 2,
      startColumn: 1,
      endLineNumber: 3,
      endColumn: 5,
    });
  });
});
