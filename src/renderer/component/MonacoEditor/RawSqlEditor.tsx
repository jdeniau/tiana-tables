import { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import './userWorker';

type Props = {
  defaultValue?: string;
  onChange?: (value: string) => void;
};

export function RawSqlEditor({ defaultValue, onChange }: Props) {
  const [editor, setEditor] =
    useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoEl = useRef<HTMLDivElement>(null);

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
      });

      createdEditor.onDidChangeModelContent(() => {
        onChange?.(createdEditor.getValue());
      });

      return createdEditor;
    });
  }, [defaultValue, editor, onChange]);

  useEffect(() => {
    // dispose the editor when the component is unmounted
    return () => editor?.dispose();
  }, [editor]);

  return (
    <div
      style={{
        width: '100vw',
        height: '35vh',
      }}
      ref={monacoEl}
    ></div>
  );
}
