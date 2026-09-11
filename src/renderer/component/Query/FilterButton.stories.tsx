import type { Meta, StoryObj } from '@storybook/react';
import { Flex } from 'antd';
import { FilterButton } from './FilterButton';

const meta: Meta<typeof FilterButton> = {
  component: FilterButton,
  args: {
    current: 'id = 1',
    history: [
      'id = 1',
      "status = 'pending'\n  AND created_at > '2026-01-01'",
      'salary > 1000',
    ],
  },
  // the row the table page puts the button on: a bare button in Storybook's
  // own column layout would be stretched to the full width
  decorators: [
    (Story) => (
      <Flex>
        <Story />
      </Flex>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FilterButton>;

/** the filters used before, the current one carrying the pip */
export const WithHistory: Story = {};

/** the filter was cleared: every entry is something to go back to */
export const Cleared: Story = {
  args: {
    current: '',
  },
};

/** nothing else than what is applied: the dropdown is gone */
export const NothingToChoose: Story = {
  args: {
    history: ['id = 1'],
  },
};

export const NoHistory: Story = {
  args: {
    history: [],
  },
};
