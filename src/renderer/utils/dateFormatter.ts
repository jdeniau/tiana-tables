import { FieldKind } from '../../sql/resultField';

/** The offset PostgreSQL appends to a `timestamptz`: `+05:30`, `-05`, `+00:09:21`. */
const TRAILING_OFFSET = /[+-]\d{2}(?::\d{2}){0,2}$/;

/** A wall clock the server wrote in `from`, shown in `to`. */
export interface ZoneShift {
  from: string;
  to: string;
}

/** A date as the grid shows it, and the offset of the zone it was moved to. */
export interface DateText {
  text: string;
  /** `UTC+01:00`, `null` for a date shown as the server wrote it */
  offset: string | null;
}

/** Whether a column holds dates, which both drivers hand over as the server's text. */
export function isDateKind(kind: FieldKind): boolean {
  return kind === FieldKind.Date || kind === FieldKind.DateTime;
}

/**
 * The server's text of a date as Temporal, or `null` when Temporal refuses it:
 * MySQL's `0000-00-00`, PostgreSQL's `infinity` or `BC` dates.
 */
function parseDate(
  text: string,
  kind: FieldKind
): Temporal.PlainDate | Temporal.PlainDateTime | Temporal.Instant | null {
  try {
    if (kind === FieldKind.Date) {
      return Temporal.PlainDate.from(text);
    }

    // `PlainDateTime.from` would accept the offset and drop it
    return TRAILING_OFFSET.test(text)
      ? Temporal.Instant.from(text)
      : Temporal.PlainDateTime.from(text);
  } catch {
    return null;
  }
}

/** `YYYY-MM-DD HH:mm:ss`, the fraction of a second left out. */
function formatWallClock(dateTime: Temporal.PlainDateTime): string {
  return dateTime.toString({ smallestUnit: 'second' }).replace('T', ' ');
}

/**
 * A date as the grid shows it: `YYYY-MM-DD`, with `HH:mm:ss` when it has a time.
 * Without a shift, a date-time is the server's own wall clock — a `timestamptz` is written in the session's zone.
 */
export function formatDateText(
  text: string,
  kind: FieldKind,
  shift: ZoneShift | null
): DateText {
  const date = parseDate(text, kind);

  if (date === null) {
    return { text, offset: null };
  }

  if (date instanceof Temporal.PlainDate) {
    return { text: date.toString(), offset: null };
  }

  if (shift === null) {
    const wallClock =
      date instanceof Temporal.Instant
        ? Temporal.PlainDateTime.from(text)
        : date;

    return { text: formatWallClock(wallClock), offset: null };
  }

  const zoned =
    date instanceof Temporal.Instant
      ? date.toZonedDateTimeISO(shift.to)
      : date.toZonedDateTime(shift.from).withTimeZone(shift.to);

  return {
    text: formatWallClock(zoned.toPlainDateTime()),
    offset: `UTC${zoned.offset}`,
  };
}

/** A trailing offset as ISO 8601 writes it: PostgreSQL's `-05` is `-05:00`. */
function isoOffset(offset: string): string {
  return /^[+-]\d{2}$/.test(offset) ? `${offset}:00` : offset;
}

/**
 * A date as the grid shows it, followed by the offset of the zone it is shown in: `2025-04-30 06:56:08+02:00`.
 * A wall clock of a server whose zone is unknown has no offset to write; a `DATE` has no time.
 */
export function dateTextToShownIso(
  text: string,
  kind: FieldKind,
  shift: ZoneShift | null,
  serverZone: string | null
): string {
  const date = parseDate(text, kind);

  if (date === null || date instanceof Temporal.PlainDate) {
    return date?.toString() ?? text;
  }

  if (shift !== null) {
    const zoned =
      date instanceof Temporal.Instant
        ? date.toZonedDateTimeISO(shift.to)
        : date.toZonedDateTime(shift.from).withTimeZone(shift.to);

    return `${formatWallClock(zoned.toPlainDateTime())}${zoned.offset}`;
  }

  if (date instanceof Temporal.Instant) {
    const offset = TRAILING_OFFSET.exec(text)?.[0] ?? '';

    return `${formatWallClock(Temporal.PlainDateTime.from(text))}${isoOffset(offset)}`;
  }

  return serverZone === null
    ? formatWallClock(date)
    : `${formatWallClock(date)}${date.toZonedDateTime(serverZone).offset}`;
}

/**
 * A date as a program reads it: ISO 8601, a point in time as an instant in UTC.
 * A wall clock is taken in the server's zone, and stays one when that zone is unknown; a `DATE` has no time.
 */
export function dateTextToIso(
  text: string,
  kind: FieldKind,
  serverZone: string | null
): string {
  const date = parseDate(text, kind);

  if (date === null) {
    return text;
  }

  if (date instanceof Temporal.PlainDateTime && serverZone !== null) {
    return date.toZonedDateTime(serverZone).toInstant().toString();
  }

  return date.toString();
}
