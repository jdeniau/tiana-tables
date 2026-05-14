import * as monaco from 'monaco-editor';
import invariant from 'tiny-invariant';

self.MonacoEnvironment = {
  getWorker(_: unknown, label: string) {
    const getWorkerModule = (moduleUrl: string, label: string) => {
      invariant(
        self.MonacoEnvironment,
        'MonacoEnvironment should be defined on self'
      );

      const scriptURL = self.MonacoEnvironment.getWorkerUrl?.(moduleUrl, label);

      invariant(scriptURL, 'Module URL should be defined');

      return new Worker(scriptURL, {
        name: label,
        type: 'module',
      });
    };

    switch (label) {
      case 'json':
        return getWorkerModule(
          '/monaco-editor/esm/vs/language/json/json.worker?worker',
          label
        );
      case 'css':
      case 'scss':
      case 'less':
        return getWorkerModule(
          '/monaco-editor/esm/vs/language/css/css.worker?worker',
          label
        );
      case 'html':
      case 'handlebars':
      case 'razor':
        return getWorkerModule(
          '/monaco-editor/esm/vs/language/html/html.worker?worker',
          label
        );
      case 'typescript':
      case 'javascript':
        return getWorkerModule(
          '/monaco-editor/esm/vs/language/typescript/ts.worker?worker',
          label
        );
      default:
        return getWorkerModule(
          '/monaco-editor/esm/vs/editor/editor.worker?worker',
          label
        );
    }
  },
};

// This line is mandatory, otherwise syntax color will not work
monaco.typescript.typescriptDefaults.setEagerModelSync(true);
