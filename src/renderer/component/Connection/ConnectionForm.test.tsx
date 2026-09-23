/** @vitest-environment happy-dom */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { DEFAULT_THEME } from '../../../configuration/themes';
import { testables } from '../../../contexts/ConfigurationContext';
import ConnectionForm from './ConnectionForm';

const { ConfigurationContext } = testables;

// tells React this environment wraps its updates in `act`
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let unmount: () => void = () => {};

afterEach(() => {
  act(() => unmount());
  document.body.innerHTML = '';
});

/** a field typed into the way a user does, through React's own value setter */
function type(input: HTMLInputElement, text: string): void {
  const setValue = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value'
  )?.set;

  setValue?.call(input, text);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('ConnectionForm', () => {
  // an `<Input>` answered the port as text, whatever its type claimed
  test('submits the port typed as a number', async () => {
    const addConnectionToConfig = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    unmount = () => root.unmount();

    await act(async () => {
      root.render(
        <MemoryRouter>
          <ThemeProvider theme={DEFAULT_THEME}>
            <ConfigurationContext.Provider
              value={
                {
                  configuration: { connections: {} },
                  addConnectionToConfig,
                } as never
              }
            >
              <ConnectionForm />
            </ConfigurationContext.Provider>
          </ThemeProvider>
        </MemoryRouter>
      );
    });

    const field = (id: string) =>
      container.querySelector<HTMLInputElement>(`#${id}`)!;

    await act(async () => {
      type(field('name'), 'docker (dev)');
      type(field('port'), '3307');
    });

    await act(async () => {
      container.querySelector('form')!.requestSubmit();
    });

    await vi.waitFor(() => expect(addConnectionToConfig).toHaveBeenCalled());

    expect(addConnectionToConfig.mock.lastCall?.[0]).toMatchObject({
      port: 3307,
    });
  });
});
