import { MouseEvent, ReactNode, memo } from 'react';
import { styled } from 'styled-components';
import { FieldKind } from '../../sql/resultField';
import { constantForeground, foreground, stringForeground } from '../theme';
import { formatDate, formatDateTime } from '../utils/dateFormatter';
import toHexLiteral from './hexLiteral';

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
 * Anything the driver handed over as an object, which React refuses to render
 * ("Objects are not valid as a React child"). A MySQL `JSON` column is the
 * common one — mysql2 parses it, `jsonStrings` being off — and a `GEOMETRY`
 * column the other, answered as `{ x, y }` (measured). It is serialized back
 * to a compact one-liner; the indented form belongs to the detail modal (see
 * `cellValueToText`), and the grid body is too hot for anything more (see the
 * performance note in TableGrid).
 *
 * A `string` here is a JSON *scalar*: `CAST('"foo"' AS JSON)` parses to
 * `'foo'`, and re-serializing it would show the quotes. JSON stored in a text
 * column never reaches this branch — it is announced as TEXT/BLOB and routed
 * to `TextCell`, and on MariaDB, where `JSON` is only an alias for `LONGTEXT`,
 * so is a real JSON column.
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

/**
 * How many bytes of a byte column are worth turning into text: the cell clips
 * at `max-width` long before that, and each byte costs two characters.
 */
const MAX_BINARY_PREVIEW_BYTES = 150;

const BinarySpan = styled(BaseCell)`
  color: ${constantForeground};
`;

function BinaryCell({ value }: CellProps<Uint8Array>) {
  return (
    <BinarySpan hasTitle>
      {toHexLiteral(value, MAX_BINARY_PREVIEW_BYTES)}
    </BinarySpan>
  );
}

/**
 * What to draw in a cell, decided in three tiers: what the value *is*, then
 * what its column is *for*, then a last resort that always renders something.
 *
 * The order is not a preference, it is a necessity. A kind cannot separate a
 * `TEXT` column from a `BLOB` — MySQL announces one type for both, and only
 * the collation, which the driver already read, tells them apart on a declared
 * column. It says nothing at all about a `CAST` or a function result. So the
 * shape of the value is asked first, where it is the only thing that knows.
 *
 * The kind then says what a primitive is for, and what is left falls through
 * to text. A cell renders something whatever arrives: blanking the grid on a
 * type nobody thought of is the one outcome worth ruling out.
 */
const TableCellFactory = memo(function TableCellFactory({
  kind,
  value,
}: TableCellFactoryProps) {
  if (value === null || value === undefined) {
    return <NullCell />;
  }

  // a `Buffer` crosses the bridge as the `Uint8Array` it extends
  if (value instanceof Uint8Array) {
    return <BinaryCell value={value} />;
  }

  if (value instanceof Date) {
    // the value already settled that it is a date; the kind only picks a format
    return kind === FieldKind.Date ? (
      <DateCell value={value} />
    ) : (
      <DatetimeCell value={value} />
    );
  }

  if (typeof value === 'object') {
    return <JsonCell value={value} />;
  }

  switch (kind) {
    case FieldKind.Number:
      return <NumberCell value={value} />;

    case FieldKind.String:
      return <StringCell value={value} />;

    case FieldKind.Json:
      return <JsonCell value={value} />;

    // `Text` and everything the app has no rendering of: a `TIME` reads
    // `HH:MM:SS`, a boolean `true`, and an unknown type whatever it answered
    default:
      return <TextCell value={String(value)} />;
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
