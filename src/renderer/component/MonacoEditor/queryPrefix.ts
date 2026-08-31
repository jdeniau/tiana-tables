// type-only imports: this module must not pull the editor into the tests
import type { IPosition, IRange, editor } from 'monaco-editor';

/**
 * The SQL an editor implicitly sits in.
 *
 * The table filter only holds the body of a `WHERE` clause: on its own,
 * `salary > 1000` is a syntax error, has no table to complete columns from,
 * and no alias to color. The editor therefore declares the query it is a
 * fragment of — `SELECT * FROM `city` WHERE ` — and completion, validation
 * and highlighting all read that query rather than the raw model.
 *
 * The prefix is registered per model, since the providers are registered once
 * for the whole `mysql` language and only ever see a model.
 *
 * A prefix must stay on a single line: everything the user types is then on
 * the same lines as before, shifted by the prefix length on the first one, and
 * mapping a position back is a subtraction rather than a line count.
 */
const prefixes = new WeakMap<editor.ITextModel, string>();

export function setQueryPrefix(
  model: editor.ITextModel,
  prefix: string | undefined
): void {
  if (!prefix) {
    prefixes.delete(model);

    return;
  }

  if (prefix.includes('\n')) {
    throw new Error(`A query prefix must be a single line, got: ${prefix}`);
  }

  prefixes.set(model, prefix);
}

/** the prefix of that model, the empty string when it has none */
export function getQueryPrefix(model: editor.ITextModel): string {
  return prefixes.get(model) ?? '';
}

/** what the parser is given: the model content, in its query */
export function prefixedValue(model: editor.ITextModel): string {
  return getQueryPrefix(model) + model.getValue();
}

/** a position of the model, in the prefixed query */
export function toPrefixedPosition(
  prefix: string,
  position: IPosition
): IPosition {
  return {
    lineNumber: position.lineNumber,
    column:
      position.lineNumber === 1
        ? position.column + prefix.length
        : position.column,
  };
}

/**
 * A range of the prefixed query, back in the model — `null` when it falls in
 * the prefix, which names SQL the user never wrote and cannot fix.
 */
export function fromPrefixedRange(
  prefix: string,
  range: IRange
): IRange | null {
  if (range.startLineNumber === 1 && range.startColumn <= prefix.length) {
    return null;
  }

  return {
    ...range,
    startColumn:
      range.startLineNumber === 1
        ? range.startColumn - prefix.length
        : range.startColumn,
    endColumn:
      range.endLineNumber === 1
        ? Math.max(range.endColumn - prefix.length, 1)
        : range.endColumn,
  };
}
