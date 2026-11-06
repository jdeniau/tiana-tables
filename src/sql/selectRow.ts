import { z } from 'zod';
import type { ResultField } from './resultField';
import type { ResultRow } from './types';
import type { PrimaryKeyPart } from './updateCell';

/** The row of one table that a key points at: a foreign key's referenced columns, each with its value. */
export interface SelectRowRequest {
  database: string;
  table: string;
  key: Array<PrimaryKeyPart>;
}

/** The row a key points at, `null` when no row holds it. */
export interface SelectedRow {
  fields: Array<ResultField>;
  row: ResultRow | null;
}

/** A key with no part would match the whole table. */
export const selectRowRequestSchema: z.ZodType<SelectRowRequest> = z.object({
  database: z.string().min(1),
  table: z.string().min(1),
  key: z
    .array(
      z.object({
        column: z.string().min(1),
        value: z.union([z.string(), z.number()]),
      })
    )
    .min(1),
});
