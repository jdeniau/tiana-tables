import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import reactRouterDecorator from '../../../.storybook/decorators/reactRouterDecorator';
import { ConnectionContext } from '../../contexts/ConnectionContext';
import { DatabaseContext } from '../../contexts/DatabaseContext';
import NavigateModal from './NavigateModal';
// eslint-disable-next-line import/no-unresolved

const meta: Meta<typeof NavigateModal> = {
  component: NavigateModal,
  args: {
    isNavigateModalOpen: true,
    setIsNavigateModalOpen: action('setIsNavigateModalOpen'),
  },
  decorators: [
    reactRouterDecorator,
    (Story) => (
      <ConnectionContext.Provider
        value={{
          currentConnectionName: 'test',
          connectionNameList: ['test'],
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
                [
                  { Name: 'departments' },
                  { Name: 'dept_emp' },
                  { Name: 'dept_manager' },
                  { Name: 'employees' },
                  { Name: 'salaries' },
                  { Name: 'titles' },
                ],
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
type Story = StoryObj<typeof NavigateModal>;

/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/api/csf
 * to learn how to use render functions.
 */
export const Primary: Story = {};
