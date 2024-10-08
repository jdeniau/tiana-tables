import { DatabaseOutlined, TableOutlined } from '@ant-design/icons';
import { useConnectionContext } from '../../../contexts/ConnectionContext';
import { useDatabaseContext } from '../../../contexts/DatabaseContext';
import { useTableListContext } from '../../../contexts/TableListContext';
import { ShowDatabasesResult } from '../../../sql/types';
import NavigateModal, { NavigationItem } from './NavigateModal';

type Props = {
  isNavigateModalOpen: boolean;
  setIsNavigateModalOpen: (isOpened: boolean) => void;
  databaseList: ShowDatabasesResult;
};

export default function NavigateModalContainer({
  databaseList,
  ...rest
}: Props): JSX.Element {
  const tableStatusList = useTableListContext();
  const { currentConnectionSlug } = useConnectionContext();
  const { database } = useDatabaseContext();

  const navigationItemList: Array<NavigationItem> = [
    ...tableStatusList.map((table) => ({
      key: table.Name,
      name: table.Name,
      link: `/connections/${currentConnectionSlug}/${database}/tables/${table.Name}`,
      Icon: <TableOutlined />,
    })),
    ...databaseList.map((showDatabase) => ({
      key: showDatabase.Database,
      name: showDatabase.Database,
      link: `/connections/${currentConnectionSlug}/${showDatabase.Database}`,
      Icon: <DatabaseOutlined />,
    })),
  ];

  return <NavigateModal navigationItemList={navigationItemList} {...rest} />;
}
