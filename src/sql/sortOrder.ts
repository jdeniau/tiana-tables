/** The value is the keyword, the same in both engines. */
export enum SortDirection {
  Asc = 'ASC',
  Desc = 'DESC',
}

/** Rows ordered by a single column. */
export interface SortOrder {
  column: string;
  direction: SortDirection;
}
