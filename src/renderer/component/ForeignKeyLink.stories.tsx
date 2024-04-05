import type { Meta, StoryObj } from '@storybook/react';
import reactRouterDecorator from '../../../.storybook/decorators/reactRouterDecorator';
import { ForeignKeysContextProvider } from '../../contexts/ForeignKeysContext';
import { KeyColumnUsageRow } from '../../sql/types';
import ForeignKeyLink from './ForeignKeyLink';

const meta: Meta<typeof ForeignKeyLink> = {
  component: ForeignKeyLink,
  decorators: [
    reactRouterDecorator,
    (Story) => (
      <ForeignKeysContextProvider
        keyColumnUsageRows={[
          {
            TABLE_NAME: 'table',
            COLUMN_NAME: 'linkedId',
            REFERENCED_TABLE_NAME: 'linkedTable',
            REFERENCED_COLUMN_NAME: 'id',
            CONSTRAINT_NAME: 'fk',
          } as KeyColumnUsageRow,
        ]}
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
    tableName: 'table',
    columnName: 'linkedId',
    value: 1,
  },
};
