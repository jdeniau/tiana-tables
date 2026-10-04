import { useEffect, useRef, useState } from 'react';
import type monaco from 'monaco-editor';
import useMonaco, { MONACO_THEME } from '../MonacoEditor/useMonaco';

interface JsonCellEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly: boolean;
  height: number;
}

/**
 * A JSON value, edited in Monaco.
 *
 * Monaco is already there for SQL, and its bundled JSON service is what makes
 * this worth more than a textarea: bracket matching, folding of a nested
 * object, and a squiggle under a missing comma before the value is ever sent.
 * The service runs in its own worker (see `userWorker`).
 *
 * Saving stays gated on `JSON.parse` in the modal rather than on what Monaco
 * reports: the markers of a worker that has not answered yet would let a
 * broken value through.
 */
export default function JsonCellEditor({
  value,
  onChange,
  readOnly,
  height,
}: JsonCellEditorProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const monacoInstance = useMonaco(
    'Unable to load Monaco editor for a JSON cell.'
  );
  const [editor, setEditor] =
    useState<monaco.editor.IStandaloneCodeEditor | null>(null);

  // read through a ref so that a new closure on every render does not tear the
  // content listener down and up again (as in RawSqlEditor)
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // the initial value is only read when the editor is created; afterwards the
  // editor holds the truth and the effect below only pushes outside changes
  const initialValueRef = useRef(value);

  useEffect(() => {
    if (!monacoInstance || !container) {
      return;
    }

    const createdEditor = monacoInstance.editor.create(container, {
      value: initialValueRef.current,
      language: 'json',
      theme: MONACO_THEME,
      minimap: { enabled: false },
      automaticLayout: true,
      scrollBeyondLastLine: false,
      lineNumbers: 'off',
      folding: true,
      tabSize: 2,
    });

    const subscription = createdEditor.onDidChangeModelContent(() => {
      onChangeRef.current(createdEditor.getValue());
    });

    setEditor(createdEditor);

    return () => {
      subscription.dispose();
      createdEditor.dispose();
      setEditor(null);
    };
  }, [monacoInstance, container]);

  useEffect(() => {
    // an outside change — reloading the value the server holds after a
    // conflict — must reach the editor, an echo of our own typing must not
    if (editor && editor.getValue() !== value) {
      editor.setValue(value);
    }
  }, [editor, value]);

  useEffect(() => {
    editor?.updateOptions({ readOnly });
  }, [editor, readOnly]);

  return <div ref={setContainer} style={{ height, width: '100%' }} />;
}
