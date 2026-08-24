/* eslint-disable import-x/default -- Vite resolves `?worker` imports to a
   worker constructor, which the import plugin cannot see. */
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

// The SQL language service runs on the main thread (see useCompletion), so SQL
// only ever needs Monaco's own worker. JSON is the one language whose bundled
// service is used as it ships — it is what validates and formats the value of
// a JSON cell — and it wants its own worker.
self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    if (label === 'json') {
      return new JsonWorker();
    }

    return new EditorWorker();
  },
};
