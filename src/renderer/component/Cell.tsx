import { MouseEvent, ReactNode, memo } from 'react';
import { Types } from 'mysql'; // importing from mysql2 will import the commonjs package and will fail
import { styled } from 'styled-components';
import { constantForeground, foreground, stringForeground } from '../theme';
import { formatDate, formatDateTime } from '../utils/dateFormatter';

interface TableCellFactoryProps {
  type: number | undefined;
  value: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

// The native tooltip is the cheapest way to reveal a truncated cell, but it
// stops being useful past a few hundred characters: the browser truncates long
// titles and an unwrapped wall of text is unreadable anyway. Bigger values
// (JSON, TEXT, blobs) need a real detail view, not a tooltip.
const MAX_TITLE_LENGTH = 300;

/**
 * Set the `title` on hover rather than on render: reading `scrollWidth` forces
 * a reflow, and doing it once per cell at mount time would cost on every
 * scroll tick (see the performance note in TableGrid). Here it happens once,
 * on the single cell under the cursor, before the browser opens its tooltip.
 */
function setTitleIfTruncated(event: MouseEvent<HTMLElement>): void {
  const element = event.currentTarget;

  if (element.scrollWidth <= element.clientWidth) {
    element.removeAttribute('title');
  }
}

/**
 * The shell every cell value renders into: it owns the truncation styling and,
 * with it, the way to read what got truncated. Styled variants below extend it
 * — styled-components folds them, so a cell still renders a single element.
 */
type CellShellType = {
  className?: string;
} & (
  | {
      children: ReactNode;
      hasTitle?: never;
    }
  | {
      children: string | number;
      hasTitle: true;
    }
);

function CellShell({ className, children, hasTitle }: CellShellType) {
  const title =
    hasTitle && String(children).length < MAX_TITLE_LENGTH
      ? String(children)
      : undefined;

  return (
    <div className={className} onMouseEnter={setTitleIfTruncated} title={title}>
      {children}
    </div>
  );
}

const BaseCell = styled(CellShell)`
  min-width: 100px;
  max-width: 300px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  word-break: keep-all;
`;

const NullSpan = styled(BaseCell)`
  color: ${constantForeground};
`;

function NullCell() {
  return <NullSpan>(NULL)</NullSpan>;
}

const ForegroundSpan = styled(BaseCell)`
  color: ${foreground};
`;

function DateCell({ value }: { value: Date }) {
  return <ForegroundSpan>{formatDate(value)}</ForegroundSpan>;
}

function DatetimeCell({ value }: { value: Date }) {
  return <ForegroundSpan>{formatDateTime(value)}</ForegroundSpan>;
}

const StringSpan = styled(BaseCell)`
  color: ${stringForeground};
`;
function StringCell({ value }: { value: string }) {
  return <StringSpan hasTitle>{value}</StringSpan>;
}

const NumberSpan = styled(BaseCell)`
  color: ${constantForeground};
`;
function NumberCell({ value }: { value: number }) {
  return <NumberSpan hasTitle>{value}</NumberSpan>;
}

function BlobCell({ value }: { value: string }) {
  return <ForegroundSpan hasTitle>{value}</ForegroundSpan>;
}

function JsonCell({ value }: { value: string }) {
  return <ForegroundSpan>{value}</ForegroundSpan>;
}

function EnumCell({ value }: { value: string }) {
  return <ForegroundSpan hasTitle>{value}</ForegroundSpan>;
}

const TableCellFactory = memo(function TableCellFactory({
  type,
  value,
}: TableCellFactoryProps) {
  if (value === null || typeof value === 'undefined') {
    return <NullCell />;
  }

  switch (type) {
    // Dates
    case Types.DATETIME: // aka DATETIME
    case Types.DATETIME2: // aka DATETIME with fractional seconds
    case Types.TIMESTAMP: // aka TIMESTAMP
    case Types.TIMESTAMP2: // aka TIMESTAMP with fractional seconds
    case Types.NEWDATE: // aka ?
      return <DatetimeCell value={value} />;

    case Types.DATE: // aka DATE
      return <DateCell value={value} />;

    // Numbers
    case Types.TINY: // aka TINYINT, 1 byte
    case Types.SHORT: // aka SMALLINT, 2 bytes
    case Types.LONG: // aka INT, 4 bytes
    case Types.INT24: // aka MEDIUMINT, 3 bytes
    case Types.FLOAT: // aka FLOAT, 4-8 bytes
    case Types.DOUBLE: // aka DOUBLE, 8 bytes
    case Types.DECIMAL: // aka DECIMAL (http://dev.mysql.com/doc/refman/5.0/en/precision-math-decimal-changes.html)
    case Types.NEWDECIMAL: // aka DECIMAL
    case Types.LONGLONG: // aka BIGINT, 8 bytes
      return <NumberCell value={value} />;

    // Strings
    case Types.VARCHAR: // aka VARCHAR (?)
    case Types.VAR_STRING: // aka VARCHAR, VARBINARY
    case Types.STRING: // aka CHAR, BINARY
      return <StringCell value={value} />;

    // Blobs
    case Types.TINY_BLOB: // aka TINYBLOB, TINYTEXT
    case Types.MEDIUM_BLOB: // aka MEDIUMBLOB, MEDIUMTEXT
    case Types.LONG_BLOB: // aka LONGBLOG, LONGTEXT
    case Types.BLOB: // aka BLOB, TEXT
      return <BlobCell value={value} />;

    case Types.JSON: // aka JSON
      return <JsonCell value={value} />;

    case Types.ENUM: // aka ENUM
    case Types.SET: // aka SET
      return <EnumCell value={value} />;

    case Types.NULL: // NULL (used for prepared statements, I think)
    case Types.TIME: // aka TIME
    case Types.TIME2: // aka TIME with fractional seconds
    case Types.YEAR: // aka YEAR, 1 byte (don't ask)
    case Types.BIT: // aka BIT, 1-8 byte
    case Types.GEOMETRY: // aka GEOMETRY
    default:
      throw new Error(`Type ${type} is not managed for now`);
  }
});

const TableCellFactoryContainer = memo(
  function TableCellFactoryContainer({
    link,
    ...rest
  }: TableCellFactoryProps & { link?: ReactNode }) {
    return (
      <>
        <TableCellFactory {...rest} />
        {link}
      </>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.type === nextProps.type && prevProps.value === nextProps.value
      // prevProps.link === nextProps.link // omit link from comparison to avoid re-renders
    );
  }
);

export default TableCellFactoryContainer;
