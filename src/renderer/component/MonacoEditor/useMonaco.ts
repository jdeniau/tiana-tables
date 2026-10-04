import { useEffect, useState } from 'react';
import type monaco from 'monaco-editor';
import { useTheme } from 'styled-components';
import { buildMonacoTheme } from './themes';

/** the name every editor passes as `theme`, defined from the current theme */
export const MONACO_THEME = 'currentTheme';

/**
 * Monaco, loaded on first use with its workers, `null` until then.
 * `MONACO_THEME` follows the theme of the app from then on.
 */
export default function useMonaco(
  failureMessage: string
): typeof monaco | null {
  const [monacoInstance, setMonacoInstance] = useState<typeof monaco | null>(
    null
  );
  const monacoTheme = buildMonacoTheme(useTheme());

  useEffect(() => {
    let isCanceled = false;

    // `userWorker` configures Monaco workers through module side effects
    Promise.all([import('monaco-editor'), import('./userWorker')])
      .then(([loadedMonaco]) => {
        if (!isCanceled) {
          setMonacoInstance(loadedMonaco);
        }
      })
      .catch((error) => {
        console.error(failureMessage, error);
      });

    return () => {
      isCanceled = true;
    };
  }, [failureMessage]);

  // before the effects of the caller, which create the editor with this theme
  useEffect(() => {
    monacoInstance?.editor.defineTheme(MONACO_THEME, monacoTheme);
  }, [monacoInstance, monacoTheme]);

  return monacoInstance;
}
