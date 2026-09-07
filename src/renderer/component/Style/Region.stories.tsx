import type { Meta, StoryObj } from '@storybook/react';
import { Splitter } from 'antd';
import { styled } from 'styled-components';
import { size, space } from '../../theme';
import { ActionButton } from './ActionButton';
import {
  Region,
  RegionBody,
  RegionGroup,
  RegionHeader,
  RegionMeta,
  RegionName,
} from './Region';

const meta: Meta<typeof Region> = {
  component: Region,
  parameters: { layout: 'fullscreen' },
  // the workspace the regions fill
  decorators: [
    (Story) => (
      <div style={{ height: '90vh' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Region>;

/** a body's worth of lines, standing in for the editor or the grid */
const Lines = styled.pre`
  margin: 0;
  padding: 0 ${space.md};
  font-size: 13px;
  line-height: ${size.line};
`;

const QUERY = `SELECT sc.contract_id, count(s.id) as nb_seats
  FROM seat s
  JOIN seat_config sc ON sc.id = s.seat_config_id
GROUP BY sc.contract_id;`;

const ROWS = Array.from(
  { length: 40 },
  (_, i) => `${String(i * 7 + 13).padStart(6)}  ${i * 391 + 125}`
).join('\n');

export const Query: Story = {
  render: () => (
    <Region>
      <RegionHeader>
        <RegionGroup>
          <RegionName>Query</RegionName>
          <RegionMeta>3 statements</RegionMeta>
        </RegionGroup>
        <ActionButton>Run</ActionButton>
      </RegionHeader>
      <RegionBody>
        <Lines>{QUERY}</Lines>
      </RegionBody>
    </Region>
  ),
};

/** Two regions in the SQL page's Splitter: its bar is the rule between them. */
export const Stacked: Story = {
  render: () => (
    <Splitter orientation="vertical" style={{ height: '100%' }}>
      <Splitter.Panel defaultSize="40%">
        <Region>
          <RegionHeader>
            <RegionGroup>
              <RegionName>Query</RegionName>
              <RegionMeta>1 statement</RegionMeta>
            </RegionGroup>
            <ActionButton>Run</ActionButton>
          </RegionHeader>
          <RegionBody>
            <Lines>SELECT * FROM tax t</Lines>
          </RegionBody>
        </Region>
      </Splitter.Panel>
      <Splitter.Panel>
        <Region>
          <RegionHeader>
            <RegionName>Result</RegionName>
            <RegionMeta>40 rows · 42 ms</RegionMeta>
          </RegionHeader>
          <RegionBody>
            <Lines>{ROWS}</Lines>
          </RegionBody>
        </Region>
      </Splitter.Panel>
    </Splitter>
  ),
};
