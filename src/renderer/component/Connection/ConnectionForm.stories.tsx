import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';
import reactRouterDecorator from '../../../../.storybook/decorators/reactRouterDecorator';
import { testables } from '../../../contexts/ConfigurationContext';
import ConnectionForm from './ConnectionForm';

const { ConfigurationContext } = testables;

const addConnectionToConfig = fn();

const meta: Meta<typeof ConnectionForm> = {
  component: ConnectionForm,
  decorators: [
    reactRouterDecorator,
    (Story, { globals: { theme } }) => (
      <ConfigurationContext.Provider
        value={{
          configuration: {
            version: 1,
            theme,
            connections: {},
          },
          addConnectionToConfig: (connection) => {
            action('addConnectionToConfig')(connection);
            addConnectionToConfig(connection);
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
type Story = StoryObj<typeof ConnectionForm>;

/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/api/csf
 * to learn how to use render functions.
 */
export const Create: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(
      canvas.getByRole('textbox', {
        name: /name/i,
      }),
      'some personnal name'
    );

    const host = canvas.getByRole('textbox', {
      name: /host/i,
    });

    await userEvent.clear(host);

    await userEvent.type(host, 'my.database.com');

    await userEvent.click(canvas.getByText(/save and connect/i));

    expect(addConnectionToConfig).toHaveBeenCalledWith({
      name: 'some personnal name',
      host: 'my.database.com',
      port: 3306,
      user: 'root',
      password: '',
    });
  },
};

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
