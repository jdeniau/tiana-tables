import { Types } from 'mysql';
import { fontScale, space } from '../theme';

/** what a column gets when the type does not say how wide its values are */
export const DEFAULT_COLUMN_WIDTH = 150;

/** the advance of a character of the `mono` stack, measured in the app */
const CHAR_WIDTH = 0.6 * fontScale.base;

/** the padding of a cell, plus a gutter so the value is not flush */
const CELL_MARGINS = 2 * parseInt(space.md, 10) + parseInt(space.sm, 10);

/** `YYYY-MM-DD`, what `formatDate` writes */
const DATE_COLUMN_WIDTH = 10 * CHAR_WIDTH + CELL_MARGINS;

/** `YYYY-MM-DD HH:mm:ss`, what `formatDateTime` writes */
const DATETIME_COLUMN_WIDTH = 19 * CHAR_WIDTH + CELL_MARGINS;

/** the width a column opens at. The cases mirror `Cell.tsx` */
export function getColumnWidth(type: number | undefined): number {
  switch (type) {
    case Types.DATETIME:
    case Types.DATETIME2:
    case Types.TIMESTAMP:
    case Types.TIMESTAMP2:
    case Types.NEWDATE:
      return DATETIME_COLUMN_WIDTH;

    case Types.DATE:
      return DATE_COLUMN_WIDTH;

    default:
      return DEFAULT_COLUMN_WIDTH;
  }
}
