import { ReactElement } from 'react';
import { Menu, MenuProps } from 'antd';
import { Link, useParams } from 'react-router-dom';
import { useConnectionContext } from '../../contexts/ConnectionContext';
import { useDatabaseContext } from '../../contexts/DatabaseContext';
import { ShowTableStatusResult } from '../../sql/types';
import { TableStatusRow } from '../hooks/sql/useTableStatusList';

type MenuItem = Required<MenuProps>['items'][number];

type Props = {
  tableStatusList: ShowTableStatusResult;
};

export default function TableList({
  tableStatusList,
}: Props): ReactElement | null {
  const { currentConnectionSlug } = useConnectionContext();
  const { database } = useDatabaseContext();
  const { tableName } = useParams();

  if (!tableStatusList) {
    return null;
  }

  const items: MenuItem[] = tableStatusList.map(
    (rowDataPacket: TableStatusRow) => ({
      key: rowDataPacket.Name,
      label: (
        <Link
          to={`/connections/${currentConnectionSlug}/${database}/tables/${rowDataPacket.Name}`}
        >
          {rowDataPacket.Name}
        </Link>
      ),
      title: rowDataPacket.Name,
    })
  );

  return (
    <Menu items={items} selectedKeys={tableName ? [tableName] : undefined} />
  );
}
