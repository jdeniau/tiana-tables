import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import type { ColumnDetail } from '../../../sql/dialect/metadata';
import { mysqlDialect } from '../../../sql/dialect/mysql';
import { FieldKind } from '../../../sql/resultField';
import {
  ConflictReason,
  type PrimaryKeyPart,
  type UpdateCellOutcome,
  UpdateCellStatus,
} from '../../../sql/updateCell';
import { CellWriteProvider, type SaveCell } from '../CellWrite';
import type { ColumnMeta } from '../TableGrid';
import CellDetailModal from './CellDetailModal';
import type { CellDetail } from './types';

function makeColumnDetail(
  name: string,
  overrides: Partial<ColumnDetail> = {}
): ColumnDetail {
  return {
    table: 'items',
    name,
    nullable: true,
    generated: false,
    binary: false,
    json: false,
    allowedValues: [],
    multiValued: false,
    ...overrides,
  };
}

function makeColumn(
  name: string,
  kind: FieldKind,
  detail: ColumnDetail | undefined
): ColumnMeta {
  return {
    id: name,
    fieldIndex: 0,
    name,
    tableName: 'items',
    kind,
    width: '150px',
    pinnedLeft: null,
    isLastPinned: false,
    numeric: kind === FieldKind.Number,
    hasForeignKey: false,
    dialect: mysqlDialect,
    detail,
  };
}

const PRIMARY_KEY: Array<PrimaryKeyPart> = [{ column: 'id', value: 1 }];

function makeDetail(
  column: ColumnMeta,
  value: unknown,
  rowKey: Array<PrimaryKeyPart> | null = PRIMARY_KEY
): CellDetail {
  return { column, value, rowKey, rowIndex: 0 };
}

/** A save that succeeds, echoing back what a server would have stored. */
const saveSucceeds: SaveCell = async ({
  newValue,
}): Promise<UpdateCellOutcome> => {
  action('save')(newValue);

  return { status: UpdateCellStatus.Updated, value: newValue };
};

const meta: Meta<typeof CellDetailModal> = {
  component: CellDetailModal,
  args: {
    onClose: action('onClose'),
  },
  // what the server answers a write with: `parameters.save`, a success by default
  decorators: [
    (Story, { parameters }) => (
      <CellWriteProvider
        save={(parameters.save as SaveCell | undefined) ?? saveSucceeds}
        onValueUpdated={action('onValueUpdated')}
      >
        <Story />
      </CellWriteProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CellDetailModal>;

export const LongText: Story = {
  args: {
    detail: makeDetail(
      makeColumn(
        'description',
        FieldKind.Text,
        makeColumnDetail('description')
      ),
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(20)
    ),
  },
};

export const Json: Story = {
  args: {
    detail: makeDetail(
      makeColumn(
        'payload',
        FieldKind.Json,
        makeColumnDetail('payload', { json: true })
      ),
      '{"nested":{"list":[1,2,3],"flag":true},"name":"tiana"}'
    ),
  },
};

export const Enum: Story = {
  args: {
    detail: makeDetail(
      makeColumn(
        'status',
        FieldKind.Text,
        makeColumnDetail('status', {
          allowedValues: ['draft', 'sent', 'paid'],
        })
      ),
      'sent'
    ),
  },
};

export const Datetime: Story = {
  args: {
    detail: makeDetail(
      makeColumn(
        'createdAt',
        FieldKind.DateTime,
        makeColumnDetail('createdAt', {
          nullable: false,
        })
      ),
      new Date(2026, 0, 15, 10, 30, 0)
    ),
  },
};

export const Number: Story = {
  args: {
    detail: makeDetail(
      makeColumn(
        'price',
        FieldKind.Number,
        makeColumnDetail('price', {
          nullable: false,
        })
      ),
      '1234.56'
    ),
  },
};

export const NullValue: Story = {
  args: {
    detail: makeDetail(
      makeColumn(
        'payload',
        FieldKind.Json,
        makeColumnDetail('payload', { json: true })
      ),
      null
    ),
  },
};

// the row of a raw query result: nothing identifies it, so nothing can be written
export const ReadOnlyWithoutPrimaryKey: Story = {
  args: {
    detail: makeDetail(
      makeColumn('name', FieldKind.String, makeColumnDetail('name')),
      'read me',
      null
    ),
  },
};

export const ReadOnlyBinaryColumn: Story = {
  args: {
    detail: makeDetail(
      makeColumn(
        'thumbnail',
        FieldKind.Text,
        makeColumnDetail('thumbnail', { binary: true })
      ),
      '\u0000\u0001binary bytes'
    ),
  },
};

export const ReadOnlyGeneratedColumn: Story = {
  args: {
    detail: makeDetail(
      makeColumn(
        'fullName',
        FieldKind.String,
        makeColumnDetail('fullName', { generated: true })
      ),
      'Tiana Tables'
    ),
  },
};

// type something, then save: the cell was written by someone else in between,
// so this modal closes and the conflict modal opens on it
export const ConflictOnSave: Story = {
  args: {
    detail: makeDetail(
      makeColumn('name', FieldKind.String, makeColumnDetail('name')),
      'the value I loaded'
    ),
  },
  parameters: {
    save: (async ({ newValue, force }) => {
      action('save')(newValue, { force });

      return force
        ? { status: UpdateCellStatus.Updated, value: newValue }
        : {
            status: UpdateCellStatus.Conflict,
            reason: ConflictReason.Changed,
            currentValue: 'what someone else wrote',
          };
    }) satisfies SaveCell,
  },
};

export const RowDeletedOnSave: Story = {
  args: {
    detail: makeDetail(
      makeColumn('name', FieldKind.String, makeColumnDetail('name')),
      'the value I loaded'
    ),
  },
  parameters: {
    save: (async ({ newValue }) => {
      action('save')(newValue);

      return {
        status: UpdateCellStatus.Conflict,
        reason: ConflictReason.Deleted,
      };
    }) satisfies SaveCell,
  },
};
