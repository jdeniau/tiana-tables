import { type JSX, useMemo } from 'react';
import { DatabaseOutlined, TableOutlined } from '@ant-design/icons';
import { useConnectionContext } from '../../../contexts/ConnectionContext';
import { useDatabaseContext } from '../../../contexts/DatabaseContext';
import { useDatabaseListContext } from '../../../contexts/DatabaseListContext';
import { useTableListContext } from '../../../contexts/TableListContext';
import NavigateModal, { NavigationItem } from './NavigateModal';

type Props = {
  isNavigateModalOpen: boolean;
  setIsNavigateModalOpen: (isOpened: boolean) => void;
};

export default function NavigateModalContainer(props: Props): JSX.Element {
  const tableList = useTableListContext();
  const { currentConnectionSlug } = useConnectionContext();
  const { database } = useDatabaseContext();
  const databaseList = useDatabaseListContext();

  const navigationItemList: Array<NavigationItem> = useMemo(
    () => [
      ...tableList.map((table) => ({
        key: `Table-${table}`,
        name: table,
        link: `/connections/${currentConnectionSlug}/${database}/tables/${table}`,
        Icon: TableOutlined,
      })),
      ...databaseList.map((databaseName) => ({
        key: `Database-${databaseName}`,
        name: databaseName,
        link: `/connections/${currentConnectionSlug}/${databaseName}`,
        Icon: DatabaseOutlined,
      })),
    ],
    [currentConnectionSlug, database, databaseList, tableList]
  );

  return <NavigateModal navigationItemList={navigationItemList} {...props} />;
}
