import { ComponentProps, useEffect, useState } from 'react';
import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import { useCreateAtom } from '@tanstack/react-store';
import type { SortingState } from '@tanstack/react-table';
import reactRouterDecorator from '../../../.storybook/decorators/reactRouterDecorator';
import { AllColumnsContextProvider } from '../../contexts/AllColumnsContext';
import { ConnectionContext } from '../../contexts/ConnectionContext';
import { DatabaseContext } from '../../contexts/DatabaseContext';
import { ForeignKeysContextProvider } from '../../contexts/ForeignKeysContext';
import type { ColumnDetail } from '../../sql/dialect/metadata';
import { FieldKind, type ResultField } from '../../sql/resultField';
import type { ResultRow } from '../../sql/types';
import { type UpdateCellRequest, UpdateCellStatus } from '../../sql/updateCell';
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

function makeField(name: string, kind: FieldKind): ResultField {
  return { name, kind, table: 'items' };
}

function makeFields(columnCount: number): ResultField[] {
  const fields = [
    makeField('id', FieldKind.Number),
    makeField('name', FieldKind.String),
    makeField('linkedId', FieldKind.Number),
    makeField('price', FieldKind.Number),
    makeField('createdAt', FieldKind.DateTime),
    makeField('payload', FieldKind.Json),
    makeField('description', FieldKind.String),
    makeField('quantity', FieldKind.Number),
  ];

  for (let i = fields.length; i < columnCount; i++) {
    fields.push(makeField(`extra_${i}`, FieldKind.String));
  }

  return fields.slice(0, columnCount);
}

function makeRows(rowCount: number, columnCount: number): ResultRow[] {
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

    return row as ResultRow;
  });
}

// the schema the grid reads to know what a cell may become: without it every
// cell is read-only, which is exactly what the raw-SQL case looks like
const ALL_COLUMNS: ColumnDetail[] = (
  [
    ['id', false],
    ['name', false],
    ['linkedId', true],
    ['price', true],
    ['createdAt', false],
    ['payload', true],
    ['description', true],
    ['quantity', true],
  ] as const
).map(([name, nullable]) => ({
  table: 'items',
  name,
  nullable,
  generated: false,
  binary: false,
  json: name === 'payload',
  allowedValues: [],
  multiValued: false,
}));

/**
 * The real clipboard goes through the main process, which Storybook has none
 * of: this one holds what "Copy value" wrote, and the filter reads it back.
 */
function stubClipboard(initialText: string): void {
  let text = initialText;

  window.clipboard = {
    readText: async () => text,
    writeText: async (written) => {
      action('clipboard.writeText')(written);
      text = written;
    },
  };
}

const meta: Meta<typeof TableGrid> = {
  component: TableGrid,
  decorators: [
    reactRouterDecorator,
    (Story) => {
      // every grid has a context menu, and its first entry copies
      stubClipboard('');

      return <Story />;
    },
    (Story) => (
      <ConnectionContext.Provider
        value={{
          currentConnectionSlug: 'test',
          connectionSlugList: ['test'],
          addConnectionToList: async (connectionName) => {
            action('addConnectionToList')(connectionName);
          },
          closeConnection: (connectionName) => {
            action('closeConnection')(connectionName);
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
            foreignKeys={[
              {
                table: 'items',
                column: 'linkedId',
                referencedTable: 'linkedTable',
                referencedColumn: 'id',
              },
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

function SortableGrid(args: ComponentProps<typeof TableGrid<ResultRow>>) {
  const sortingAtom = useCreateAtom<SortingState>([{ id: 'id', desc: false }]);

  useEffect(() => {
    const sorts = sortingAtom.subscribe(action('sorting'));

    return () => sorts.unsubscribe();
  }, [sortingAtom]);

  return <TableGrid {...args} sortingAtom={sortingAtom} />;
}

// the rows stay as they are: the order is the server's to apply, the grid only marks it
export const Sortable: Story = {
  args: {
    fields: makeFields(8),
    result: makeRows(100, 8),
    primaryKeys: ['id'],
  },
  render: (args) => <SortableGrid {...args} />,
};

// `onFilterChange` is what adds the filter to the secondary click: right-click
// a cell to get the filter menu. Try a number, a string, a date and a NULL
// `payload` — each offers a different literal, and NULL offers none but
// `IS (NOT) NULL`.
export const WithFilterContextMenu: Story = {
  decorators: [
    (Story) => {
      stubClipboard('lorem-2');

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
  fields: ResultField[],
  { column, newValue }: UpdateCellRequest
): unknown {
  if (newValue === null) {
    return null;
  }

  switch (fields.find((field) => field.name === column)?.kind) {
    case FieldKind.DateTime:
      return new Date(newValue);
    case FieldKind.Json:
      return JSON.parse(newValue);
    case FieldKind.Number:
      return Number(newValue);
    default:
      return newValue;
  }
}

/**
 * A grid whose writes land: `window.sql.updateCell` answers as the server
 * would, and the rows are held here as `TableLayout` holds them, so that the
 * written cell shows its new value — and the flash that marks the write.
 * Double-click a cell, change it, save; or right-click a nullable one and set
 * it to NULL.
 */
function EditableGrid(props: ComponentProps<typeof TableGrid>) {
  const { fields, result } = props;
  const [rows, setRows] = useState(result);

  useEffect(() => {
    window.sql = {
      ...window.sql,
      updateCell: async (request) => ({
        status: UpdateCellStatus.Updated,
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
