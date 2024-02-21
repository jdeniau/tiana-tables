import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import {
  ConfigurationContextProvider,
  ConnectionContext,
  testables,
} from '../../Contexts';
import ConnectionForm from './ConnectionForm';

const { ConfigurationContext } = testables;

const meta: Meta<typeof ConnectionForm> = {
  component: ConnectionForm,
  decorators: [
    (Story) => (
      <ConnectionContext.Provider
        value={{
          currentConnectionName: 'test',
          connectionNameList: ['test'],
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          setCurrentConnectionName: () => {},
          connectTo: (connection) => {
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
            theme: 'test',
            connections: {},
          },
          addConnectionToConfig: (connection) => {
            action('addConnectionToConfig')(connection);
          },
        }}
      >
        <Story />
      </ConfigurationContext.Provider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ConnectionForm>;

/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/api/csf
 * to learn how to use render functions.
 */
export const Form: Story = {
  render: () => <ConnectionForm />,
};
