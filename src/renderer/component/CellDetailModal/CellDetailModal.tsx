import { Modal } from 'antd';
import CellDetailForm from './CellDetailForm';
import type { CellDetail } from './types';

interface CellDetailModalProps {
  detail: CellDetail | null;
  onClose: () => void;
}

/**
 * The full value of a cell, opened by double-clicking it in the grid: what the
 * ellipsis of the grid cuts off is readable — and editable — here.
 *
 * Only the frame lives here. The draft belongs to `CellDetailForm`, which
 * `destroyOnHidden` unmounts on close — so reopening the modal never shows a
 * stale draft. A write that meets a conflict is settled by `CellWrite`.
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
      destroyOnHidden
    >
      {detail && <CellDetailForm detail={detail} onClose={onClose} />}
    </Modal>
  );
}
