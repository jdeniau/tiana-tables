import { type JSX, memo } from 'react';
import { Link } from 'react-router-dom';
import { styled } from 'styled-components';
import { useConnectionContext } from '../../contexts/ConnectionContext';
import { useDatabaseContext } from '../../contexts/DatabaseContext';
import { useForeignKeysContext } from '../../contexts/ForeignKeysContext';
import type { Dialect } from '../../sql/dialect/types';
import { FilterOperator, buildFilterClause } from '../../sql/filterClause';
import { foreground, supportForeground } from '../theme';
import { cellValueToSqlLiteral } from './CellContextMenu/cellValueToSqlLiteral';

type Props = {
  /** resolved once per column by the grid: a hook here would run per cell */
  dialect: Dialect;
  tableName: string;
  columnName: string;
  /** the wire type of the column, which decides the form of the literal */
  fieldType: number | undefined;
  value: any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

const StyledLink = styled(Link)`
  color: ${supportForeground};
  text-decoration: none;

  &:hover {
    color: ${foreground};
  }
`;

const ForeignKeyLink = memo(function ForeignKeyLink({
  dialect,
  tableName,
  columnName,
  fieldType,
  value,
}: Props): JSX.Element | null {
  const { currentConnectionSlug } = useConnectionContext();
  const { database } = useDatabaseContext();

  const foreignKeys = useForeignKeysContext();

  const foreignKey = foreignKeys.getForeignKey(tableName, columnName);

  if (!foreignKey) {
    return null;
  }

  const literal = cellValueToSqlLiteral(dialect, value, fieldType);

  // a key with no literal to compare to points at no row: NULL, or bytes the
  // grid only ever shows decoded
  if (literal === undefined) {
    return null;
  }

  const where = buildFilterClause(
    dialect,
    foreignKey.referencedColumnName,
    FilterOperator.Equals,
    literal
  );

  const to = `/connections/${currentConnectionSlug}/${database}/tables/${foreignKey.referencedTableName}?where=${encodeURIComponent(where)}`;

  return <StyledLink to={to}>↗️</StyledLink>;
});

export default ForeignKeyLink;
