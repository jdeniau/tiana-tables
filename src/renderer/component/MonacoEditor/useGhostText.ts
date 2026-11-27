import { useEffect } from 'react';
import { languages } from 'monaco-editor';
import type { DatabaseEngine } from '../../../sql/engine';
import { HistoryContinuation } from '../../../sql/history/HistoryContinuation';
import type { QueryHistoryContent } from '../../../sql/history/recordedStatement';
import {
  splitStatements,
  statementAtOffset,
} from '../../../sql/splitStatements';
import { SQL_LANGUAGES } from './language';
import { getQueryPrefix, prefixedValue } from './queryPrefix';
import useQueryHistory from './useQueryHistory';

const NO_CONTINUATION = new HistoryContinuation({ runs: [], blocks: [] });

function toContinuation(content: QueryHistoryContent): HistoryContinuation {
  return new HistoryContinuation(content);
}

/** what the history ran after the statement the caret ends, shown past the caret */
export function buildGhostTextProvider(
  engine: DatabaseEngine,
  continuation: HistoryContinuation
): languages.InlineCompletionsProvider {
  return {
    provideInlineCompletions(model, position) {
      // the table filter holds the body of a `WHERE`: its query starts with the prefix
      const content = prefixedValue(model);
      const caret = getQueryPrefix(model).length + model.getOffsetAt(position);
      const statement = statementAtOffset(
        splitStatements(content, engine),
        caret
      );
      // only blanks and the `;` of the statement may follow the caret
      const endsStatement =
        statement !== undefined &&
        content.slice(caret, statement.end).replace(/;$/, '').trim() === '';
      const text = endsStatement
        ? continuation.after(content.slice(statement.start, caret), engine)
        : null;
      // Monaco shows a text on several lines only from the end of a line
      const fits =
        !text?.includes('\n') ||
        position.column === model.getLineMaxColumn(position.lineNumber);

      if (!text || !fits) {
        return { items: [] };
      }

      return {
        items: [
          {
            insertText: text,
            range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            },
          },
        ],
      };
    },
    disposeInlineCompletions() {},
  };
}

/** the ghost text: what the history of the database ran after what is typed */
export default function useGhostText(): void {
  const continuation = useQueryHistory(toContinuation) ?? NO_CONTINUATION;

  useEffect(() => {
    const providers = SQL_LANGUAGES.map(([engine, language]) =>
      languages.registerInlineCompletionsProvider(
        language,
        buildGhostTextProvider(engine, continuation)
      )
    );

    return () => providers.forEach((provider) => provider.dispose());
  }, [continuation]);
}
