import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import invariant from 'tiny-invariant';
import { useConfiguration } from '../../../contexts/ConfigurationContext';
import { useConnectionContext } from '../../../contexts/ConnectionContext';
import { useDatabaseContext } from '../../../contexts/DatabaseContext';
import { TableLayout } from './TableLayout';

type Props = { primaryKeys: Array<string> };

function TableLayoutPageContent({ primaryKeys }: Props) {
  const { currentConnectionName } = useConnectionContext();
  const { database } = useDatabaseContext();
  const { tableName } = useParams();
  const { updateConnectionState } = useConfiguration();

  useEffect(() => {
    invariant(currentConnectionName, 'Connection name is required');
    invariant(tableName, 'Table name is required');

    updateConnectionState(currentConnectionName, 'openedTable', tableName);
  }, [currentConnectionName, tableName, updateConnectionState]);

  if (!currentConnectionName || !database || !tableName) {
    return null;
  }

  return (
    <TableLayout
      key={`${currentConnectionName}|${database}|${tableName}`}
      tableName={tableName}
      database={database}
      primaryKeys={primaryKeys}
    />
  );
}

export default TableLayoutPageContent;
