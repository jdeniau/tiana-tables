import { ForeignKeyRow, KeyColumnUsageRow } from './types';

export class ForeignKeysHelper {
  // Can not use JS #private props because of an issue in storybook with react-docgen ¯\_(ツ)_/¯
  private _keyColumnUsageRows: KeyColumnUsageRow[];

  constructor(keyColumnUsageRows: KeyColumnUsageRow[]) {
    this._keyColumnUsageRows = keyColumnUsageRows;
  }

  getForeignKey(tableName: string, columnName: string) {
    // the predicate is typed, so what comes back is a key that references
    // something: every other kind of key has both `REFERENCED_` columns NULL
    const row = this._keyColumnUsageRows.find(
      (r): r is ForeignKeyRow =>
        r.TABLE_NAME === tableName &&
        r.COLUMN_NAME === columnName &&
        r.REFERENCED_TABLE_NAME !== null &&
        r.REFERENCED_COLUMN_NAME !== null
    );

    if (!row) {
      return null;
    }

    return {
      referencedTableName: row.REFERENCED_TABLE_NAME,
      referencedColumnName: row.REFERENCED_COLUMN_NAME,
    };
  }

  getLinkBetweenTables(
    tableName: string,
    tableList: Array<{ tableName: string; alias: string | undefined }>
  ) {
    let foundAlias: string | undefined = undefined;
    let isManyToOne = false;

    const row = this._keyColumnUsageRows.find((r) => {
      // handle many-to-one relationship
      if (r.REFERENCED_TABLE_NAME === tableName) {
        const foundTable = tableList.find((t) => t.tableName === r.TABLE_NAME);

        if (foundTable) {
          foundAlias = foundTable.alias;
          isManyToOne = true;

          return true;
        }
      }

      // handle one-to-one relationship
      if (r.TABLE_NAME === tableName && r.REFERENCED_TABLE_NAME) {
        const foundTable = tableList.find(
          (t) => t.tableName === r.REFERENCED_TABLE_NAME
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
      columnName: isManyToOne ? row.COLUMN_NAME : row.REFERENCED_COLUMN_NAME,
      referencedColumnName: isManyToOne
        ? row.REFERENCED_COLUMN_NAME
        : row.COLUMN_NAME,
      referencedTableName: isManyToOne
        ? row.TABLE_NAME
        : row.REFERENCED_TABLE_NAME,
      alias: foundAlias,
    };
  }
}
