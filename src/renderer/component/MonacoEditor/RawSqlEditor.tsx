import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import type monaco from 'monaco-editor';
import { LanguageIdEnum } from 'monaco-sql-languages';
import { useTheme } from 'styled-components';
import useEffectOnce from '../../hooks/useEffectOnce';
import { setQueryPrefix } from './queryPrefix';
import { buildMonacoTheme } from './themes';
import useCompletion from './useCompletion';
import useSemanticTokens from './useSemanticTokens';

type Props = {
  defaultValue?: string;
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
  // read through a ref in the creation effect, which runs once; the effect
  // below is what keeps a changing prefix in sync
  const queryPrefixRef = useRef(queryPrefix);
  queryPrefixRef.current = queryPrefix;
  const theme = useTheme();

  const monacoTheme = buildMonacoTheme(theme);

  useCompletion();
  useSemanticTokens();

  const memoizedMonacoOptions = useMemo(() => monacoOptions, [monacoOptions]);

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
          setQueryPrefix(model, queryPrefixRef.current);
        }

        createdEditor.addCommand(
          loadedMonaco.KeyMod.CtrlCmd | loadedMonaco.KeyCode.Enter,
          () => {
            onSubmitRef.current();
          }
        );

        createdEditor.onDidChangeModelContent(() => {
          onChangeRef.current?.(createdEditor.getValue());
        });

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

  return <div style={style} ref={monacoEl}></div>;
}
