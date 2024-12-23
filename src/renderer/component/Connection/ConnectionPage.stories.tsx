import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import reactRouterDecorator from '../../../../.storybook/decorators/reactRouterDecorator';
import { DEFAULT_LOCALE } from '../../../configuration/locale';
import { DEFAULT_THEME } from '../../../configuration/themes';
import { testables } from '../../../contexts/ConfigurationContext';
import { ConnectionContext } from '../../../contexts/ConnectionContext';
import ConnectionPage from './ConnectionPage';

const { ConfigurationContext } = testables;

const meta: Meta<typeof ConnectionPage> = {
  component: ConnectionPage,
  decorators: [
    reactRouterDecorator,
    (Story) => (
      <ConnectionContext.Provider
        value={{
          currentConnectionSlug: null,
          connectionSlugList: [],
          addConnectionToList: async (connectionName) => {
            action('addConnectionToList')(connectionName);
          },
        }}
      >
        <Story />
      </ConnectionContext.Provider>
    ),
    (Story) => (
      <ConfigurationContext.Provider
        value={{
          configuration: {
            version: 1,
            theme: DEFAULT_THEME.name,
            locale: DEFAULT_LOCALE,
            connections: {
              test: {
                name: 'test',
                slug: 'test',
                host: 'localhost',
                port: 3307,
                user: 'root',
                password: '',
              },
              'production connection': {
                name: 'prod',
                slug: 'prod',
                host: 'localhost',
                port: 3306,
                user: 'root',
                password: '',
              },
            },
          },

          addConnectionToConfig: (connection) => {
            action('addConnectionToConfig')(connection);
          },
          setActiveDatabase: (connectionName, value) => {
            action('setActiveDatabase')(connectionName, value);
          },
          setActiveTable: (connectionName, database, tableName) => {
            action('setActiveTable')(connectionName, database, tableName);
          },
          editConnection: (name, connection) => {
            action('editConnection')(name, connection);
          },
          changeLanguage: (language) => {
            action('changeLanguage')(language);
          },
        }}
      >
        <Story />
      </ConfigurationContext.Provider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ConnectionPage>;

/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/api/csf
 * to learn how to use render functions.
 */
export const Primary: Story = {};

// export const Edit: Story = {
//   args: {
//     connection: {
//       name: 'test',
//       host: 'localhost',
//       port: 3307,
//       user: 'test-user',
//       password: '',
//     },
//   },
// };
