import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import reactRouterDecorator from '../../../.storybook/decorators/reactRouterDecorator';
import NavigateModal from './NavigateModal';
// eslint-disable-next-line import/no-unresolved

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
  args: {
    tableStatusList: [
      // @ts-expect-error don't want all data, only the name
      { Name: 'departments' },
      // @ts-expect-error don't want all data, only the name
      { Name: 'dept_emp' },
      // @ts-expect-error don't want all data, only the name
      { Name: 'dept_manager' },
      // @ts-expect-error don't want all data, only the name
      { Name: 'employees' },
      // @ts-expect-error don't want all data, only the name
      { Name: 'salaries' },
      // @ts-expect-error don't want all data, only the name
      { Name: 'titles' },
    ],
  },
};
