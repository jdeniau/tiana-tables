/** The clauses a `SELECT` is cut into, each one a block the history counts. */
export enum Clause {
  Select = 'select',
  From = 'from',
  Join = 'join',
  Where = 'where',
  GroupBy = 'group-by',
  Having = 'having',
  OrderBy = 'order-by',
  Limit = 'limit',
}

/** A clause of a recorded `SELECT`. */
export type RecordedBlock = {
  clause: Clause;
  /** the clause as written, its keyword included */
  sql: string;
  /** what tells it apart in the history: its values as `?`, its aliases as their table */
  shape: string;
  /** the tables of the statement, sorted, when the clause names a column without its table: none otherwise */
  tables: Array<string>;
};

/** A statement that ran, as the history records it. */
export type RecordedStatement = {
  /** the statement as written, without its trailing `;` */
  sql: string;
  /** what tells it apart in the history: its values as `?`, its aliases as their table */
  shape: string;
  /** the tables of a `SELECT`, indexed by their alias, or by their name when they have none */
  aliases: Record<string, string>;
  /** a `SELECT` cut into its clauses, none for any other statement */
  blocks: Array<RecordedBlock>;
};
