import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import type monaco from 'monaco-editor';
import { useTheme } from 'styled-components';
import useEffectOnce from '../../hooks/useEffectOnce';
import { convertTextmateThemeToMonaco } from './themes';
import useCompletion from './useCompletion';

type Props = {
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSubmit: () => void;
  style?: CSSProperties;
  monacoOptions?: monaco.editor.IStandaloneEditorConstructionOptions;
};

export function RawSqlEditor({
  defaultValue,
  onChange,
  onSubmit,
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
  const textmateTheme = theme;

  // Convert the TextMate theme to a Monaco Editor theme
  const monacoTheme = convertTextmateThemeToMonaco(textmateTheme);

  useCompletion(monacoInstance);

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
          language: 'sql',
          theme: 'currentTheme',
          minimap: { enabled: false },
          automaticLayout: true,
          ...memoizedMonacoOptions,
        });

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
    // dispose the editor when the component is unmounted
    return () => editor?.dispose();
  }, [editor]);

  return <div style={style} ref={monacoEl}></div>;
}
