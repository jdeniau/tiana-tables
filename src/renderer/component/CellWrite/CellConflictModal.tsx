import type { ReactElement } from 'react';
import { Alert, Button, Flex, Input, Modal, Typography } from 'antd';
import { useTranslation } from '../../../i18n';
import cellValueToText from '../cellValueToText';
import { type PendingIssue, WriteIssueReason } from './issue';
import type { CellWrite } from './types';

interface CellConflictModalProps {
  /** the write that did not land, `null` when the modal is closed */
  pending: PendingIssue | null;
  /** writes the value anyway, without the guard */
  onOverwrite: (write: CellWrite) => void;
  onClose: () => void;
}

/** A write that did not land: overwrite or cancel a changed cell, acknowledge the rest. */
export default function CellConflictModal({
  pending,
  onOverwrite,
  onClose,
}: CellConflictModalProps): ReactElement {
  const { t } = useTranslation();

  const issue = pending?.issue;
  const isChanged = issue?.reason === WriteIssueReason.Changed;

  return (
    <Modal
      title={pending?.write.detail.column.name}
      open={pending !== null}
      // closing a changed cell is cancelling the change: nothing else can be meant
      onCancel={onClose}
      width={800}
      destroyOnHidden
      footer={
        pending && isChanged ? (
          <Flex justify="flex-end" gap="small">
            <Button onClick={onClose}>{t('cell.write.cancel')}</Button>
            <Button danger onClick={() => onOverwrite(pending.write)}>
              {t('cell.write.overwrite')}
            </Button>
          </Flex>
        ) : (
          <Button onClick={onClose}>{t('cell.write.close')}</Button>
        )
      }
    >
      {pending && issue && (
        <Flex vertical gap="small">
          {issue.reason === WriteIssueReason.Changed && (
            <>
              <Alert
                type="warning"
                showIcon
                title={t('cell.write.changed.title')}
                description={t('cell.write.changed.description')}
              />
              <ValueText
                label={t('cell.write.serverValue')}
                text={cellValueToText(issue.currentValue)}
              />
              <ValueText
                label={t('cell.write.yourValue')}
                text={pending.write.newValue ?? ''}
              />
            </>
          )}

          {issue.reason === WriteIssueReason.Deleted && (
            <Alert
              type="error"
              showIcon
              title={t('cell.write.deleted.title')}
              description={t('cell.write.deleted.description')}
            />
          )}

          {issue.reason === WriteIssueReason.Failed && (
            <Alert
              type="error"
              showIcon
              title={t('cell.write.failed.title')}
              description={issue.message}
            />
          )}
        </Flex>
      )}
    </Modal>
  );
}

function ValueText({
  label,
  text,
}: {
  label: string;
  text: string;
}): ReactElement {
  const { t } = useTranslation();

  return (
    <Flex vertical gap="small">
      <Typography.Text type="secondary">{label}</Typography.Text>
      <Input.TextArea
        readOnly
        value={text}
        // NULL renders as an empty text, the placeholder tells them apart
        placeholder={t('cell.detail.nullPlaceholder')}
        autoSize={{ minRows: 2, maxRows: 8 }}
      />
    </Flex>
  );
}
