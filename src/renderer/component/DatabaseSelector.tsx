import { useCallback, useEffect, useState } from 'react';
import { Select } from 'antd';
import { RowDataPacket } from 'mysql2';
import invariant from 'tiny-invariant';
import { useConfiguration } from '../../contexts/ConfigurationContext';
import { useConnectionContext } from '../../contexts/ConnectionContext';
import { useDatabaseContext } from '../../contexts/DatabaseContext';

interface DatabaseRow extends RowDataPacket {
  Database: string;
}

export default function DatabaseSelector() {
  const { currentConnectionName } = useConnectionContext();
  const { updateConnectionState, configuration } = useConfiguration();
  const [databaseList, setDatabaseList] = useState<DatabaseRow[]>([]);
  const { database, setDatabase, executeQuery } = useDatabaseContext();

  useEffect(() => {
    executeQuery<DatabaseRow[]>('SHOW DATABASES;').then(([result]) => {
      if (result) {
        invariant(currentConnectionName, 'Connection name is required');

        setDatabaseList(result);

        // TODO : add a helper for appState ?
        const currentDatabase =
          configuration.connections[currentConnectionName]?.appState
            ?.activeDatabase ?? result[0].Database;

        setDatabase(currentDatabase);
      }
    });
  }, [
    configuration.connections,
    currentConnectionName,
    executeQuery,
    setDatabase,
  ]);

  // TODO migrate that into something that does only the side effect ?
  useEffect(() => {
    invariant(currentConnectionName, 'Connection name is required');

    updateConnectionState(
      currentConnectionName,
      'activeDatabase',
      database ?? ''
    );
  }, [currentConnectionName, database, updateConnectionState]);

  const handleChange = useCallback(
    (database: string) => {
      setDatabase(database);
    },
    [setDatabase]
  );

  return (
    <Select
      popupMatchSelectWidth={false}
      onChange={handleChange}
      value={database || undefined}
      fieldNames={{ label: 'Database', value: 'Database' }}
      options={databaseList}
      style={{ width: '100%' }}
    />
  );
}
