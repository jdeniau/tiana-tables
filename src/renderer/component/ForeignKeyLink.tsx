import { Link } from 'react-router-dom';
import { styled } from 'styled-components';
import { useForeignKeysContext } from '../../contexts/ForeignKeysContext';
import { getColor, getSetting } from '../theme';

type Props = {
  columnName: string;
  value: any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

const StyledLink = styled(Link)`
  color: ${({ theme }) => getColor(theme, 'support.type', 'foreground')};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => getSetting(theme, 'foreground')};
  }
`;

export default function ForeignKeyLink({
  columnName,
  value,
}: Props): JSX.Element | null {
  const foreignKeys = useForeignKeysContext();

  const foreignKey = foreignKeys[columnName];

  if (!foreignKey) {
    return null;
  }

  const to = `/connections/dev/ticketing/tables/${foreignKey.referencedTableName}?where=${encodeURIComponent(
    `${foreignKey.referencedColumnName}=${value}`
  )}`;

  return <StyledLink to={to}>↗️</StyledLink>;
}
