import type { Meta, StoryObj } from '@storybook/react';
import { Button, Flex } from 'antd';
import { styled } from 'styled-components';
import { constantForeground, selection, size, space } from '../../theme';
import {
  Region,
  RegionBody,
  RegionHeader,
  RegionMeta,
  RegionName,
} from './Region';

const meta: Meta<typeof Region> = {
  component: Region,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof Region>;

/** the split the SQL page's `Splitter` will own: 40 % to the first region */
const Workspace = styled.div<{ $height: number }>`
  display: flex;
  flex-direction: column;
  height: ${({ $height }) => $height}px;

  > :first-child {
    flex: 0 0 40%;
  }

  > :last-child {
    flex: 1;
  }
`;

const Lines = styled.pre`
  margin: 0;
  padding: 0 ${space.md};
  font-size: 13px;
  line-height: ${size.line};
`;

const Row = styled.div<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  height: ${size.row};
  padding: 0 ${space.md};
  font-size: 13px;
  color: ${constantForeground};
  background: ${({ $selected, ...props }) =>
    $selected ? selection(props) : 'transparent'};
`;

const rows = Array.from({ length: 40 }, (_, i) => [i * 7 + 13, i * 391 + 125]);

export const Query: Story = {
  render: () => (
    <Workspace $height={240}>
      <Region>
        <RegionHeader>
          <Flex align="baseline" gap={space.sm}>
            <RegionName>Query</RegionName>
            <RegionMeta>3 statements</RegionMeta>
          </Flex>
          <Button color="primary" variant="solid">
            Run
          </Button>
        </RegionHeader>
        <RegionBody>
          <Lines>
            {
              'SELECT sc.contract_id, count(s.id) as nb_seats\n  FROM seat s\n  JOIN seat_config sc ON sc.id = s.seat_config_id\nGROUP BY sc.contract_id;'
            }
          </Lines>
        </RegionBody>
      </Region>
    </Workspace>
  ),
};

/** Two regions share nothing but the rule between them. */
export const Stacked: Story = {
  render: () => (
    <Workspace $height={480}>
      <Region>
        <RegionHeader>
          <Flex align="baseline" gap={space.sm}>
            <RegionName>Query</RegionName>
            <RegionMeta>1 statement</RegionMeta>
          </Flex>
          <Button color="primary" variant="solid">
            Run
          </Button>
        </RegionHeader>
        <RegionBody>
          <Lines>{'SELECT * FROM tax t'}</Lines>
        </RegionBody>
      </Region>
      <Region>
        <RegionHeader>
          <Flex align="baseline" gap={space.sm}>
            <RegionName>Result</RegionName>
          </Flex>
          <RegionMeta>40 rows · 42 ms</RegionMeta>
        </RegionHeader>
        <RegionBody>
          {rows.map(([id, count], i) => (
            <Row key={id} $selected={i === 3}>
              {id}
              {' '.repeat(8 - String(id).length)}
              {count}
            </Row>
          ))}
        </RegionBody>
      </Region>
    </Workspace>
  ),
};
