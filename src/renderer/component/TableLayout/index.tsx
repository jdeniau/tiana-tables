import { useParams } from 'react-router-dom';
import { useConnectionContext } from '../../../contexts/ConnectionContext';
import { useDatabaseContext } from '../../../contexts/DatabaseContext';
import { TableLayout } from './TableLayout';

type Props = { primaryKeys: Array<string> };

function TableLayoutPageContent({ primaryKeys }: Props) {
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
    />
  );
}

export default TableLayoutPageContent;
