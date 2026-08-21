import { Input, Modal } from 'antd';
import type { ColumnMeta } from './TableGrid';
import cellValueToText from './cellValueToText';

export interface CellDetail {
  value: unknown;
  column: ColumnMeta;
}

interface CellDetailModalProps {
  detail: CellDetail | null;
  onClose: () => void;
}

/**
 * The full value of a cell, opened by double-clicking it in the grid: what the
 * ellipsis of the grid cuts off is readable — and selectable — here.
 *
 * Read-only for now; this is the place where editing a long value will land.
 */
export default function CellDetailModal({
  detail,
  onClose,
}: CellDetailModalProps) {
  return (
    <Modal
      title={detail?.column.name}
      open={detail !== null}
      onCancel={onClose}
      footer={null}
      width={800}
      // the value is remounted on every open: no stale text in the textarea
      destroyOnHidden
    >
      <Input.TextArea
        readOnly
        // NULL renders as an empty text, the placeholder tells them apart
        placeholder="(NULL)"
        value={detail ? cellValueToText(detail.value, detail.column.type) : ''}
        autoSize={{ minRows: 8, maxRows: 20 }}
      />
    </Modal>
  );
}
