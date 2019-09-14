// import * as React from 'react';
import { Types } from 'mysql';

interface TableCellProps {
    type: number;
    value: any;
};

const TableCell = ({ type, value }: TableCellProps) => {

    return Types.DATETIME === type
        ? 'ceci est une date'
        : value;
}

export default TableCell;