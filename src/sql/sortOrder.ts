/** TanStack's values (`getIsSorted()`); the SQL keyword is their upper case, in both engines. */
export enum SortDirection {
  Asc = 'asc',
  Desc = 'desc',
}

/** Rows ordered by a single column. */
export interface SortOrder {
  column: string;
  direction: SortDirection;
}
