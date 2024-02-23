import React from 'react';
import type { Preview } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { ThemeContextProvider, testables } from '../src/Contexts';
import { MemoryRouter } from 'react-router';
import { DEFAULT_THEME } from '../src/theme';

const { ConfigurationContext } = testables;

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
    (Story) => (
      <ConfigurationContext.Provider
        value={{
          configuration: {
            version: 1,
            theme: 'Visual Studio',
            connections: {},
          },
          addConnectionToConfig: (connection) => {
            action('addConnectionToConfig')(connection);
          },
        }}
      >
        <ThemeContextProvider>
          <Story />
        </ThemeContextProvider>
      </ConfigurationContext.Provider>
    ),
  ],
};

export default preview;
