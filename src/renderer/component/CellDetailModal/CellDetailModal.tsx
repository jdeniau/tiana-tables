import { Modal } from 'antd';
import CellDetailForm from './CellDetailForm';
import type { CellDetail, SaveCell } from './types';

interface CellDetailModalProps {
  detail: CellDetail | null;
  onClose: () => void;
  onSave: SaveCell;
}

/**
 * The full value of a cell, opened by double-clicking it in the grid: what the
 * ellipsis of the grid cuts off is readable — and editable — here.
 *
 * Only the frame lives here. The draft, and everything that can happen to it,
 * belong to `CellDetailForm`, which `destroyOnHidden` unmounts on close — so
 * reopening the modal never shows a stale draft or a stale conflict.
 */
export default function CellDetailModal({
  detail,
  onClose,
  onSave,
}: CellDetailModalProps) {
  return (
    <Modal
      title={detail?.column.name}
      open={detail !== null}
      onCancel={onClose}
      footer={null}
      width={800}
      destroyOnHidden
    >
      {detail && (
        <CellDetailForm detail={detail} onClose={onClose} onSave={onSave} />
      )}
    </Modal>
  );
}
