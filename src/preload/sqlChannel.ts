export enum SQL_CHANNEL {
  EXECUTE_QUERY = 'sql:executeQuery',
  UPDATE_CELL = 'sql:updateCell',
  LIST_DATABASES = 'sql:listDatabases',
  LIST_TABLES = 'sql:listTables',
  GET_FOREIGN_KEYS = 'sql:getForeignKeys',
  GET_ALL_COLUMNS = 'sql:getAllColumns',
  GET_TABLE_STRUCTURE = 'sql:getTableStructure',
  GET_PRIMARY_KEY_COLUMNS = 'sql:getPrimaryKeyColumns',
  CLOSE = 'sql:close',
  CLOSE_ALL = 'sql:closeAll',
  ON_CONNECTION_CHANGED = 'sql:onConnectionChanged',
}
