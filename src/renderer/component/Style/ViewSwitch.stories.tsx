import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { RegionGroup, RegionHeader, RegionMeta, RegionName } from './Region';
import { ViewSwitch, ViewSwitchLink } from './ViewSwitch';

/** the switch as a region header carries it: name and meta on one side, it on the other */
function Demo({ path }: { path: string }) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <RegionHeader style={{ width: 520 }}>
        <RegionGroup>
          <RegionName>article</RegionName>
          <RegionMeta>6 columns</RegionMeta>
        </RegionGroup>

        <ViewSwitch aria-label="Table view">
          {/* `end`, or /structure would fill both segments */}
          <ViewSwitchLink end to="/">
            Data
          </ViewSwitchLink>
          <ViewSwitchLink to="/structure">Structure</ViewSwitchLink>
        </ViewSwitch>
      </RegionHeader>
    </MemoryRouter>
  );
}

const meta: Meta<typeof Demo> = {
  component: Demo,
  args: { path: '/' },
};

export default meta;
type Story = StoryObj<typeof Demo>;

export const OnData: Story = {};

export const OnStructure: Story = {
  args: { path: '/structure' },
};
