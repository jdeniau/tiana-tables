import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import TableList from './TableList';
import { DatabaseContext } from '../contexts/DatabaseContext';
import { ConnectionContext } from '../contexts/ConnectionContext';

const meta: Meta<typeof TableList> = {
  component: TableList,
  decorators: [
    (Story) => (
      <ConnectionContext.Provider
        value={{
          currentConnectionName: 'test',
          connectionNameList: ['test'],
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          setCurrentConnectionName: () => {},
          connectTo: async (connection) => {
            action('connectTo')(connection);
          },
        }}
      >
        <DatabaseContext.Provider
          value={{
            database: 'mocked-db',
            setDatabase: () => {},
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
