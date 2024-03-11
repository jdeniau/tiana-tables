import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import reactRouterDecorator from '../../../.storybook/decorators/reactRouterDecorator';
import ButtonLink from './ButtonLink';

const meta: Meta<typeof ButtonLink> = {
  component: ButtonLink,
  args: {
    children: 'ButtonLink',
    onClick: action('onClick'),
    to: '/go-somewhere',
  },
  decorators: [
    reactRouterDecorator,
    (Story) => (
      <div>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ButtonLink>;

/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/api/csf
 * to learn how to use render functions.
 */
export const Default: Story = {};

export const primary: Story = {
  args: {
    type: 'primary',
  },
};

export const Block: Story = {
  args: {
    block: true,
  },
};
