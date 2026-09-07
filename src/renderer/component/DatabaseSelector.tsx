import { useCallback } from 'react';
import { DownOutlined } from '@ant-design/icons';
import { Dropdown } from 'antd';
import { styled } from 'styled-components';
import { useDatabaseContext } from '../../contexts/DatabaseContext';
import type { ShowDatabasesResult } from '../../sql/types';
import {
  commentForeground,
  display,
  displayWeight,
  emphasisForeground,
  space,
} from '../theme';

/**
 * The database name heads the sidebar in the display face, and it is the
 * selector: the caret says so, the menu lists the others.
 */
const Trigger = styled.button`
  display: flex;
  align-items: center;
  gap: ${space.sm};
  min-width: 0;
  max-width: 100%;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  font-family: ${display};
  font-weight: ${displayWeight};
  font-size: 14px;
  line-height: 1;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${emphasisForeground};
`;

const Name = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Caret = styled(DownOutlined)`
  flex: none;
  font-size: 10px;
  color: ${commentForeground};
`;

export default function DatabaseSelector({
  databaseList,
}: {
  databaseList: ShowDatabasesResult;
}) {
  const { database, setDatabase } = useDatabaseContext();

  const handleClick = useCallback(
    ({ key }: { key: string }) => {
      setDatabase(key);
    },
    [setDatabase]
  );

  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items: databaseList.map(({ Database }) => ({
          key: Database,
          label: Database,
        })),
        selectable: true,
        selectedKeys: database ? [database] : [],
        onClick: handleClick,
      }}
    >
      <Trigger type="button">
        <Name>{database}</Name>
        <Caret />
      </Trigger>
    </Dropdown>
  );
}
