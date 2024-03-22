import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import reactRouterDecorator from '../../../.storybook/decorators/reactRouterDecorator';
import { ConnectionContext } from '../../contexts/ConnectionContext';
import { DatabaseContext } from '../../contexts/DatabaseContext';
import TableList from './TableList';

const meta: Meta<typeof TableList> = {
  component: TableList,
  decorators: [
    reactRouterDecorator,
    (Story) => (
      <ConnectionContext.Provider
        value={{
          currentConnectionSlug: 'test',
          connectionSlugList: ['test'],
          addConnectionToList: async (connectionName) => {
            action('addConnectionToList')(connectionName);
          },
        }}
      >
        <DatabaseContext.Provider
          value={{
            database: 'mocked-db',
            setDatabase: () => {},
            // @ts-expect-error -- we don't need to implement the whole context
            executeQuery: async (query) => {
              action('executeQuery')(query);

              return Promise.resolve([
                [{ Name: 'foo' }, { Name: 'bar' }, { Name: 'baz' }],
              ]);
            },
          }}
        >
          <Story />
        </DatabaseContext.Provider>
      </ConnectionContext.Provider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TableList>;

/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/api/csf
 * to learn how to use render functions.
 */
export const Primary: Story = {
  render: () => <TableList />,
};
