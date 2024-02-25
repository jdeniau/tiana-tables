import React from 'react';
import type { Preview } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { useGlobals, useParameter } from '@storybook/manager-api';
import { testables } from '../src/Contexts';
import { ThemeContextProvider } from '../src/contexts/ThemeContext';
import { MemoryRouter } from 'react-router';
import { DEFAULT_THEME, THEME_LIST, getSetting } from '../src/theme';

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
    backgrounds: {
      disable: true,
    },
  },

  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: DEFAULT_THEME.name,
      toolbar: {
        // The label to show for this toolbar item
        title: 'Theme',
        icon: 'circlehollow',
        // Array of plain string values or MenuItem shape (see below)
        items: Object.keys(THEME_LIST),
        // Change title based on selected value
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
    (Story, { globals: { theme } }) => {
      // const themeName = useParameter('backgrounds');

      // console.log('themeName', themeName);

      return (
        <ConfigurationContext.Provider
          // weirdly needed to force storybook to re-render
          key={theme}
          value={{
            configuration: {
              version: 1,
              theme,
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
      );
    },
    // force storybook background to be the same as the theme
    (Story, { globals: { theme } }) => (
      <>
        <style>
          {`
.sb-show-main {
  background:  ${getSetting(
    // @ts-expect-error theme is a keyof THEME_LIST
    THEME_LIST[theme],
    'background'
  )} !important;
  transition: background 0s;
}`}
        </style>
        <Story />
      </>
    ),
  ],
};

export default preview;
