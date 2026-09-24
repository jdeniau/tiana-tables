import type { Meta, StoryObj } from '@storybook/react';
import connectionDecorator from '../../../.storybook/decorators/connectionDecorator';
import reactRouterDecorator from '../../../.storybook/decorators/reactRouterDecorator';
import { ForeignKeysContextProvider } from '../../contexts/ForeignKeysContext';
import { getDialect } from '../../sql/dialect';
import { DatabaseEngine } from '../../sql/engine';
import { FieldKind } from '../../sql/resultField';
import ForeignKeyLink from './ForeignKeyLink';

const meta: Meta<typeof ForeignKeyLink> = {
  component: ForeignKeyLink,
  decorators: [
    reactRouterDecorator,
    connectionDecorator,
    (Story) => (
      <ForeignKeysContextProvider
        foreignKeys={[
          {
            table: 'table',
            column: 'linkedId',
            referencedTable: 'linkedTable',
            referencedColumn: 'id',
          },
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
    dialect: getDialect(DatabaseEngine.MySQL),
    tableName: 'table',
    columnName: 'linkedId',
    fieldKind: FieldKind.Number,
    value: 1,
  },
};
