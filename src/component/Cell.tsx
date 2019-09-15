import * as React from 'react';
import { Types } from 'mysql';

interface TableCellFactoryProps {
    type: number;
    value: any;
}
interface TableCellProps {
    value: any;
}

function DatetimeCell({ value }: { value: Date }) {
    return <>{value.toTimeString()}</>;
}

function VarcharCell({ value }: TableCellProps) {
    return value;
}

function TableCellFactory({ type, value }: TableCellFactoryProps) {

    return (<>
        {Types.DATETIME === type
            ? <DatetimeCell value={value} />
            : <VarcharCell value={value} />}
    </>);
}
export default TableCellFactory;