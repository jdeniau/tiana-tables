import { z } from 'zod';
import type { PrimaryKeyPart } from './updateCell';

/** How many characters of a label the server sends: a `LONGTEXT` would cross IPC whole for one line of a cell. */
export const MAX_LABEL_LENGTH = 100;

/** The rows of one table some foreign keys point at, each read for the value of one of its columns. */
export interface SelectLabelsRequest {
  database: string;
  table: string;
  /** the column whose value names a row */
  labelColumn: string;
  /** each key whole, its parts named in the same order from one key to the next */
  keys: Array<Array<PrimaryKeyPart>>;
}

/** One row a key points at. */
export interface SelectedLabel {
  /** the values of its key, in the order the request names the parts */
  key: Array<unknown>;
  label: unknown;
}

const keyPartSchema = z.object({
  column: z.string().min(1),
  value: z.union([z.string(), z.number()]),
});

/** A key of no part would match the whole table, and the columns read are those of the first key. */
export const selectLabelsRequestSchema: z.ZodType<SelectLabelsRequest> = z
  .object({
    database: z.string().min(1),
    table: z.string().min(1),
    labelColumn: z.string().min(1),
    keys: z.array(z.array(keyPartSchema).min(1)).min(1),
  })
  .refine(({ keys }) => {
    const columns = keys[0].map(({ column }) => column).join('\0');

    return keys.every(
      (key) => key.map(({ column }) => column).join('\0') === columns
    );
  }, 'Every key names the same columns, in the same order');
