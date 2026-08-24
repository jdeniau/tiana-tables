import { Alert } from 'antd';
import { useTranslation } from '../../../i18n';

/**
 * A write that found no row at all. Nothing was written, and nothing can be —
 * there is no row left to overwrite.
 */
export default function RowDeletedAlert() {
  const { t } = useTranslation();

  return (
    <Alert
      type="error"
      showIcon
      title={t('cell.detail.conflict.deleted.title')}
      description={t('cell.detail.conflict.deleted.description')}
    />
  );
}
