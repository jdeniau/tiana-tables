/**
 * The two spellings of a date, and the way between them.
 *
 * A MySQL `DATE`/`DATETIME` is a wall clock: no offset, no instant, nothing to
 * resolve against a time zone. So it is handled as the text it is, and the
 * conversion here is a matter of punctuation — `2026-01-15 10:30:00` on the
 * MySQL side, `2026-01-15T10:30:00` on the side of a native `datetime-local`
 * input. No date library is involved, and none should be: parsing the literal
 * into an instant would attach a time zone that the stored value never had, and
 * writing it back would shift it.
 */

const DATE_PATTERN = /^(\d{4}-\d{2}-\d{2})/;
const TIME_PATTERN = /^(\d{2}:\d{2}(?::\d{2})?)/;

/**
 * The value to give a native date input, or an empty text when the stored
 * value is not one it can hold — `0000-00-00`, which MySQL accepts and no
 * calendar does. An empty input then reads as "nothing to show", and since the
 * edited text is left untouched, saving stays disabled until something is
 * actually picked.
 */
export function toDateInputValue(text: string, withTime: boolean): string {
  const date = DATE_PATTERN.exec(text.trim());

  if (!date || date[1].startsWith('0000')) {
    return '';
  }

  if (!withTime) {
    return date[1];
  }

  // whatever separates them in the literal — a space, or already a `T`
  const time = TIME_PATTERN.exec(text.trim().slice(date[1].length + 1));

  return `${date[1]}T${time ? withSeconds(time[1]) : '00:00:00'}`;
}

/**
 * The MySQL literal for what a native date input gives back.
 *
 * The input drops the seconds when they are zero, so they are put back: a
 * `DATETIME` column takes `YYYY-MM-DD HH:MM:SS`, and letting the shorter form
 * through would have MySQL guess.
 */
export function fromDateInputValue(value: string, withTime: boolean): string {
  if (!withTime) {
    return value;
  }

  const [date, time] = value.split('T');

  return time ? `${date} ${withSeconds(time)}` : `${date} 00:00:00`;
}

function withSeconds(time: string): string {
  return time.length === 5 ? `${time}:00` : time;
}
