import { ReactElement } from 'react';
import { NavLink } from 'react-router-dom';
import { styled } from 'styled-components';
import { useConnectionContext } from '../../contexts/ConnectionContext';
import { useDatabaseContext } from '../../contexts/DatabaseContext';
import {
  TableStatusRow,
  useTableStatusList,
} from '../hooks/sql/useTableStatusList';
import { getColor } from '../theme';

const StyledNavLink = styled(NavLink)`
  color: ${(props) => getColor(props.theme, 'support.type', 'foreground')};
`;

export default function TableList(): ReactElement | null {
  const { currentConnectionSlug } = useConnectionContext();
  const { database } = useDatabaseContext();
  const tableStatusList = useTableStatusList();

  if (!tableStatusList) {
    return null;
  }

  return (
    <div>
      {tableStatusList.map((rowDataPacket: TableStatusRow) => (
        <div key={rowDataPacket.Name}>
          <StyledNavLink
            to={`/connections/${currentConnectionSlug}/${database}/tables/${rowDataPacket.Name}`}
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
