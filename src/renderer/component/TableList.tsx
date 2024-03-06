import { ReactElement, useEffect, useState } from 'react';
import { RowDataPacket } from 'mysql2';
import { NavLink } from 'react-router-dom';
import { styled } from 'styled-components';
import { useConnectionContext } from '../../contexts/ConnectionContext';
import { useDatabaseContext } from '../../contexts/DatabaseContext';
import { getColor } from '../theme';

const StyledNavLink = styled(NavLink)`
  color: ${(props) => getColor(props.theme, 'support.type', 'foreground')};
`;

interface TableStatusRow extends RowDataPacket {
  Name: string;
}

export default function TableList(): ReactElement | null {
  const { currentConnectionName } = useConnectionContext();
  const { executeQuery, database } = useDatabaseContext();
  const [tableStatusList, setTableStatusList] = useState<
    TableStatusRow[] | null
  >(null);

  useEffect(() => {
    if (!currentConnectionName || !database) {
      return;
    }

    executeQuery<TableStatusRow[]>(
      `SHOW TABLE STATUS FROM \`${database}\`;`
    ).then(([result]) => {
      setTableStatusList(result);
    });
  }, [currentConnectionName, database, executeQuery]);

  if (!tableStatusList) {
    return null;
  }

  return (
    <div>
      {tableStatusList.map((rowDataPacket: TableStatusRow) => (
        <div key={rowDataPacket.Name}>
          <StyledNavLink
            to={`/connections/${currentConnectionName}/${database}/tables/${rowDataPacket.Name}`}
            style={({ isActive }: { isActive: boolean }) => ({
              fontWeight: isActive ? 'bold' : undefined,
            })}
          >
            {rowDataPacket.Name}
          </StyledNavLink>
        </div>
      ))}
    </div>
  );
}
