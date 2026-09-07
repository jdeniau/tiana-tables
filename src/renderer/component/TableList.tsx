import { ReactElement, useMemo } from 'react';
import { Menu, MenuProps } from 'antd';
import { Link, useParams } from 'react-router-dom';
import { styled } from 'styled-components';
import { useConnectionContext } from '../../contexts/ConnectionContext';
import { useDatabaseContext } from '../../contexts/DatabaseContext';
import { ShowTableStatus } from '../../sql/types';
import { accent, size, space } from '../theme';

type MenuItem = Required<MenuProps>['items'][number];

type Props = {
  tableStatusList: ShowTableStatus[];
};

/**
 * The label fills the row (the item's own padding is zero, see the Menu
 * tokens) so that the selected table can carry its 3px accent rule on the
 * left edge — antd only knows how to draw one on the right.
 */
const TableLink = styled(Link)<{ $selected: boolean }>`
  display: block;
  padding: 0 ${space.md};
  line-height: ${size.control};
  border-inline-start: 3px solid
    ${(props) => (props.$selected ? accent(props) : 'transparent')};
  color: inherit;

  &:hover {
    color: inherit;
  }
`;

export default function TableList({
  tableStatusList,
}: Props): ReactElement | null {
  const { currentConnectionSlug } = useConnectionContext();
  const { database } = useDatabaseContext();
  const { tableName } = useParams();

  const items: MenuItem[] = useMemo(
    () =>
      tableStatusList?.map((rowDataPacket: ShowTableStatus) => ({
        key: rowDataPacket.Name,
        label: (
          <TableLink
            $selected={rowDataPacket.Name === tableName}
            to={`/connections/${currentConnectionSlug}/${database}/tables/${rowDataPacket.Name}`}
          >
            {rowDataPacket.Name}
          </TableLink>
        ),
        title: rowDataPacket.Name,
      })),
    [currentConnectionSlug, database, tableStatusList, tableName]
  );

  if (!tableStatusList) {
    return null;
  }

  return (
    <Menu items={items} selectedKeys={tableName ? [tableName] : undefined} />
  );
}
