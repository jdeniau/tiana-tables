import { Connection } from 'mysql2/promise';
import { ipcRenderer } from 'electron';
import type {
  QueryResult,
  QueryReturnType,
  ConnectionObject,
} from '../sql/types';

interface Sql {
  openConnection(params: ConnectionObject): Promise<Connection>;
  executeQuery<T extends QueryReturnType>(query: string): QueryResult<T>;
  closeAllConnections(): Promise<void>;
}

// TODO : clone the binder object in sql/index.ts ?
export const sql: Sql = {
  openConnection: (params) => ipcRenderer.invoke('sql:connect', params),
  executeQuery: (query) => ipcRenderer.invoke('sql:executeQuery', query),
  closeAllConnections: () => ipcRenderer.invoke('sql:closeAll'),
};
