import { type JSX } from 'react';
import { Link } from 'react-router-dom';
import { styled } from 'styled-components';
import { useConnectionContext } from '../../contexts/ConnectionContext';
import { useForeignKeysContext } from '../../contexts/ForeignKeysContext';
import { t } from '../../i18n';
import type { Dialect } from '../../sql/dialect/types';
import { FilterOperator, buildFilterClause } from '../../sql/filterClause';
import { foreground, space, supportForeground } from '../theme';
import { cellValueToSqlLiteral } from './CellContextMenu/cellValueToSqlLiteral';

type Props = {
  /** resolved once per column by the grid: a hook here would run per cell */
  dialect: Dialect;
  tableName: string;
  columnName: string;
  value: any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

const StyledLink = styled(Link)`
  display: inline-flex;
  color: ${supportForeground};
  text-decoration: none;

  svg {
    display: block;
    width: ${space.lg};
    height: ${space.lg};
  }

  &:hover {
    color: ${foreground};
  }
`;

function ForeignKeyLink({
  dialect,
  tableName,
  columnName,
  value,
}: Props): JSX.Element | null {
  const { currentConnectionSlug } = useConnectionContext();

  const foreignKeys = useForeignKeysContext();

  const foreignKey = foreignKeys.getForeignKey(tableName, columnName);

  if (!foreignKey) {
    return null;
  }

  const literal = cellValueToSqlLiteral(dialect, value);

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

  const to = `/connections/${currentConnectionSlug}/${foreignKey.referencedDatabaseName}/tables/${foreignKey.referencedTableName}?where=${encodeURIComponent(where)}`;

  return (
    <StyledLink to={to} aria-label={t('cell.foreignKey.open')}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden
      >
        <path d="M7 17L17 7M9 7h8v8" />
      </svg>
    </StyledLink>
  );
}

export default ForeignKeyLink;
