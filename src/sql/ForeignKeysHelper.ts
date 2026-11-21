import type { ForeignKey } from './dialect/metadata';

/** A foreign key with every one of its columns, in the order the key declares them. */
export interface WholeForeignKey {
  referencedDatabase: string;
  referencedTable: string;
  columns: Array<{ column: string; referencedColumn: string }>;
}

export class ForeignKeysHelper {
  // Can not use JS #private props because of an issue in storybook with react-docgen ¯\_(ツ)_/¯
  private _foreignKeys: Array<ForeignKey>;

  /** the keys to the tables of `database`, which a join can only name bare */
  private _localForeignKeys: Array<ForeignKey>;

  /** `foreignKeys` are the keys of the tables of `database` */
  constructor(foreignKeys: Array<ForeignKey>, database: string) {
    this._foreignKeys = foreignKeys;
    this._localForeignKeys = foreignKeys.filter(
      (r) => r.referencedDatabase === database
    );
  }

  getForeignKey(tableName: string, columnName: string) {
    const row = this._foreignKeys.find(
      (r) => r.table === tableName && r.column === columnName
    );

    if (!row) {
      return null;
    }

    return {
      referencedDatabaseName: row.referencedDatabase,
      referencedTableName: row.referencedTable,
      referencedColumnName: row.referencedColumn,
    };
  }

  /** The first key the column belongs to, whole: a column of two keys gets the one `getForeignKey` answers. */
  getWholeForeignKey(
    tableName: string,
    columnName: string
  ): WholeForeignKey | null {
    return (
      this.getWholeForeignKeys(tableName).find(({ columns }) =>
        columns.some(({ column }) => column === columnName)
      ) ?? null
    );
  }

  /** Every key of the table, whole, in the order they are listed. */
  getWholeForeignKeys(tableName: string): Array<WholeForeignKey> {
    const byConstraint = new Map<string, WholeForeignKey>();

    for (const row of this._foreignKeys) {
      // by table and name: PostgreSQL lets two tables name a key alike
      if (row.table !== tableName) {
        continue;
      }

      const key = byConstraint.get(row.constraintName) ?? {
        referencedDatabase: row.referencedDatabase,
        referencedTable: row.referencedTable,
        columns: [],
      };

      key.columns.push({
        column: row.column,
        referencedColumn: row.referencedColumn,
      });
      byConstraint.set(row.constraintName, key);
    }

    return [...byConstraint.values()];
  }

  getLinkBetweenTables(
    tableName: string,
    tableList: Array<{ tableName: string; alias: string | undefined }>
  ) {
    let foundAlias: string | undefined = undefined;
    let isManyToOne = false;

    const row = this._localForeignKeys.find((r) => {
      // handle many-to-one relationship
      if (r.referencedTable === tableName) {
        const foundTable = tableList.find((t) => t.tableName === r.table);

        if (foundTable) {
          foundAlias = foundTable.alias;
          isManyToOne = true;

          return true;
        }
      }

      // handle one-to-one relationship
      if (r.table === tableName) {
        const foundTable = tableList.find(
          (t) => t.tableName === r.referencedTable
        );

        if (foundTable) {
          foundAlias = foundTable.alias;
          isManyToOne = false;

          return true;
        }
      }
    });

    if (!row) {
      return null;
    }

    return {
      columnName: isManyToOne ? row.column : row.referencedColumn,
      referencedColumnName: isManyToOne ? row.referencedColumn : row.column,
      referencedTableName: isManyToOne ? row.table : row.referencedTable,
      alias: foundAlias,
    };
  }
}
