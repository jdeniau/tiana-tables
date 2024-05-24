import { ColumnDetail, ColumnDetailResult } from './types';

export class ColumnDetailHelper {
  // Can not use JS #private props because of an issue in storybook with react-docgen ¯\_(ツ)_/¯
  private _columnDetailResult: ColumnDetailResult;

  constructor(columnDetailResult: ColumnDetailResult) {
    this._columnDetailResult = columnDetailResult;
  }

  getAllColumns(): ColumnDetailResult {
    return this._columnDetailResult;
  }

  getColumnsForTable(tablename: string): Array<ColumnDetail> {
    return this._columnDetailResult.filter((c) => c.Table === tablename);
  }
}
