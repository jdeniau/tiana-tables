import { useMemo } from 'react';
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
  const tableStatusList = useTableListContext();
  const { currentConnectionSlug } = useConnectionContext();
  const { database } = useDatabaseContext();
  const databaseList = useDatabaseListContext();

  const navigationItemList: Array<NavigationItem> = useMemo(
    () => [
      ...tableStatusList.map((table) => ({
        key: `Table-${table.Name}`,
        name: table.Name,
        link: `/connections/${currentConnectionSlug}/${database}/tables/${table.Name}`,
        Icon: <TableOutlined />,
      })),
      ...databaseList.map((showDatabase) => ({
        key: `Database-${showDatabase.Database}`,
        name: showDatabase.Database,
        link: `/connections/${currentConnectionSlug}/${showDatabase.Database}`,
        Icon: <DatabaseOutlined />,
      })),
    ],
    [currentConnectionSlug, database, databaseList, tableStatusList]
  );

  return <NavigateModal navigationItemList={navigationItemList} {...props} />;
}
