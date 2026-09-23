import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import reactRouterDecorator from '../../../.storybook/decorators/reactRouterDecorator';
import { DatabaseListContextProvider } from '../../contexts/DatabaseListContext';
import { TableListContextProvider } from '../../contexts/TableListContext';
import NavigateModal from './NavigateModal';

const meta: Meta<typeof NavigateModal> = {
  component: NavigateModal,
  args: {
    isNavigateModalOpen: true,
    setIsNavigateModalOpen: action('setIsNavigateModalOpen'),
  },
  decorators: [reactRouterDecorator],
};

export default meta;
type Story = StoryObj<typeof NavigateModal>;

/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/api/csf
 * to learn how to use render functions.
 */
export const Primary: Story = {
  decorators: [
    (Story) => (
      <DatabaseListContextProvider databaseList={['mysql', 'users']}>
        <TableListContextProvider
          tableList={[
            'departments',
            'dept_emp',
            'dept_manager',
            'employees',
            'salaries',
            'titles',
          ]}
        >
          <Story />
        </TableListContextProvider>
      </DatabaseListContextProvider>
    ),
  ],
};
