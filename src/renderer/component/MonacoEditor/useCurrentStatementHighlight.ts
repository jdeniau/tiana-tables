import { useEffect, useRef } from 'react';
import type monaco from 'monaco-editor';
import type { DatabaseEngine } from '../../../sql/engine';
import {
  SqlStatement,
  splitStatements,
  statementAtOffset,
} from '../../../sql/splitStatements';

/**
 * Monaco decorations are styled by class name — there is no inline-style
 * option — so the theme reaches these through a global rule.
 */
export const CURRENT_STATEMENT_CLASS = 'sql-current-statement';
export const CURRENT_STATEMENT_BAR_CLASS = 'sql-current-statement-bar';

/** marks the statement under the caret, and reports how many the content holds whenever that number changes */
export default function useCurrentStatementHighlight(
  monacoInstance: typeof monaco | null,
  editor: monaco.editor.IStandaloneCodeEditor | null,
  engine: DatabaseEngine,
  onStatementCountChange: ((count: number) => void) | undefined
): void {
  const onStatementCountChangeRef = useRef(onStatementCountChange);
  onStatementCountChangeRef.current = onStatementCountChange;

  useEffect(() => {
    if (!monacoInstance || !editor) {
      return;
    }

    // Splitting lexes the whole content, and the caret moves far more
    // often than the content changes.
    let lastSplit: { content: string; statements: SqlStatement[] } | null =
      null;
    const statementsOf = (content: string): SqlStatement[] => {
      if (lastSplit?.content !== content) {
        lastSplit = { content, statements: splitStatements(content, engine) };
      }

      return lastSplit.statements;
    };

    const decorations = editor.createDecorationsCollection();

    let reportedCount: number | null = null;

    // Show what Ctrl+Enter would run, but only once there is a choice to
    // make: on a single statement the decoration would just repaint the
    // whole editor.
    const highlightCurrentStatement = (): void => {
      const model = editor.getModel();
      const position = editor.getPosition();
      const statements = model ? statementsOf(model.getValue()) : [];

      if (statements.length !== reportedCount) {
        reportedCount = statements.length;
        onStatementCountChangeRef.current?.(reportedCount);
      }

      const current =
        model && position && statements.length > 1
          ? statementAtOffset(statements, model.getOffsetAt(position))
          : undefined;

      decorations.set(
        current && model
          ? [
              {
                range: monacoInstance.Range.fromPositions(
                  model.getPositionAt(current.start),
                  model.getPositionAt(current.end)
                ),
                options: {
                  isWholeLine: true,
                  className: CURRENT_STATEMENT_CLASS,
                  linesDecorationsClassName: CURRENT_STATEMENT_BAR_CLASS,
                },
              },
            ]
          : []
      );
    };

    const cursorListener = editor.onDidChangeCursorPosition(
      highlightCurrentStatement
    );
    const contentListener = editor.onDidChangeModelContent(
      highlightCurrentStatement
    );

    highlightCurrentStatement();

    return () => {
      cursorListener.dispose();
      contentListener.dispose();
      decorations.clear();
    };
  }, [monacoInstance, editor, engine]);
}
