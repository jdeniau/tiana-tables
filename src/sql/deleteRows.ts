import { z } from 'zod';
import type { PrimaryKeyPart } from './updateCell';

/** Rows of one table to delete, each named by its whole primary key. */
export interface DeleteRowsRequest {
  database: string;
  table: string;
  rows: Array<Array<PrimaryKeyPart>>;
}

/** A row nobody named would match the whole table: every row and every key holds at least one part. */
export const deleteRowsRequestSchema: z.ZodType<DeleteRowsRequest> = z.object({
  database: z.string().min(1),
  table: z.string().min(1),
  rows: z
    .array(
      z
        .array(
          z.object({
            column: z.string().min(1),
            value: z.union([z.string(), z.number()]),
          })
        )
        .min(1)
    )
    .min(1),
});
