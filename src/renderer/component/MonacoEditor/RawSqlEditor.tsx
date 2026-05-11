import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { useTheme } from 'styled-components';
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
  const [monacoInstance, setMonacoInstance] =
    useState<typeof import('monaco-editor/esm/vs/editor/editor.api') | null>(
      null
    );
  const [editor, setEditor] =
    useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoEl = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const textmateTheme = theme;

  // Convert the TextMate theme to a Monaco Editor theme
  const monacoTheme = convertTextmateThemeToMonaco(textmateTheme);

  useCompletion(monacoInstance);

  useEffect(() => {
    let isCanceled = false;

    Promise.all([
      import('monaco-editor/esm/vs/editor/editor.api'),
      import('./userWorker'),
    ]).then(([loadedMonaco]) => {
      if (!isCanceled) {
        setMonacoInstance(loadedMonaco);
      }
    });

    return () => {
      isCanceled = true;
    };
  }, []);

  useEffect(() => {
    if (!monacoInstance) {
      return;
    }

    monacoInstance.editor.defineTheme('currentTheme', monacoTheme);
  }, [monacoInstance, monacoTheme]);

  const memoizedMonacoOptions = useMemo(() => monacoOptions, [monacoOptions]);

  // initialize the editor
  useEffect(() => {
    if (!monacoInstance) {
      return;
    }

    const currentMonacoElement = monacoEl.current;

    if (!currentMonacoElement) {
      return;
    }

    setEditor((editor) => {
      if (editor) {
        // don't recreate the editor
        return editor;
      }

      const createdEditor = monacoInstance.editor.create(currentMonacoElement, {
        value: defaultValue,
        language: 'sql',
        theme: 'currentTheme',
        minimap: { enabled: false },
        automaticLayout: true,
        ...memoizedMonacoOptions,
      });

      createdEditor.addCommand(
        monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Enter,
        () => {
          onSubmit();
        }
      );

      createdEditor.onDidChangeModelContent(() => {
        onChange?.(createdEditor.getValue());
      });

      return createdEditor;
    });
  }, [
    defaultValue,
    editor,
    onChange,
    memoizedMonacoOptions,
    monacoInstance,
    onSubmit,
  ]);

  useEffect(() => {
    // dispose the editor when the component is unmounted
    return () => editor?.dispose();
  }, [editor]);

  return <div style={style} ref={monacoEl}></div>;
}
