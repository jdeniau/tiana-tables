import { useParams } from 'react-router-dom';
import type { DisplayAfterByColumn } from '../../../configuration/columnOrder';
import { useConnectionContext } from '../../../contexts/ConnectionContext';
import { useDatabaseContext } from '../../../contexts/DatabaseContext';
import { TableLayout } from './TableLayout';

type Props = {
  primaryKeys: Array<string>;
  where?: string;
  filterHistory: Array<string>;
  displayAfterByColumn: DisplayAfterByColumn;
};

function TableLayoutPageContent({
  primaryKeys,
  where,
  filterHistory,
  displayAfterByColumn,
}: Props) {
  const { currentConnectionSlug } = useConnectionContext();
  const { database } = useDatabaseContext();
  const { tableName } = useParams();

  if (!currentConnectionSlug || !database || !tableName) {
    return null;
  }

  return (
    <TableLayout
      key={`${currentConnectionSlug}|${database}|${tableName}`}
      tableName={tableName}
      database={database}
      primaryKeys={primaryKeys}
      where={where}
      filterHistory={filterHistory}
      displayAfterByColumn={displayAfterByColumn}
    />
  );
}

export default TableLayoutPageContent;
