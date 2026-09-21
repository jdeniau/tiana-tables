import { MouseEvent, ReactNode, memo } from 'react';
import { styled } from 'styled-components';
import { FieldKind } from '../../sql/resultField';
import { constantForeground, foreground, stringForeground } from '../theme';
import { formatDate, formatDateTime } from '../utils/dateFormatter';

interface TableCellFactoryProps {
  kind: FieldKind;
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

interface CellProps<T> {
  value: T;
}

const NullSpan = styled(BaseCell)`
  color: ${constantForeground};
`;

function NullCell() {
  return <NullSpan>(NULL)</NullSpan>;
}

const ForegroundSpan = styled(BaseCell)`
  color: ${foreground};
`;

function DateCell({ value }: CellProps<Date>) {
  return <ForegroundSpan>{formatDate(value)}</ForegroundSpan>;
}

function DatetimeCell({ value }: CellProps<Date>) {
  return <ForegroundSpan>{formatDateTime(value)}</ForegroundSpan>;
}

const StringSpan = styled(BaseCell)`
  color: ${stringForeground};
`;
function StringCell({ value }: CellProps<string>) {
  return <StringSpan hasTitle>{value}</StringSpan>;
}

const NumberSpan = styled(BaseCell)`
  color: ${constantForeground};
`;
function NumberCell({ value }: CellProps<number>) {
  return <NumberSpan hasTitle>{value}</NumberSpan>;
}

function TextCell({ value }: CellProps<string>) {
  return <ForegroundSpan hasTitle>{value}</ForegroundSpan>;
}

/**
 * mysql2 parses JSON columns into plain values (`jsonStrings` is off), so a
 * MySQL `JSON` column arrives here already parsed — an object or an array,
 * which React refuses to render ("Objects are not valid as a React child").
 * It is serialized back to a compact one-liner; the indented form belongs to
 * the detail modal (see `cellValueToText`), and the grid body is too hot for
 * anything more (see the performance note in TableGrid).
 *
 * A `string` here is a JSON *scalar*: `CAST('"foo"' AS JSON)` parses to
 * `'foo'`, and re-serializing it would show the quotes. JSON stored in a text
 * column never reaches this branch — it is announced as TEXT/BLOB and routed
 * to `TextCell`. Neither does anything on MariaDB, where `JSON` is only an
 * alias for `LONGTEXT`: the server never announces a JSON column, so this
 * component is MySQL-only.
 */
function JsonCell({ value }: CellProps<unknown>) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);

  // The cell clips at `max-width` and the tooltip at `MAX_TITLE_LENGTH`, so
  // injecting a multi-kilobyte payload into the DOM buys nothing readable.
  // Only the modal shows the whole value, hence the visible ellipsis here.
  return (
    <ForegroundSpan hasTitle>
      {text.length > MAX_TITLE_LENGTH
        ? `${text.slice(0, MAX_TITLE_LENGTH)}\u2026`
        : text}
    </ForegroundSpan>
  );
}

const TableCellFactory = memo(function TableCellFactory({
  kind,
  value,
}: TableCellFactoryProps) {
  if (value === null || value === undefined) {
    return <NullCell />;
  }

  switch (kind) {
    case FieldKind.Number:
      return <NumberCell value={value} />;

    case FieldKind.DateTime:
      return <DatetimeCell value={value} />;

    case FieldKind.Date:
      return <DateCell value={value} />;

    case FieldKind.String:
      return <StringCell value={value} />;

    case FieldKind.Text:
      return <TextCell value={value} />;

    case FieldKind.Json:
      return <JsonCell value={value} />;

    case FieldKind.Time:
    case FieldKind.Boolean:
    case FieldKind.Binary:
    case FieldKind.Array:
    case FieldKind.Unknown:
    default:
      throw new Error(`Type ${kind} is not managed for now`);
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
      prevProps.kind === nextProps.kind && prevProps.value === nextProps.value
      // prevProps.link === nextProps.link // omit link from comparison to avoid re-renders
    );
  }
);

export default TableCellFactoryContainer;
