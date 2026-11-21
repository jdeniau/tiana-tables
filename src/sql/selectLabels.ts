import { z } from 'zod';

/** How many characters of a label the server sends: a `LONGTEXT` would cross IPC whole for one line of a cell. */
export const MAX_LABEL_LENGTH = 100;

/** The rows of one table some foreign keys point at, each read for the value of one of its columns. */
export interface SelectLabelsRequest {
  database: string;
  table: string;
  /** the column the foreign keys point at */
  keyColumn: string;
  /** the column whose value names a row */
  labelColumn: string;
  /** the values of `keyColumn` looked up */
  keys: Array<string | number>;
}

/** One row a key points at. */
export interface SelectedLabel {
  key: unknown;
  label: unknown;
}

export const selectLabelsRequestSchema: z.ZodType<SelectLabelsRequest> =
  z.object({
    database: z.string().min(1),
    table: z.string().min(1),
    keyColumn: z.string().min(1),
    labelColumn: z.string().min(1),
    keys: z.array(z.union([z.string(), z.number()])).min(1),
  });
