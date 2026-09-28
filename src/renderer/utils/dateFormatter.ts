import { FieldKind } from '../../sql/resultField';

/** The offset PostgreSQL appends to a `timestamptz`: `+05:30`, `-05`, `+00:09:21`. */
const TRAILING_OFFSET = /[+-]\d{2}(?::\d{2}){0,2}$/;

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

/**
 * A date as the grid shows it: `YYYY-MM-DD`, with `HH:mm:ss` when it has a time.
 * A `timestamptz` shows in the machine's zone, the fraction of a second is left out.
 */
export function formatDateText(text: string, kind: FieldKind): string {
  const date = parseDate(text, kind);

  if (date === null) {
    return text;
  }

  if (date instanceof Temporal.PlainDate) {
    return date.toString();
  }

  const dateTime =
    date instanceof Temporal.Instant
      ? date.toZonedDateTimeISO(Temporal.Now.timeZoneId()).toPlainDateTime()
      : date;

  return dateTime.toString({ smallestUnit: 'second' }).replace('T', ' ');
}

/**
 * A date as a program reads it: ISO 8601, a point in time as an instant,
 * a wall clock taken in the machine's zone. A `DATE` has no time, hence no offset.
 */
export function dateTextToIso(text: string, kind: FieldKind): string {
  const date = parseDate(text, kind);

  if (date === null) {
    return text;
  }

  if (date instanceof Temporal.PlainDateTime) {
    return date
      .toZonedDateTime(Temporal.Now.timeZoneId())
      .toInstant()
      .toString();
  }

  return date.toString();
}
