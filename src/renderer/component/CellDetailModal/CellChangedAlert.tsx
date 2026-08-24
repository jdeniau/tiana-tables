import { Alert, Button, Flex, Input, Space } from 'antd';
import { useTranslation } from '../../../i18n';
import cellValueToText from '../cellValueToText';

interface CellChangedAlertProps {
  /** what the cell holds on the server, which is not what the editor opened on */
  currentValue: unknown;
  fieldType: number | undefined;
  isSaving: boolean;
  /** start over from the server value, guard included */
  onReload: () => void;
  /** write anyway, dropping the guard */
  onOverwrite: () => void;
}

/**
 * A write that found the cell changed since the row was loaded, and the two
 * ways out of it: start over from what the server holds, or overwrite it.
 */
export default function CellChangedAlert({
  currentValue,
  fieldType,
  isSaving,
  onReload,
  onOverwrite,
}: CellChangedAlertProps) {
  const { t } = useTranslation();

  return (
    <Alert
      type="warning"
      showIcon
      title={t('cell.detail.conflict.changed.title')}
      description={
        <Flex vertical gap="small" align="flex-start">
          <span>{t('cell.detail.conflict.changed.description')}</span>
          <Input.TextArea
            readOnly
            value={cellValueToText(currentValue, fieldType)}
            placeholder={t('cell.detail.nullPlaceholder')}
            autoSize={{ minRows: 2, maxRows: 8 }}
          />
          <Space>
            <Button onClick={onReload} disabled={isSaving}>
              {t('cell.detail.conflict.reload')}
            </Button>
            <Button danger loading={isSaving} onClick={onOverwrite}>
              {t('cell.detail.conflict.overwrite')}
            </Button>
          </Space>
        </Flex>
      }
    />
  );
}
