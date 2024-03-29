import type { Meta, StoryObj } from '@storybook/react';
import reactRouterDecorator from '../../../.storybook/decorators/reactRouterDecorator';
import { ForeignKeysContextProvider } from '../../contexts/ForeignKeysContext';
import ForeignKeyLink from './ForeignKeyLink';

const meta: Meta<typeof ForeignKeyLink> = {
  component: ForeignKeyLink,
  decorators: [
    reactRouterDecorator,
    (Story) => (
      <ForeignKeysContextProvider
        foreignKeys={{
          linkedId: {
            referencedTableName: 'linkedTable',
            referencedColumnName: 'id',
          },
        }}
      >
        <Story />
      </ForeignKeysContextProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ForeignKeyLink>;

/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/api/csf
 * to learn how to use render functions.
 */
export const Primary: Story = {
  args: {
    columnName: 'linkedId',
    value: 1,
  },
};
