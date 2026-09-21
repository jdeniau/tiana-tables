import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import { ConnectionContext } from '../../contexts/ConnectionContext';
import { DatabaseContext } from '../../contexts/DatabaseContext';
import { FieldKind } from '../../sql/resultField';
import Cell from './Cell';

const meta: Meta<typeof Cell> = {
  component: Cell,
  decorators: [
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

              return Promise.resolve([
                [{ Name: 'foo' }, { Name: 'bar' }, { Name: 'baz' }],
              ]);
            },
          }}
        >
          <Story />
        </DatabaseContext.Provider>
      </ConnectionContext.Provider>
    ),
  ],
  parameters: {
    controls: { exclude: ['type'] },
  },
};

export default meta;
type Story = StoryObj<typeof Cell>;

/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/api/csf
 * to learn how to use render functions.
 */
export const WithNULLValue: Story = {
  args: {
    kind: FieldKind.String,
    value: null,
  },
  argTypes: {
    value: { control: { type: undefined } },
  },
};

export const WithStringType: Story = {
  args: {
    kind: FieldKind.String,
    value: 'VARCHAR value',
  },
};

export const WithLongStringType: Story = {
  args: {
    kind: FieldKind.String,
    value:
      'This is a very long string that should be truncated to fit the cell width.',
  },
};

export const WithTooLongStringType: Story = {
  args: {
    kind: FieldKind.String,
    value:
      'This is a too long string (more than 300 char), without title.' +
      'x'.repeat(300),
  },
};

export const WithNumberType: Story = {
  args: {
    kind: FieldKind.Number,
    value: 123.45,
  },
};

export const WithDateType: Story = {
  args: {
    kind: FieldKind.Date,
    value: new Date('2020-01-01T12:00:00'),
  },
};

export const WithDatetimeType: Story = {
  args: {
    kind: FieldKind.DateTime,
    value: new Date('2020-01-01T12:00:00'),
  },
};

export const WithTextType: Story = {
  args: {
    kind: FieldKind.Text,
    value: 'TEXT value',
  },
};

// What a real JSON column looks like: mysql2 parses it before it reaches the
// renderer, so the value is an object, never its serialized form.
export const WithJSONType: Story = {
  args: {
    kind: FieldKind.Json,
    value: { backgroundColor: 'red', tags: ['a', 'b'], nested: { count: 2 } },
  },
};

// The only string that reaches a JSON cell is a JSON scalar: mysql2 parses
// `CAST('"foo"' AS JSON)` into `foo`, which is rendered without its quotes.
// (JSON stored in a TEXT column is announced as text and rendered as such.)
export const WithJSONScalar: Story = {
  args: {
    kind: FieldKind.Json,
    value: 'a scalar string, not an object',
  },
};

export const WithENUMType: Story = {
  args: {
    kind: FieldKind.Text,
    value: 'ENUM value',
  },
};

// A `BLOB`, a `VARBINARY` or a `BIT`: bytes, with no encoding to read them by,
// shown as the hexadecimal literal a server accepts back.
export const WithBinaryType: Story = {
  args: {
    kind: FieldKind.Binary,
    value: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
};

// Past 150 bytes the literal is cut: the cell clips long before, and each byte
// costs two characters.
export const WithLongBinaryType: Story = {
  args: {
    kind: FieldKind.Binary,
    value: new Uint8Array(1000).map((_, index) => index % 256),
  },
};

// `TIME` is answered as `HH:MM:SS` and not as a Date — a duration has no day to
// sit on. It used to throw, and the throw blanked the whole grid.
export const WithTimeType: Story = {
  args: {
    kind: FieldKind.Time,
    value: '123:45:56',
  },
};

// A `GEOMETRY` column, answered as a plain object: no kind describes it, and
// the shape of the value is what gets it rendered.
export const WithUnknownType: Story = {
  args: {
    kind: FieldKind.Unknown,
    value: { x: 1, y: 2 },
  },
};

export const WithForeignKey: Story = {
  args: {
    kind: FieldKind.Number,
    value: 8,
    link: <a href="#link">LINK</a>,
  },
};
