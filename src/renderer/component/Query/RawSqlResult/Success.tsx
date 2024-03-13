import { FieldPacket, RowDataPacket } from 'mysql2';
import TableGrid from '../../TableGrid';
import { useTableHeight } from '../../TableLayout/useTableHeight';

type Props = {
  result: RowDataPacket[];
  fields: FieldPacket[];
};

export default function RowDataPacketResult({ result, fields }: Props) {
  const [yTableScroll, resizeRef] = useTableHeight();

  return (
    <div style={{ overflow: 'auto', flex: '1' }} ref={resizeRef}>
      <TableGrid result={result} fields={fields} yTableScroll={yTableScroll} />
    </div>
  );
}
