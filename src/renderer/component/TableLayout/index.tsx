import { useParams } from 'react-router-dom';
import { useConnectionContext } from '../../../contexts/ConnectionContext';
import { useDatabaseContext } from '../../../contexts/DatabaseContext';
import { KeyColumnUsageRow } from '../../../sql/types';
import { TableLayout } from './TableLayout';

type Props = {
  primaryKeys: Array<string>;
  foreignKeys: KeyColumnUsageRow[];
  where?: string;
};

function TableLayoutPageContent({ primaryKeys, foreignKeys, where }: Props) {
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
      foreignKeys={foreignKeys}
      where={where}
    />
  );
}

export default TableLayoutPageContent;
