import { FieldKind } from '../../sql/resultField';
import { fontScale, space } from '../theme';

/** what a column gets when the type does not say how wide its values are */
export const DEFAULT_COLUMN_WIDTH = 150;

/** the advance of a character of the `mono` stack, measured in the app */
const CHAR_WIDTH = 0.6 * fontScale.base;

/** the padding of a cell, plus a gutter so the value is not flush */
const CELL_MARGINS = 2 * parseInt(space.md, 10) + parseInt(space.sm, 10);

/** `YYYY-MM-DD`, what `formatDateText` writes of a date */
const DATE_COLUMN_WIDTH = 10 * CHAR_WIDTH + CELL_MARGINS;

/** `YYYY-MM-DD HH:mm:ss`, what `formatDateText` writes of a date-time */
const DATETIME_COLUMN_WIDTH = 19 * CHAR_WIDTH + CELL_MARGINS;

/** ` UTC+01:00`, the offset a date-time in local time is followed by, in the smaller size */
const OFFSET_WIDTH = parseInt(space.sm, 10) + 9 * 0.6 * fontScale.sm;

/** the width a column opens at. The cases mirror `Cell.tsx` */
export function getColumnWidth(kind: FieldKind, withOffset = false): number {
  switch (kind) {
    case FieldKind.DateTime:
      return DATETIME_COLUMN_WIDTH + (withOffset ? OFFSET_WIDTH : 0);

    case FieldKind.Date:
      return DATE_COLUMN_WIDTH;

    default:
      return DEFAULT_COLUMN_WIDTH;
  }
}
