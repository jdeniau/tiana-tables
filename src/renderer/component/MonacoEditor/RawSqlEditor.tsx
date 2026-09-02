import {
  CSSProperties,
  Ref,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type monaco from 'monaco-editor';
import { LanguageIdEnum } from 'monaco-sql-languages';
import { createGlobalStyle, useTheme } from 'styled-components';
import {
  SqlStatement,
  splitStatements,
  statementAtOffset,
} from '../../../sql/splitStatements';
import useEffectOnce from '../../hooks/useEffectOnce';
import { functionForeground, selection } from '../../theme';
import { setQueryPrefix } from './queryPrefix';
import { buildMonacoTheme } from './themes';
import useCompletion from './useCompletion';
import useSemanticTokens from './useSemanticTokens';

/**
 * Monaco decorations are styled by class name — there is no inline-style
 * option — so the theme reaches these through a global rule.
 */
const CURRENT_STATEMENT_CLASS = 'sql-current-statement';
const CURRENT_STATEMENT_BAR_CLASS = 'sql-current-statement-bar';

/**
 * How much of the selection color the band of the current statement holds.
 *
 * `base00`, `base01` and `base02` are one small step apart in a base16 theme,
 * and `base01` is already `editor.lineHighlightBackground` — an opaque band on
 * that slot painted over the line the caret sits on and made the current-line
 * highlight disappear. So the band stays translucent and well under the step:
 * the current-line highlight is drawn after it, opaque, and keeps its own
 * color. The bar in the margin is what makes the statement obvious; the band
 * only has to hint at how far it reaches.
 */
const CURRENT_STATEMENT_ALPHA = '30%';

const CurrentStatementStyle = createGlobalStyle<{
  $background: string;
  $bar: string;
}>`
  .${CURRENT_STATEMENT_CLASS} {
    background-color: ${({ $background }) => $background};
  }

  /* One div per line, in the lines-decorations margin — the channel Monaco
     gives for a per-line gutter marker, the same one VS Code draws breakpoints
     and git markers with. A border on the band itself is not an option: the
     band starts at the first character, so it would be drawn under the text. */
  .${CURRENT_STATEMENT_BAR_CLASS} {
    /* Monaco sets left and width inline on this element, so the bar is drawn
       on its edge rather than by resizing it — on the left edge, since the
       margin it lives in clips anything past its own width */
    border-left: 3px solid ${({ $bar }) => $bar};
  }
`;

export type RawSqlEditorHandle = {
  /** where the caret sits in the content, `0` while the editor loads */
  getCaretOffset: () => number;
};

type Props = {
  defaultValue?: string;
  ref?: Ref<RawSqlEditorHandle>;
  onChange?: (value: string) => void;
  onSubmit: () => void;
  /**
   * SQL the content is a fragment of, `SELECT * FROM `city` WHERE ` for a
   * table filter. Completion, validation and highlighting read the whole
   * query, so that a bare `WHERE` body is neither a syntax error nor a set of
   * columns coming from nowhere. Must stay on a single line.
   */
  queryPrefix?: string;
  style?: CSSProperties;
  monacoOptions?: monaco.editor.IStandaloneEditorConstructionOptions;
};

export function RawSqlEditor({
  defaultValue,
  onChange,
  onSubmit,
  queryPrefix,
  ref,
  style,
  monacoOptions,
}: Props) {
  const [monacoInstance, setMonacoInstance] = useState<typeof monaco | null>(
    null
  );
  const [editor, setEditor] =
    useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoEl = useRef<HTMLDivElement>(null);
  // Refs to always hold the latest callbacks without triggering effect re-runs
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const theme = useTheme();

  const monacoTheme = buildMonacoTheme(theme);

  useCompletion();
  useSemanticTokens();

  const memoizedMonacoOptions = useMemo(() => monacoOptions, [monacoOptions]);

  useImperativeHandle(
    ref,
    () => ({
      getCaretOffset: () => {
        const model = editor?.getModel();
        const position = editor?.getPosition();

        return model && position ? model.getOffsetAt(position) : 0;
      },
    }),
    [editor]
  );

  // Load Monaco and create the editor once — useEffectOnce prevents the
  // React 18 StrictMode double-invocation that caused "Element already has
  // context attribute" when editor.create() was called inside a setState updater.
  useEffectOnce(() => {
    let isCanceled = false;

    // `userWorker` configures Monaco workers through module side effects.
    Promise.all([import('monaco-editor'), import('./userWorker')])
      .then(([loadedMonaco]) => {
        if (isCanceled || !monacoEl.current) {
          return;
        }

        loadedMonaco.editor.defineTheme('currentTheme', monacoTheme);

        const createdEditor = loadedMonaco.editor.create(monacoEl.current, {
          value: defaultValue,
          language: LanguageIdEnum.MYSQL,
          theme: 'currentTheme',
          minimap: { enabled: false },
          // standalone themes cannot opt in, `StandaloneTheme` hardcodes
          // `semanticHighlighting = false`
          'semanticHighlighting.enabled': true,
          automaticLayout: true,
          ...memoizedMonacoOptions,
        });

        const model = createdEditor.getModel();

        if (model) {
          // before Monaco asks for the first semantic tokens: the provider has
          // no `onDidChange`, they are only recomputed on a content change
          setQueryPrefix(model, queryPrefix);
        }

        createdEditor.addCommand(
          loadedMonaco.KeyMod.CtrlCmd | loadedMonaco.KeyCode.Enter,
          () => {
            onSubmitRef.current();
          }
        );

        // Splitting lexes the whole content, and the caret moves far more
        // often than the content changes.
        let lastSplit: { content: string; statements: SqlStatement[] } | null =
          null;
        const statementsOf = (content: string): SqlStatement[] => {
          if (lastSplit?.content !== content) {
            lastSplit = { content, statements: splitStatements(content) };
          }

          return lastSplit.statements;
        };

        const decorations = createdEditor.createDecorationsCollection();

        // Show what Ctrl+Enter would run, but only once there is a choice to
        // make: on a single statement the decoration would just repaint the
        // whole editor.
        const highlightCurrentStatement = (): void => {
          const model = createdEditor.getModel();
          const position = createdEditor.getPosition();
          const statements = model ? statementsOf(model.getValue()) : [];
          const current =
            model && position && statements.length > 1
              ? statementAtOffset(statements, model.getOffsetAt(position))
              : undefined;

          decorations.set(
            current && model
              ? [
                  {
                    range: loadedMonaco.Range.fromPositions(
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

        createdEditor.onDidChangeCursorPosition(highlightCurrentStatement);

        createdEditor.onDidChangeModelContent(() => {
          highlightCurrentStatement();
          onChangeRef.current?.(createdEditor.getValue());
        });

        highlightCurrentStatement();

        setMonacoInstance(loadedMonaco);
        setEditor(createdEditor);
      })
      .catch((error) => {
        console.error(
          'Unable to load Monaco editor. Navigate away from this SQL tab and come back, or restart the app, then check bundled asset loading in developer tools.',
          error
        );
      });

    return () => {
      isCanceled = true;
    };
  });

  useEffect(() => {
    if (!monacoInstance) {
      return;
    }

    monacoInstance.editor.defineTheme('currentTheme', monacoTheme);
  }, [monacoInstance, monacoTheme]);

  useEffect(() => {
    const model = editor?.getModel();

    if (model) {
      setQueryPrefix(model, queryPrefix);
    }
  }, [editor, queryPrefix]);

  useEffect(() => {
    // dispose the editor when the component is unmounted
    return () => editor?.dispose();
  }, [editor]);

  return (
    <>
      <CurrentStatementStyle
        $background={`color-mix(in srgb, ${selection({ theme })} ${CURRENT_STATEMENT_ALPHA}, transparent)`}
        $bar={functionForeground({ theme })}
      />
      <div style={style} ref={monacoEl}></div>
    </>
  );
}
