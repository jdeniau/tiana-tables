import * as monaco from 'monaco-editor';
/* eslint-disable import/no-unresolved */
// @ts-expect-error this is workink and taken from monaco-editor documentation
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
// @ts-expect-error this is workink and taken from monaco-editor documentation
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
// @ts-expect-error this is workink and taken from monaco-editor documentation
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
// @ts-expect-error this is workink and taken from monaco-editor documentation
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
// @ts-expect-error this is workink and taken from monaco-editor documentation
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
/* eslint-enable import/no-unresolved */

self.MonacoEnvironment = {
  getWorker(_: unknown, label: string) {
    if (label === 'json') {
      return new jsonWorker();
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new cssWorker();
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new htmlWorker();
    }
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker();
    }
    return new editorWorker();
  },
};

monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
