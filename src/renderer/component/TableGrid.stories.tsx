import { ComponentProps, useEffect, useState } from 'react';
import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import { Types } from 'mysql';
import type { FieldPacket, RowDataPacket } from 'mysql2/promise';
import reactRouterDecorator from '../../../.storybook/decorators/reactRouterDecorator';
import { AllColumnsContextProvider } from '../../contexts/AllColumnsContext';
import { ConnectionContext } from '../../contexts/ConnectionContext';
import { DatabaseContext } from '../../contexts/DatabaseContext';
import { ForeignKeysContextProvider } from '../../contexts/ForeignKeysContext';
import { ColumnDetail, KeyColumnUsageRow } from '../../sql/types';
import type { UpdateCellRequest } from '../../sql/updateCell';
import {
  Region,
  RegionBody,
  RegionFoot,
  RegionGroup,
  RegionHeader,
  RegionMeta,
  RegionName,
} from './Style/Region';
import TableGrid from './TableGrid';

// deterministic pseudo-random generator so stories are stable across renders
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WORDS = [
  'lorem',
  'ipsum',
  'dolor',
  'sit',
  'amet',
  'consectetur',
  'adipiscing',
  'elit',
];

function makeField(name: string, type: number): FieldPacket {
  return { name, type, table: 'items' } as unknown as FieldPacket;
}

function makeFields(columnCount: number): FieldPacket[] {
  const fields = [
    makeField('id', Types.LONG),
    makeField('name', Types.VAR_STRING),
    makeField('linkedId', Types.LONG),
    makeField('price', Types.NEWDECIMAL),
    makeField('createdAt', Types.DATETIME),
    makeField('payload', Types.JSON),
    makeField('description', Types.VAR_STRING),
    makeField('quantity', Types.LONG),
  ];

  for (let i = fields.length; i < columnCount; i++) {
    fields.push(makeField(`extra_${i}`, Types.VAR_STRING));
  }

  return fields.slice(0, columnCount);
}

function makeRows(rowCount: number, columnCount: number): RowDataPacket[] {
  const random = mulberry32(42);
  const fields = makeFields(columnCount);

  return Array.from({ length: rowCount }, (_, rowIndex) => {
    const row: Record<string, unknown> = {};

    for (const field of fields) {
      switch (field.name) {
        case 'id':
          row.id = rowIndex + 1;
          break;
        case 'name':
          row.name = `${WORDS[rowIndex % WORDS.length]}-${rowIndex}`;
          break;
        case 'linkedId':
          row.linkedId = Math.floor(random() * 1000);
          break;
        case 'price':
          row.price = Math.round(random() * 10000) / 100;
          break;
        case 'createdAt':
          row.createdAt = new Date(
            Date.UTC(2026, 0, 1) + rowIndex * 60_000 // one minute per row
          );
          break;
        case 'payload':
          // an object, like mysql2 hands JSON columns over
          row.payload = random() > 0.8 ? null : { index: rowIndex };
          break;
        default:
          row[field.name] = WORDS.slice(0, 1 + Math.floor(random() * 7)).join(
            ' '
          );
      }
    }

    return row as RowDataPacket;
  });
}

// the schema the grid reads to know what a cell may become: without it every
// cell is read-only, which is exactly what the raw-SQL case looks like
const ALL_COLUMNS = [
  ['id', 'int', 'int', 'NO', 'auto_increment'],
  ['name', 'varchar', 'varchar(255)', 'NO', ''],
  ['linkedId', 'int', 'int', 'YES', ''],
  ['price', 'decimal', 'decimal(10,2)', 'YES', ''],
  ['createdAt', 'datetime', 'datetime', 'NO', ''],
  ['payload', 'json', 'json', 'YES', ''],
  ['description', 'varchar', 'varchar(255)', 'YES', ''],
  ['quantity', 'int', 'int', 'YES', ''],
].map(
  ([Column, DataType, ColumnType, IsNullable, Extra]) =>
    ({
      Table: 'items',
      Column,
      DataType,
      ColumnType,
      IsNullable,
      ColumnDefault: null,
      Extra,
    }) as ColumnDetail
);

