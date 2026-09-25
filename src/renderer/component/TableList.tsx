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
 * tokens) so that the selected table can carry its 3px border on the left edge
 * — antd only knows how to draw one on the right.
 * The border takes the colour of the current connection, the accent without one.
 */
const TableLink = styled(Link)<{
  $selected: boolean;
  $selectedBorderColor?: string;
}>`
  display: block;
  padding: 0 ${space.md};
  line-height: ${size.control};
  border-inline-start: 3px solid
    ${(props) =>
      props.$selected
        ? (props.$selectedBorderColor ?? accent(props))
        : 'transparent'};
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
  const selectedBorderColor = useCurrentConnectionTint()?.background;

  const items: MenuItem[] = useMemo(
    () =>
      tableList?.map((name) => ({
        key: name,
        label: (
          // the second click of a double memorises the table; the first navigated to the same place, so there is nothing to undo
          <TableLink
            $selected={name === tableName}
            $selectedBorderColor={selectedBorderColor}
            to={`/connections/${currentConnectionSlug}/${database}/tables/${name}`}
            onDoubleClick={() => memoriseTable(name)}
          >
            {name}
          </TableLink>
        ),
        title: name,
      })),
    [
      currentConnectionSlug,
      database,
      memoriseTable,
      selectedBorderColor,
      tableList,
      tableName,
    ]
  );

  if (!tableList) {
    return null;
  }

  return (
    <Menu items={items} selectedKeys={tableName ? [tableName] : undefined} />
  );
}
