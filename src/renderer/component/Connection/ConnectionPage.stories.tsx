import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import { DEFAULT_THEME } from '../../../configuration/themes';
import { testables } from '../../../contexts/ConfigurationContext';
import { ConnectionContext } from '../../../contexts/ConnectionContext';
import ConnectionPage from './ConnectionPage';

const { ConfigurationContext } = testables;

const meta: Meta<typeof ConnectionPage> = {
  component: ConnectionPage,
  decorators: [
    (Story) => (
      <ConnectionContext.Provider
        value={{
          currentConnectionName: null,
          connectionNameList: [],
          connectTo: async (connection) => {
            action('connectTo')(connection);
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
            connections: {
              test: {
                name: 'test',
                host: 'localhost',
                port: 3307,
                user: 'root',
                password: '',
              },
              'production connection': {
                name: 'prod',
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
          updateConnectionState: (connectionName, key, value) => {
            action('updateConnectionState')(connectionName, key, value);
          },
          editConnection: (name, connection) => {
            action('editConnection')(name, connection);
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
