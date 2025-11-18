import { type JSX, memo } from 'react';
import { Link } from 'react-router-dom';
import { styled } from 'styled-components';
import { useConnectionContext } from '../../contexts/ConnectionContext';
import { useDatabaseContext } from '../../contexts/DatabaseContext';
import { useForeignKeysContext } from '../../contexts/ForeignKeysContext';
import { foreground, supportTypeForeground } from '../theme';

type Props = {
  tableName: string;
  columnName: string;
  value: any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

const StyledLink = styled(Link)`
  color: ${supportTypeForeground};
  text-decoration: none;

  &:hover {
    color: ${foreground};
  }
`;

const ForeignKeyLink = memo(function ForeignKeyLink({
  tableName,
  columnName,
  value,
}: Props): JSX.Element | null {
  const { currentConnectionSlug } = useConnectionContext();
  const { database } = useDatabaseContext();

  const foreignKeys = useForeignKeysContext();

  const foreignKey = foreignKeys.getForeignKey(tableName, columnName);

  if (!foreignKey) {
    return null;
  }

  const to = `/connections/${currentConnectionSlug}/${database}/tables/${foreignKey.referencedTableName}?where=${encodeURIComponent(
    `${foreignKey.referencedColumnName}="${value}"`
  )}`;

  return <StyledLink to={to}>↗️</StyledLink>;
});

export default ForeignKeyLink;
