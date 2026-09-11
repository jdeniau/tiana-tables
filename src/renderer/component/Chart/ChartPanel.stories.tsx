import type { Meta, StoryObj } from '@storybook/react';
import { Types } from 'mysql';
import type { FieldPacket, RowDataPacket } from 'mysql2/promise';
import ChartPanel from './ChartPanel';

function makeField(name: string, type: number): FieldPacket {
  return { name, type } as unknown as FieldPacket;
}

const FIELDS = [
  makeField('day', Types.DATE),
  makeField('signups', Types.LONGLONG),
  // DECIMAL comes back as a string with mysql2's default options — the story
  // keeps it that way, so the panel is exercised on the real shape
  makeField('revenue', Types.NEWDECIMAL),
];

// the shape this feature exists for: `SELECT day, COUNT(*), SUM(price)
// FROM … GROUP BY day`, queried with `rowsAsArray`
const ROWS = Array.from({ length: 30 }, (_, index) => [
  new Date(2026, 0, index + 1),
  40 + Math.round(30 * Math.sin(index / 3)),
  (500 + 220 * Math.cos(index / 4)).toFixed(2),
]) as unknown as RowDataPacket[];

const meta: Meta<typeof ChartPanel> = {
  component: ChartPanel,
  decorators: [
    (Story) => (
      <div style={{ height: '80vh' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    result: ROWS,
    fields: FIELDS,
    rowsAsArray: true,
  },
};

export default meta;

type Story = StoryObj<typeof ChartPanel>;

export const Default: Story = {};

export const SingleSeries: Story = {
  args: {
    fields: FIELDS.slice(0, 2),
    result: ROWS.map((row) =>
      (row as unknown as unknown[]).slice(0, 2)
    ) as unknown as RowDataPacket[],
  },
};

/** A categorical X axis rather than a temporal one. */
export const Categorical: Story = {
  args: {
    fields: [makeField('country', Types.VAR_STRING), FIELDS[1]],
    result: [
      ['France', 128],
      ['Belgium', 74],
      ['Canada', 96],
      ['Japan', 51],
    ] as unknown as RowDataPacket[],
  },
};
