export enum SQL_CHANNEL {
  EXECUTE_QUERY = 'sql:executeQuery',
  GET_FOREIGN_KEYS = 'sql:getForeignKeys',
  GET_PRIMARY_KEYS = 'sql:getPrimaryKeys',
  SHOW_DATABASES = 'sql:showDatabases',
  SHOW_TABLE_STATUS = 'sql:showTableStatus',
  CLOSE_ALL = 'sql:closeAll',
  ON_CONNECTION_CHANGED = 'sql:onConnectionChanged',
}
