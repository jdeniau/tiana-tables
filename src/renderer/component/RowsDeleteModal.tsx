import { type ReactElement, useState } from 'react';
import { Modal, Typography } from 'antd';
import { useTranslation } from '../../i18n';
import { type ErrorLike, isErrorLike } from '../../sql/errorSerializer';
import type { PrimaryKeyPart } from '../../sql/updateCell';
import SqlErrorComponent from './Query/SqlErrorComponent';

interface RowsDeleteModalProps {
  /** the rows to delete, `null` when the modal is closed */
  rowKeys: Array<Array<PrimaryKeyPart>> | null;
  /** resolves once the rows are deleted and the grid shows the rows left */
  onDelete: (rowKeys: Array<Array<PrimaryKeyPart>>) => Promise<void>;
  onClose: () => void;
}

/** The confirmation every deletion of rows goes through; an error of the server stays in it. */
export default function RowsDeleteModal({
  rowKeys,
  onDelete,
  onClose,
}: RowsDeleteModalProps): ReactElement {
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<ErrorLike | null>(null);
  const count = rowKeys?.length ?? 0;

  const confirm = async (): Promise<void> => {
    if (!rowKeys) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await onDelete(rowKeys);
      onClose();
    } catch (caught) {
      if (!isErrorLike(caught)) {
        throw caught;
      }

      setError(caught);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      open={rowKeys !== null}
      title={t('table.delete.title', { count })}
      okText={t('table.delete.confirm')}
      // Delete then Enter deletes, Escape cancels
      okButtonProps={{ danger: true, autoFocus: true }}
      cancelText={t('table.delete.cancel')}
      confirmLoading={deleting}
      onOk={() => void confirm()}
      onCancel={onClose}
      afterClose={() => setError(null)}
      destroyOnHidden
    >
      <Typography.Paragraph>
        {t('table.delete.description', { count })}
      </Typography.Paragraph>

      {error && <SqlErrorComponent error={error} />}
    </Modal>
  );
}
