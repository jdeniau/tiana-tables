import { ConnectionContext, DatabaseContext } from '../Contexts';
import { ChangeEvent, useContext, useEffect, useState } from 'react';

interface DatabaseRow {
  Database: string;
}

export default function DatabaseSelector() {
  const { currentConnectionName } = useContext(ConnectionContext);

  const [databaseList, setDatabaseList]: [DatabaseRow[], Function] = useState(
    []
  );

  const { database, setDatabase } = useContext(DatabaseContext);

  useEffect(() => {
    console.log('will query database list');
    window.sql.query('SHOW DATABASES;').then(([result]) => {
      if (result) {
        setDatabaseList(result);
        setDatabase(result[0].Database);
      }
    });
  }, [currentConnectionName, setDatabase]);

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setDatabase(event.target.value);
  };

  return (
    <select onChange={handleChange} value={database || undefined}>
      {databaseList.map((row: DatabaseRow) => (
        <option key={row.Database}>{row.Database}</option>
      ))}
    </select>
  );
}
