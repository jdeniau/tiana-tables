/**
 * @vitest-environment happy-dom
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from 'styled-components';
import { afterEach, expect, test, vi } from 'vitest';
import { THEME_LIST } from '../../../configuration/themes';
import useMonaco from './useMonaco';

const { defineTheme } = vi.hoisted(() => ({ defineTheme: vi.fn() }));

vi.mock('monaco-editor', () => ({ editor: { defineTheme } }));
vi.mock('./userWorker', () => ({}));

function Editor({ renders }: { renders: number }) {
  useMonaco('Unable to load Monaco editor.');

  return <span>{renders}</span>;
}

const root = createRoot(document.createElement('div'));

const render = (themeName: string, renders: number) =>
  act(async () => {
    root.render(
      <ThemeProvider theme={THEME_LIST[themeName]}>
        <Editor renders={renders} />
      </ThemeProvider>
    );
  });

afterEach(() => {
  defineTheme.mockClear();
});

// every keystroke re-renders the editor: redefining the theme then repainted it in the default colours
test('the theme is defined once, and again only when it changes', async () => {
  await render('Nord', 0);
  await vi.waitFor(() => expect(defineTheme).toHaveBeenCalledTimes(1));
  expect(defineTheme.mock.calls[0][0]).toBe('currentTheme');
  expect(defineTheme.mock.calls[0][1].base).toBe('vs-dark');

  await render('Nord', 1);
  await render('Nord', 2);
  expect(defineTheme).toHaveBeenCalledTimes(1);

  await render('Solarized Light', 3);
  expect(defineTheme).toHaveBeenCalledTimes(2);
  expect(defineTheme.mock.calls[1][1].base).toBe('vs');
});
