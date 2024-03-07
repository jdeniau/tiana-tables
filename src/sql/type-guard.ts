import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { QueryReturnType } from './types';

function isObjectAResultSetHeader(obj: object): boolean {
  // test all keys that are present in ResultSetHeader (except deprecated "changedRows")
  return (
    'fieldCount' in obj &&
    'affectedRows' in obj &&
    'insertId' in obj &&
    'info' in obj &&
    'serverStatus' in obj &&
    'warningStatus' in obj
  );
}

export function isResultSetHeader(
  obj: QueryReturnType
): obj is ResultSetHeader {
  if (typeof obj !== 'object') {
    return false;
  }

  // test "some" keys that are present in ResultSetHeader
  return isObjectAResultSetHeader(obj);
}

export function isResultSetHeaderArray(
  obj: QueryReturnType
): obj is ResultSetHeader[] {
  if (!Array.isArray(obj)) {
    return false;
  }

  const firstItem = obj[0];

  return isObjectAResultSetHeader(firstItem);
}

export function isRowDataPacketArrayOfArray(
  obj: QueryReturnType
): obj is RowDataPacket[] {
  if (!Array.isArray(obj)) {
    return false;
  }

  const firstItem = obj[0];

  return Array.isArray(firstItem);
}

export function isRowDataPacketArray(
  obj: QueryReturnType
): obj is RowDataPacket[] {
  if (!Array.isArray(obj)) {
    return false;
  }

  const firstItem = obj[0];

  if (typeof firstItem !== 'object') {
    return false;
  }

  return !isObjectAResultSetHeader(firstItem);
}

// TODO handle ProcedureCallPacket ?
