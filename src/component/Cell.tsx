import * as React from 'react';
import { Types } from 'mysql';
import styled from 'styled-components';
import { getColor } from '../theme';

interface TableCellFactoryProps {
  type: Types;
  value: any;
}

const NullSpan = styled.span`
  color: ${props => getColor(props.theme, 'constant.language', 'foreground')};
`;

function NullCell() {
  return <NullSpan>(NULL)</NullSpan>;
}

function DatetimeCell({ value }: { value: Date }) {
  return <>{value.toISOString()}</>;
}

const StringSpan = styled.span`
  color: ${props => getColor(props.theme, 'string', 'foreground')};
`;
function StringCell({ value }: { value: string }) {
  return <StringSpan>{value}</StringSpan>;
}

const NumberSpan = styled.span`
  color: ${props => getColor(props.theme, 'constant.numeric', 'foreground')};
`;
function NumberCell({ value }: { value: number }) {
  return <NumberSpan>{value}</NumberSpan>;
}

function BlobCell({ value }: { value: string }) {
  return <>{value}</>;
}

function JsonCell({ value }: { value: string }) {
  return <>{value}</>;
}

function EnumCell({ value }: { value: string }) {
  return <>{value}</>;
}

function TableCellFactory({ type, value }: TableCellFactoryProps) {
  if (value === null || typeof value === 'undefined') {
    return <NullCell />;
  }

  switch (type) {
    // Dates
    case Types.DATETIME: // aka DATETIME
    case Types.DATETIME2: // aka DATETIME with fractional seconds
    case Types.TIMESTAMP: // aka TIMESTAMP
    case Types.TIMESTAMP2: // aka TIMESTAMP with fractional seconds
    case Types.DATE: // aka DATE
    case Types.NEWDATE: // aka ?
      return <DatetimeCell value={value} />;

    // Numbers
    case Types.TINY: // aka TINYINT, 1 byte
    case Types.SHORT: // aka SMALLINT, 2 bytes
    case Types.LONG: // aka INT, 4 bytes
    case Types.INT24: // aka MEDIUMINT, 3 bytes
    case Types.FLOAT: // aka FLOAT, 4-8 bytes
    case Types.DOUBLE: // aka DOUBLE, 8 bytes
    case Types.DECIMAL: // aka DECIMAL (http://dev.mysql.com/doc/refman/5.0/en/precision-math-decimal-changes.html)
    case Types.NEWDECIMAL: // aka DECIMAL
    case Types.LONGLONG: // aka BIGINT, 8 bytes
      return <NumberCell value={value} />;

    // Strings
    case Types.VARCHAR: // aka VARCHAR (?)
    case Types.VAR_STRING: // aka VARCHAR, VARBINARY
    case Types.STRING: // aka CHAR, BINARY
      return <StringCell value={value} />;

    // Blobs
    case Types.TINY_BLOB: // aka TINYBLOB, TINYTEXT
    case Types.MEDIUM_BLOB: // aka MEDIUMBLOB, MEDIUMTEXT
    case Types.LONG_BLOB: // aka LONGBLOG, LONGTEXT
    case Types.BLOB: // aka BLOB, TEXT
      return <BlobCell value={value} />;

    case Types.JSON: // aka JSON
      return <JsonCell value={value} />;

    case Types.ENUM: // aka ENUM
    case Types.SET: // aka SET
      return <EnumCell value={value} />;

    case Types.NULL: // NULL (used for prepared statements, I think)
    case Types.TIME: // aka TIME
    case Types.TIME2: // aka TIME with fractional seconds
    case Types.YEAR: // aka YEAR, 1 byte (don't ask)
    case Types.BIT: // aka BIT, 1-8 byte
    case Types.GEOMETRY: // aka GEOMETRY
    default:
      throw new Error(`Type ${type} is not managed for now`);
  }
}
export default TableCellFactory;