import * as React from "react";
import { Connection } from "mysql";
import { ConnectionContext } from "../Contexts";

interface TableListProps {
  connection: Connection;
}
function DatabaseSelector({ connection }: TableListProps) {
  const [databaseList, setDatabaseList] = React.useState([]);

  React.useEffect(() => {
    connection.query("SHOW DATABASES;", (_err, result) => {
      setDatabaseList(result);
    });
  }, [connection.threadId]);

  return (
    <select>
      {databaseList.map((row: { Database: string }) => (
        <option key={row.Database}>{row.Database}</option>
      ))}
    </select>
  );
}

export default function DatabaseSelectorWithContext(props: object) {
  const { currentConnection } = React.useContext(ConnectionContext);

  if (!currentConnection) {
    return null;
  }

  return (
    <DatabaseSelector
      key={currentConnection.threadId || undefined}
      connection={currentConnection}
      {...props}
    />
  );
}
