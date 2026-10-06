import { type JSX } from 'react';
import { DatabaseOutlined, TableOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const tableList = useTableListContext();
  const { currentConnectionSlug } = useConnectionContext();
  const { database, setDatabase } = useDatabaseContext();
  const databaseList = useDatabaseListContext();

  const navigationItemList: Array<NavigationItem> = [
    ...tableList.map((table) => ({
      key: `Table-${table}`,
      name: table,
      open: () =>
        navigate(
          `/connections/${currentConnectionSlug}/${database}/tables/${table}`
        ),
      Icon: TableOutlined,
    })),
    ...databaseList.map((databaseName) => ({
      key: `Database-${databaseName}`,
      name: databaseName,
      // the selector's way in: straight to the database's last table
      open: () => setDatabase(databaseName),
      Icon: DatabaseOutlined,
    })),
  ];

  return <NavigateModal navigationItemList={navigationItemList} {...props} />;
}
