import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { RegionGroup, RegionMeta, RegionName } from './Region';
import { Strip, StripItem } from './Strip';

const STATEMENTS = [
  'SELECT sc.contract_id, count(s.id) as nb_seats FROM seat s',
  'SELECT * FROM tax t',
  "UPDATE contract SET status = 'closed' WHERE id = 12",
  'DELETE FROM coupon WHERE expired_at < NOW()',
];

function Demo({ count, width }: { count: number; width: number }) {
  const [active, setActive] = useState(0);

  return (
    <RegionGroup style={{ width, padding: 8 }}>
      <RegionName>Result</RegionName>
      <Strip>
        {STATEMENTS.slice(0, count).map((sql, index) => (
          <StripItem
            key={sql}
            active={index === active}
            failed={index === 3}
            title={sql}
            onClick={() => setActive(index)}
          >
            {sql}
          </StripItem>
        ))}
      </Strip>
      <RegionMeta>14 rows · 42 ms</RegionMeta>
    </RegionGroup>
  );
}

const meta: Meta<typeof Demo> = {
  component: Demo,
  args: { count: 3, width: 720 },
};

export default meta;
type Story = StoryObj<typeof Demo>;

export const ThreeStatements: Story = {};

/** every item shrinks alike: three ellipses, never a bare separator */
export const Narrow: Story = {
  args: { count: 4, width: 420 },
};
