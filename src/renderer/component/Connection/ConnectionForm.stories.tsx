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
    (Story, { globals: { theme, locale } }) => (
      <ConfigurationContext.Provider
        value={{
          configuration: {
            version: 1,
            theme,
            locale,
            connections: {},
          },
          addConnectionToConfig: (connection) => {
            action('addConnectionToConfig')(connection);
            addConnectionToConfig(connection);
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

    await userEvent.click(canvas.getByText(/Save and connect/i));

    expect(addConnectionToConfig).toHaveBeenCalledWith({
      host: 'my.database.com',
      name: 'some personnal name',
      password: '',
      port: 3306,
      user: 'root',
    });
  },
};

export const Edit: Story = {
  args: {
    connection: {
      name: 'test',
      slug: 'test',
      host: 'localhost',
      port: 3307,
      user: 'test-user',
      password: '',
    },
  },
};
