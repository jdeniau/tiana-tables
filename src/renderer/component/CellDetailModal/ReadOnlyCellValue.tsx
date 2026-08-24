import { Flex, Input, Typography } from 'antd';
import { useTranslation } from '../../../i18n';
import type { NotEditableReason } from '../../../sql/columnEditing';
import cellValueToText from '../cellValueToText';

interface ReadOnlyCellValueProps {
  value: unknown;
  fieldType: number | undefined;
  reason: NotEditableReason;
}

/** The value as text, with a line saying why it cannot be edited. */
export default function ReadOnlyCellValue({
  value,
  fieldType,
  reason,
}: ReadOnlyCellValueProps) {
  const { t } = useTranslation();

  return (
    <Flex vertical gap="small">
      <Input.TextArea
        readOnly
        // NULL renders as an empty text, the placeholder tells them apart
        placeholder={t('cell.detail.nullPlaceholder')}
        value={cellValueToText(value, fieldType)}
        autoSize={{ minRows: 8, maxRows: 20 }}
      />
      <Typography.Text type="secondary">
        {t('cell.detail.readOnly', { reason })}
      </Typography.Text>
    </Flex>
  );
}
