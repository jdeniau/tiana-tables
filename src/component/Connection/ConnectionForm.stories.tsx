import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { ConnectionContext } from '../../contexts/ConnectionContext';
import ConnectionForm from './ConnectionForm';

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
  ],
};

export default meta;
type Story = StoryObj<typeof ConnectionForm>;

/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/api/csf
 * to learn how to use render functions.
 */
export const Create: Story = {};

export const Edit: Story = {
  args: {
    connection: {
      name: 'test',
      host: 'localhost',
      port: 3307,
      user: 'test-user',
      password: '',
    },
  },
};
