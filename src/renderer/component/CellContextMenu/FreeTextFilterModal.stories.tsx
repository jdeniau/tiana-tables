import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import { FilterOperator } from '../../../sql/filterClause';
import FreeTextFilterModal from './FreeTextFilterModal';

const meta: Meta<typeof FreeTextFilterModal> = {
  component: FreeTextFilterModal,
  args: {
    onCancel: () => {
      action('onCancel')();
    },
    onSubmit: (text) => {
      action('onSubmit')(text);
    },
  },
};

export default meta;
type Story = StoryObj<typeof FreeTextFilterModal>;

// the fixed part of the clause sits in the input's `prefix`, so what the field
// reads while typing is exactly what will be sent
export const Default: Story = {
  args: {
    pending: { columnName: 'name', operator: FilterOperator.Like },
  },
};

export const NumericComparison: Story = {
  args: {
    pending: { columnName: 'price', operator: FilterOperator.GreaterThanOrEqual },
  },
};

// a name the prefix has to quote, and one long enough to compete with the field
export const AwkwardColumnName: Story = {
  args: {
    pending: {
      columnName: 'we`ird.column with spaces',
      operator: FilterOperator.NotEquals,
    },
  },
};

export const Closed: Story = {
  args: {
    pending: null,
  },
};
