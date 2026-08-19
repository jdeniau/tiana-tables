/* eslint-disable import-x/default -- Vite resolves `?worker` imports to a
   worker constructor, which the import plugin cannot see. */
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';

// The SQL language service runs on the main thread (see useCompletion), so the
// editor only ever needs Monaco's own worker.
self.MonacoEnvironment = {
  getWorker() {
    return new EditorWorker();
  },
};
