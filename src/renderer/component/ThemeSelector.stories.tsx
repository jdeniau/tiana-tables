import type { Meta, StoryObj } from '@storybook/react';
import ThemeSelector from './ThemeSelector';

const meta: Meta<typeof ThemeSelector> = {
  component: ThemeSelector,
  decorators: [
    (Story) => (
      <div style={{ padding: 16 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ThemeSelector>;

export const Default: Story = {};
