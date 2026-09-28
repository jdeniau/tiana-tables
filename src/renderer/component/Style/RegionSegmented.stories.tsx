import type { Meta, StoryObj } from '@storybook/react';
import {
  RegionGroup,
  RegionHeader,
  RegionMeta,
  RegionName,
  RegionTools,
} from './Region';
import { RegionSegmented } from './RegionSegmented';

/** the switch as a region header carries it, after the region's meta */
function Demo({ disabled }: { disabled: boolean }) {
  return (
    <RegionHeader>
      <RegionGroup>
        <RegionName>Result</RegionName>
      </RegionGroup>

      <RegionTools>
        <RegionMeta>12 rows · 4 ms</RegionMeta>
        <RegionSegmented
          defaultValue="data"
          options={[
            { label: 'Data', value: 'data' },
            { label: 'Chart', value: 'chart', disabled },
          ]}
        />
      </RegionTools>
    </RegionHeader>
  );
}

const meta: Meta<typeof Demo> = {
  component: Demo,
  args: { disabled: false },
};

export default meta;
type Story = StoryObj<typeof Demo>;

export const Default: Story = {};

export const WithADisabledSegment: Story = {
  args: { disabled: true },
};
