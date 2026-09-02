import type { Meta, StoryObj } from '@storybook/react';
import { Flex } from 'antd';
import { RunQueryButton } from './RunQueryButton';

const meta: Meta<typeof RunQueryButton> = {
  component: RunQueryButton,
  args: {
    disabled: false,
    statementCount: 3,
  },
  // the row the SQL page puts the button on: a bare button in Storybook's own
  // column layout would be stretched to the full width
  decorators: [
    (Story) => (
      <Flex>
        <Story />
      </Flex>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof RunQueryButton>;

/** several statements: the dropdown offers the other ways to run them */
export const SeveralStatements: Story = {};

/** a single statement leaves nothing to choose, so the dropdown is gone */
export const OneStatement: Story = {
  args: {
    statementCount: 1,
  },
};

export const Running: Story = {
  args: {
    disabled: true,
  },
};
