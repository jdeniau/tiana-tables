import type { Preview } from '@storybook/react';
import { OpenTablesContextProvider } from '../../src/contexts/OpenTablesContext';

// extract unexposed type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DecoratorFunction = Extract<Preview['decorators'], Array<any>>[number];

/** The open tables of a story, with `window.config` stubbed — the provider writes the run to it. */
export function openTablesDecorator(
  openTables: Array<string>
): DecoratorFunction {
  return function WithOpenTables(Story) {
    // @ts-expect-error a story has no main process to answer it
    window.config = { setOpenTables: () => {}, setActiveTable: () => {} };

    return (
      <OpenTablesContextProvider
        connectionSlug="test"
        database="shop"
        openTables={openTables}
      >
        <Story />
      </OpenTablesContextProvider>
    );
  };
}
