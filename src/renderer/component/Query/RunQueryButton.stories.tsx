import type { Meta, StoryObj } from '@storybook/react';
import { RunQueryButton } from './RunQueryButton';

const meta: Meta<typeof RunQueryButton> = {
  component: RunQueryButton,
  args: {
    disabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof RunQueryButton>;

export const Primary: Story = {};

export const Running: Story = {
  args: {
    disabled: true,
  },
};
