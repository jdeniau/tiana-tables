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
import { createGlobalStyle, useTheme } from 'styled-components';
import type { DatabaseEngine } from '../../../sql/engine';
import { accent, fontScale, mono, selection, size } from '../../theme';
import { languageOf } from './language';
import { setQueryPrefix } from './queryPrefix';
import useCompletion from './useCompletion';
import useCurrentStatementHighlight, {
  CURRENT_STATEMENT_BAR_CLASS,
  CURRENT_STATEMENT_CLASS,
} from './useCurrentStatementHighlight';
import useMonaco, { MONACO_THEME } from './useMonaco';
import useSemanticTokens from './useSemanticTokens';

/** how much of the selection colour a dot of the editor's grid holds */
const DOT_ALPHA = '35%';

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
  $dot: string;
}>`
  /* The dot grid of DESIGN.md, on the layer Monaco scrolls with the text, so
     the dots keep their place between the lines. The tile is one line high
     and the dot sits at its centre, so a half-line offset puts every dot on a
     line boundary rather than behind the glyphs. */
  .monaco-editor .lines-content {
    background-image: radial-gradient(
      ${({ $dot }) => $dot} 1px,
      transparent 1px
    );
    background-size: ${size.line} ${size.line};
    background-position: 0 calc(${size.line} / 2);
  }

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

/**
 * The editor as DESIGN.md draws it: the base size in mono on 22px lines, a
 * right-aligned gutter and nothing else in the margins — no folding, no
 * glyphs, no overview ruler. The current-statement bar lives in the
 * lines-decorations margin, right of the numbers.
 */
const BASE_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
  fontFamily: mono,
  fontSize: fontScale.base,
  lineHeight: parseInt(size.line, 10),
  lineNumbersMinChars: 3,
  folding: false,
  glyphMargin: false,
  minimap: { enabled: false },
  overviewRulerLanes: 0,
  overviewRulerBorder: false,
  hideCursorInOverviewRuler: true,
  scrollBeyondLastLine: false,
  scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
};

export type RawSqlEditorHandle = {
  /** where the caret sits in the content, `0` while the editor loads */
  getCaretOffset: () => number;
};

type Props = {
  /** whose grammar reads the content, and whose tokenizer colors it: fixed, since a connection change remounts the page */
  engine: DatabaseEngine;
  defaultValue?: string;
  ref?: Ref<RawSqlEditorHandle>;
  onChange?: (value: string) => void;
  /**
   * How many statements the content holds, whenever that number changes —
   * what tells the page whether there is a choice of statements to run.
   */
  onStatementCountChange?: (count: number) => void;
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
  engine,
  defaultValue,
  onChange,
  onStatementCountChange,
  onSubmit,
  queryPrefix,
  ref,
  style,
  monacoOptions,
}: Props) {
  const monacoInstance = useMonaco(
    'Unable to load Monaco editor. Navigate away from this SQL tab and come back, or restart the app, then check bundled asset loading in developer tools.'
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

  // before the effect creating the editor, so that its cleanup runs before the editor is disposed
  useCurrentStatementHighlight(
    monacoInstance,
    editor,
    engine,
    onStatementCountChange
  );

  useEffect(() => {
    if (!monacoInstance || !monacoEl.current) {
      return;
    }

    const createdEditor = monacoInstance.editor.create(monacoEl.current, {
      value: defaultValue,
      language: languageOf(engine),
      theme: MONACO_THEME,
      // standalone themes cannot opt in, `StandaloneTheme` hardcodes
      // `semanticHighlighting = false`
      'semanticHighlighting.enabled': true,
      automaticLayout: true,
      ...BASE_OPTIONS,
      ...memoizedMonacoOptions,
    });

    const model = createdEditor.getModel();

    if (model) {
      // before Monaco asks for the first semantic tokens: the provider has
      // no `onDidChange`, they are only recomputed on a content change
      setQueryPrefix(model, queryPrefix);
    }

    createdEditor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Enter,
      () => {
        onSubmitRef.current();
      }
    );

    createdEditor.onDidChangeModelContent(() => {
      onChangeRef.current?.(createdEditor.getValue());
    });

    setEditor(createdEditor);

    return () => {
      createdEditor.dispose();
      setEditor(null);
    };
    // the content, the prefix and the options are read once: the editor holds them from then on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monacoInstance]);

  useEffect(() => {
    const model = editor?.getModel();

    if (model) {
      setQueryPrefix(model, queryPrefix);
    }
  }, [editor, queryPrefix]);

  return (
    <>
      <CurrentStatementStyle
        $background={`color-mix(in srgb, ${selection({ theme })} ${CURRENT_STATEMENT_ALPHA}, transparent)`}
        $bar={accent({ theme })}
        $dot={`color-mix(in srgb, ${selection({ theme })} ${DOT_ALPHA}, transparent)`}
      />
      <div style={style} ref={monacoEl}></div>
    </>
  );
}
