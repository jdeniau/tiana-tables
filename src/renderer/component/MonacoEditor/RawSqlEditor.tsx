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
  const monacoEl = useRef(null);

  useEffect(() => {
    if (monacoEl) {
      setEditor((editor) => {
        if (editor) {
          // don't recreate the editor
          return editor;
        }

        const createdEditor = monaco.editor.create(monacoEl.current!, {
          value: defaultValue,
          language: 'sql',
        });

        createdEditor.onDidChangeModelContent(() => {
          onChange?.(createdEditor.getValue());
        });

        return createdEditor;
      });
    }

    return () => editor?.dispose();
  }, [editor]);

  return (
    <>
      <div
        style={{
          width: '100vw',
          height: '50vh',
        }}
        ref={monacoEl}
      ></div>
      <button
        onClick={() => {
          console.log(editor?.getValue());
        }}
      >
        Log editor value
      </button>
    </>
  );
}
