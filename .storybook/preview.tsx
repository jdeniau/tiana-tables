import React, { useEffect } from 'react';
import type { Preview } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { testables } from '../src/contexts/ConfigurationContext';
import { ThemeContextProvider } from '../src/contexts/ThemeContext';
import { changeLanguage } from '../src/i18n';
import { DEFAULT_THEME, THEME_LIST } from '../src/configuration/themes';
import { DEFAULT_LOCALE } from '../src/configuration/locale';
import { background } from '../src/renderer/theme';

const { ConfigurationContext } = testables;

const preview: Preview = {
  parameters: {
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
    locale: {
      description: 'Global locale for components',
      defaultValue: DEFAULT_LOCALE,
      toolbar: {
        title: 'Locale',
        icon: 'globe',
        items: ['en', 'fr'],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, { globals: { theme, locale } }) => {
      useEffect(() => {
        changeLanguage(locale);
      }, [locale]);

      return (
        <ConfigurationContext.Provider
          // weirdly needed to force storybook to re-render
          key={theme}
          value={{
            configuration: {
              version: 1,
              theme,
              locale,
              connections: {},
            },
            changeLanguage: (newLocale) => {
              action('changeLanguage')(newLocale);
            },
            addConnectionToConfig: (connection) => {
              action('addConnectionToConfig')(connection);
            },
            setActiveDatabase: (connectionSlug, value) => {
              action('setActiveDatabase')(connectionSlug, value);
            },
            setActiveTable: (connectionSlug, database, tableName) => {
              action('setActiveTable')(connectionSlug, database, tableName);
            },
            editConnection: (name, connection) => {
              action('editConnection')(name, connection);
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
  background:  ${background({ theme: THEME_LIST[theme] })} !important;
  transition: background 0s;
}`}
        </style>
        <Story />
      </>
    ),
  ],
};

export default preview;
