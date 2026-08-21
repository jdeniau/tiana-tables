import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import { Types } from 'mysql';
import CellDetailModal from './CellDetailModal';
import type { ColumnMeta } from './TableGrid';

function makeColumn(name: string, type: number): ColumnMeta {
  return {
    id: name,
    fieldIndex: 0,
    name,
    tableName: 'items',
    type,
    width: 150,
    pinnedLeft: null,
    isLastPinned: false,
    hasForeignKey: false,
  };
}

const meta: Meta<typeof CellDetailModal> = {
  component: CellDetailModal,
  args: {
    onClose: action('onClose'),
  },
};

export default meta;
type Story = StoryObj<typeof CellDetailModal>;

export const WithLongText: Story = {
  args: {
    detail: {
      column: makeColumn('description', Types.BLOB),
      value: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(
        20
      ),
    },
  },
};

export const WithJson: Story = {
  args: {
    detail: {
      column: makeColumn('payload', Types.JSON),
      value: '{"nested":{"list":[1,2,3],"flag":true},"name":"tiana"}',
    },
  },
};

export const WithNullValue: Story = {
  args: {
    detail: {
      column: makeColumn('payload', Types.JSON),
      value: null,
    },
  },
};
