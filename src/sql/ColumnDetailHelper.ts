import { ColumnDetail, ColumnDetailResult } from './types';

type TableName = string;
type ColumnName = string;
type ColumnByTable = Map<TableName, Map<ColumnName, ColumnDetail>>;
export class ColumnDetailHelper {
  // Can not use JS #private props because of an issue in storybook with react-docgen ¯\_(ツ)_/¯
  private _columnDetailResult: ColumnDetailResult;

  private _columnsByTable?: ColumnByTable;

  constructor(columnDetailResult: ColumnDetailResult) {
    this._columnDetailResult = columnDetailResult;
  }

  private initializeColumnsByTableIfNeeded(): ColumnByTable {
    if (this._columnsByTable) {
      return this._columnsByTable;
    }

    this._columnsByTable = new Map();

    for (const columnDetail of this._columnDetailResult) {
      const { Table, Column } = columnDetail;

      if (!this._columnsByTable.has(Table)) {
        this._columnsByTable.set(Table, new Map());
      }

      this._columnsByTable.get(Table)!.set(Column, columnDetail);
    }

    return this._columnsByTable;
  }

  getAllColumns(): ColumnDetailResult {
    return this._columnDetailResult;
  }

  getColumnsForTable(tablename: string): Array<ColumnDetail> {
    const columnsByTable = this.initializeColumnsByTableIfNeeded();

    return Array.from(columnsByTable.get(tablename)?.values() ?? []);
  }

  getColumn(tablename: string, columnName: string): ColumnDetail | undefined {
    const columnsByTable = this.initializeColumnsByTableIfNeeded();

    return columnsByTable.get(tablename)?.get(columnName);
  }
}
