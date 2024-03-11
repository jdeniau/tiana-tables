import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import './userWorker';
import { useTheme } from 'styled-components';
import { convertTextmateThemeToMonaco } from './themes';

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
  const [editor, setEditor] =
    useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoEl = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const textmateTheme = theme;

  // Convert the TextMate theme to a Monaco Editor theme
  const monacoTheme = convertTextmateThemeToMonaco(textmateTheme);

  monaco.editor.defineTheme('currentTheme', monacoTheme);

  const memoizedMonacoOptions = useMemo(() => monacoOptions, [monacoOptions]);

  // initialize the editor
  useEffect(() => {
    const currentMonacoElement = monacoEl.current;

    if (!currentMonacoElement) {
      return;
    }

    setEditor((editor) => {
      if (editor) {
        // don't recreate the editor
        return editor;
      }

      const createdEditor = monaco.editor.create(currentMonacoElement, {
        value: defaultValue,
        language: 'sql',
        theme: 'currentTheme',
        minimap: { enabled: false },
        automaticLayout: true,
        ...memoizedMonacoOptions,
      });

      createdEditor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        () => {
          onSubmit();
        }
      );

      createdEditor.onDidChangeModelContent(() => {
        onChange?.(createdEditor.getValue());
      });

      return createdEditor;
    });
  }, [defaultValue, editor, onChange, memoizedMonacoOptions, onSubmit]);

  useEffect(() => {
    // dispose the editor when the component is unmounted
    return () => editor?.dispose();
  }, [editor]);

  return <div style={style} ref={monacoEl}></div>;
}
