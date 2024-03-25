import { ReactElement } from 'react';
import { Menu, MenuProps } from 'antd';
import { NavLink } from 'react-router-dom';
import { useConnectionContext } from '../../contexts/ConnectionContext';
import { useDatabaseContext } from '../../contexts/DatabaseContext';
import {
  TableStatusRow,
  useTableStatusList,
} from '../hooks/sql/useTableStatusList';

type MenuItem = Required<MenuProps>['items'][number];

export default function TableList(): ReactElement | null {
  const { currentConnectionSlug } = useConnectionContext();
  const { database } = useDatabaseContext();
  const tableStatusList = useTableStatusList();

  if (!tableStatusList) {
    return null;
  }

  const items: MenuItem[] = tableStatusList.map(
    (rowDataPacket: TableStatusRow) => ({
      key: rowDataPacket.Name,
      label: (
        <NavLink
          to={`/connections/${currentConnectionSlug}/${database}/tables/${rowDataPacket.Name}`}
        >
          {rowDataPacket.Name}
        </NavLink>
      ),
      title: rowDataPacket.Name,
    })
  );

  return <Menu items={items} />;
}
