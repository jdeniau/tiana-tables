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

/**
 * Represet a connection object that is stored in the configuration file.
 * It is also used to connect to the database.
 */
export type ConnectionObject = {
  name: string;
  slug: string;
  host: string;
  port: number;
  user: string;
  password: string;
};

export type ConnectionObjectWithoutSlug = Omit<ConnectionObject, 'slug'>;

/**
 * Represent the return type of "SHOW DATABASES;" query.
 */
interface ShowDatabaseRow extends RowDataPacket {
  Database: string;
}
export type ShowDatabasesResult = ShowDatabaseRow[];

export interface ShowTableStatus extends RowDataPacket {
  Name: string;
  Rows: number;
  Data_length: number;
  Comment: string;
  // And more, but not useful for now
}

export type ShowTableStatusResult = ShowTableStatus[];

export interface KeyColumnUsageRow extends RowDataPacket {
  TABLE_NAME: string;
  COLUMN_NAME: string;
  CONSTRAINT_NAME: string;
  REFERENCED_TABLE_NAME: string | null;
  REFERENCED_COLUMN_NAME: string | null;
}

export interface ForeignKeyRow extends KeyColumnUsageRow {
  REFERENCED_TABLE_NAME: string;
  REFERENCED_COLUMN_NAME: string;
}

export interface ShowKeyRow extends RowDataPacket {
  Column_name: string;
}
