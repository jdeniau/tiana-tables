import { ReactElement, useMemo } from 'react';
import { Menu, MenuProps } from 'antd';
import { Link, useParams } from 'react-router-dom';
import { styled } from 'styled-components';
import { useConnectionContext } from '../../contexts/ConnectionContext';
import { useDatabaseContext } from '../../contexts/DatabaseContext';
import { useOpenTablesContext } from '../../contexts/OpenTablesContext';
import { useCurrentConnectionTint } from '../hooks/useCurrentConnectionTint';
import { accent, size, space } from '../theme';

type MenuItem = Required<MenuProps>['items'][number];

type Props = {
  tableList: string[];
};

/**
 * The label fills the row (the item's own padding is zero, see the Menu
 * tokens) so that the selected table can carry its 3px rule on the left edge
 * — antd only knows how to draw one on the right.
 *
 * The rule is the colour of the current connection when it has one, the
 * accent otherwise: the same mark the title bar is filled with, so the
 * connection a table belongs to reads from the sidebar too.
 */
const TableLink = styled(Link)<{ $selected: boolean; $rule?: string }>`
  display: block;
  padding: 0 ${space.md};
  line-height: ${size.control};
  border-inline-start: 3px solid
    ${(props) =>
      props.$selected ? (props.$rule ?? accent(props)) : 'transparent'};
  color: inherit;

  &:hover {
    color: inherit;
  }
`;

export default function TableList({ tableList }: Props): ReactElement | null {
  const { currentConnectionSlug } = useConnectionContext();
  const { database } = useDatabaseContext();
  const { memoriseTable } = useOpenTablesContext();
  const { tableName } = useParams();
  const rule = useCurrentConnectionTint()?.background;

  const items: MenuItem[] = useMemo(
    () =>
      tableList?.map((name) => ({
        key: name,
        label: (
          // the second click of a double memorises the table; the first navigated to the same place, so there is nothing to undo
          <TableLink
            $selected={name === tableName}
            $rule={rule}
            to={`/connections/${currentConnectionSlug}/${database}/tables/${name}`}
            onDoubleClick={() => memoriseTable(name)}
          >
            {name}
          </TableLink>
        ),
        title: name,
      })),
    [currentConnectionSlug, database, memoriseTable, rule, tableList, tableName]
  );

  if (!tableList) {
    return null;
  }

  return (
    <Menu items={items} selectedKeys={tableName ? [tableName] : undefined} />
  );
}
