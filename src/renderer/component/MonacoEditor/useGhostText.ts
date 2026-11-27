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
import useQueryHistory, { useRecentRuns } from './useQueryHistory';

const NO_CONTINUATION = new HistoryContinuation({ runs: [], blocks: [] });

function toContinuation(content: QueryHistoryContent): HistoryContinuation {
  return new HistoryContinuation(content);
}

function toRecentContinuation(runs: Array<string>): HistoryContinuation {
  return new HistoryContinuation({ runs, blocks: [] });
}

/** what the history ran after the statement the caret ends, shown past the caret: the first continuation that has one wins */
export function buildGhostTextProvider(
  engine: DatabaseEngine,
  continuations: ReadonlyArray<HistoryContinuation>
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
      const typed = endsStatement ? content.slice(statement.start, caret) : '';
      let text: string | null = null;

      for (const continuation of typed ? continuations : []) {
        text ??= continuation.after(typed, engine);
      }
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
  // rebuilt at each run, while the history is rebuilt only when it loads again
  const recent = useRecentRuns(toRecentContinuation);

  useEffect(() => {
    const continuations = recent ? [recent, continuation] : [continuation];
    const providers = SQL_LANGUAGES.map(([engine, language]) =>
      languages.registerInlineCompletionsProvider(
        language,
        buildGhostTextProvider(engine, continuations)
      )
    );

    return () => providers.forEach((provider) => provider.dispose());
  }, [recent, continuation]);
}