const meta: Meta<typeof TableGrid> = {
  component: TableGrid,
  decorators: [
    reactRouterDecorator,
    (Story) => (
      <ConnectionContext.Provider
        value={{
          currentConnectionSlug: 'test',
          connectionSlugList: ['test'],
          addConnectionToList: async (connectionName) => {
            action('addConnectionToList')(connectionName);
          },
        }}
      >
        <DatabaseContext.Provider
          value={{
            database: 'mocked-db',
            setDatabase: () => {},
            // @ts-expect-error -- we don't need to implement the whole context
            executeQuery: async (query) => {
              action('executeQuery')(query);

              return Promise.resolve([[]]);
            },
          }}
        >
          <ForeignKeysContextProvider
            keyColumnUsageRows={[
              {
                TABLE_NAME: 'items',
                COLUMN_NAME: 'linkedId',
                REFERENCED_TABLE_NAME: 'linkedTable',
                REFERENCED_COLUMN_NAME: 'id',
                CONSTRAINT_NAME: 'fk',
              } as KeyColumnUsageRow,
            ]}
          >
            <AllColumnsContextProvider allColumns={ALL_COLUMNS}>
              <div
                style={{
                  height: '90vh',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Story />
              </div>
            </AllColumnsContextProvider>
          </ForeignKeysContextProvider>
        </DatabaseContext.Provider>
      </ConnectionContext.Provider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TableGrid>;

export const Default: Story = {
  args: {
    fields: makeFields(8),
    result: makeRows(100, 8),
    primaryKeys: ['id'],
  },
};

// 10 000 rows and 30 columns: scrolling must stay smooth
export const ManyRowsAndColumns: Story = {
  args: {
    fields: makeFields(30),
    result: makeRows(10_000, 30),
    primaryKeys: ['id'],
  },
};

// mirrors a reported real-world sluggish case on vertical scroll
export const RealWorldCase: Story = {
  args: {
    fields: makeFields(40),
    result: makeRows(1_000, 40),
    primaryKeys: ['id'],
  },
};

/**
 * The grid in its real host, a `RegionBody` — the decorator of the other
 * stories is a flex column, which is not what the app gives it. Without
 * scrolling first: a horizontal scrollbar at the bottom of the body, column
 * heads that stay put, and a bounded number of `.tg-row` in the DOM.
 */
export const InRegionBody: Story = {
  args: {
    fields: makeFields(30),
    result: makeRows(10_000, 30),
    primaryKeys: ['id'],
  },
  render: (args) => (
    <Region>
      <RegionHeader>
        <RegionGroup>
          <RegionName>items</RegionName>
          <RegionMeta>{args.result?.length ?? 0} rows</RegionMeta>
        </RegionGroup>
      </RegionHeader>

      <RegionBody>
        <TableGrid {...args} />
      </RegionBody>

      <RegionFoot>Load more…</RegionFoot>
    </Region>
  ),
};

export const Empty: Story = {
  args: {
    fields: makeFields(8),
    result: [],
    primaryKeys: ['id'],
  },
};

export const WithoutPrimaryKey: Story = {
  args: {
    fields: makeFields(8),
    result: makeRows(50, 8),
  },
};

// `onFilterChange` is what turns the secondary click on: right-click a cell to
// get the filter menu. Try a number, a string, a date and a NULL `payload` —
// each offers a different literal, and NULL offers none but `IS (NOT) NULL`.
export const WithFilterContextMenu: Story = {
  decorators: [
    (Story) => {
      // the real clipboard is read through the main process, which Storybook
      // has none of
      window.clipboard = { readText: async () => 'lorem-2' };

      return <Story />;
    },
  ],
  args: {
    fields: makeFields(8),
    result: makeRows(100, 8),
    primaryKeys: ['id'],
    onFilterChange: (where) => {
      action('onFilterChange')(where);
    },
  },
};

/**
 * What the server would answer a write with, for the types the story uses:
 * mysql2 hands a `DATETIME` back as a `Date` and a JSON column parsed, not as
 * the text that was sent.
 */
function readBack(
  fields: FieldPacket[],
  { column, newValue }: UpdateCellRequest
): unknown {
  if (newValue === null) {
    return null;
  }

  switch (fields.find((field) => field.name === column)?.type) {
    case Types.DATETIME:
      return new Date(newValue);
    case Types.JSON:
      return JSON.parse(newValue);
    case Types.LONG:
    case Types.NEWDECIMAL:
      return Number(newValue);
    default:
      return newValue;
  }
}

/**
 * A grid whose writes land: `window.sql.updateCell` answers as the server
 * would, and the rows are held here as `TableLayout` holds them, so that the
 * written cell shows its new value — and the flash that marks the write.
 * Double-click a cell, change it, save.
 */
function EditableGrid(props: ComponentProps<typeof TableGrid>) {
  const { fields, result } = props;
  const [rows, setRows] = useState(result);

  useEffect(() => {
    window.sql = {
      ...window.sql,
      updateCell: async (request) => ({
        status: 'updated',
        value: readBack(fields ?? [], request),
      }),
    };
  }, [fields]);

  return (
    <TableGrid
      {...props}
      result={rows}
      onValueUpdated={(rowIndex, columnName, value) => {
        action('onValueUpdated')(rowIndex, columnName, value);
        setRows((previous) => {
          const row = previous?.[rowIndex];

          if (!previous || !row) {
            return previous;
          }

          const next = [...previous];
          next[rowIndex] = { ...row, [columnName]: value };

          return next;
        });
      }}
    />
  );
}

export const Editable: Story = {
  args: {
    fields: makeFields(8),
    result: makeRows(100, 8),
    primaryKeys: ['id'],
  },
  render: (args) => <EditableGrid {...args} />,
};
