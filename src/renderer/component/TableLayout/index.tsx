import { useParams } from 'react-router-dom';
import type { DisplayAfterByColumn } from '../../../configuration/columnOrder';
import type { ColumnWidthByColumn } from '../../../configuration/type';
import { useConnectionContext } from '../../../contexts/ConnectionContext';
import { useDatabaseContext } from '../../../contexts/DatabaseContext';
import { TableLayout } from './TableLayout';

type Props = {
  primaryKeys: Array<string>;
  where?: string;
  filterHistory: Array<string>;
  displayAfterByColumn: DisplayAfterByColumn;
  columnWidths: ColumnWidthByColumn;
};

function TableLayoutPageContent({
  primaryKeys,
  where,
  filterHistory,
  displayAfterByColumn,
  columnWidths,
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
      connectionSlug={currentConnectionSlug}
      tableName={tableName}
      database={database}
      primaryKeys={primaryKeys}
      where={where}
      filterHistory={filterHistory}
      displayAfterByColumn={displayAfterByColumn}
      columnWidths={columnWidths}
    />
  );
}

export default TableLayoutPageContent;
