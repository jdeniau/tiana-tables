import {
  FieldPacket,
  ProcedureCallPacket,
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise';

export type QueryReturnType =
  | ResultSetHeader
  | ResultSetHeader[]
  | RowDataPacket[]
  | RowDataPacket[][]
  | ProcedureCallPacket;

export type QueryResult<T extends QueryReturnType = QueryReturnType> = Promise<
  [T, FieldPacket[]]
>;
