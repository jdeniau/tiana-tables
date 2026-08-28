import { ReactElement, useState } from 'react';
import { Button, Flex, Input, Modal } from 'antd';
import { styled } from 'styled-components';
import { useTranslation } from '../../../i18n';
import { escapeIdentifier } from '../../../sql/escapeIdentifier';
import type { FilterOperator } from '../../../sql/filterClause';
import { commentForeground } from '../../theme';

/** The comparison waiting for the value the user is about to type. */
export interface PendingFreeTextFilter {
  columnName: string;
  operator: FilterOperator;
}

interface FreeTextFilterModalProps {
  pending: PendingFreeTextFilter | null;
  onCancel: () => void;
  onSubmit: (text: string) => void;
}

/**
 * The `…` entry of the filter menu: a comparison whose value is typed rather
 * than read off a cell or the clipboard.
 *
 * What is typed is a **value**, not SQL: it will be quoted and escaped like any
 * other literal. Writing an expression (another column, a function call) stays
 * the job of the `WHERE` editor, which this very filter fills in.
 *
 * As in `CellDetailModal`, the draft lives in a child that `destroyOnHidden`
 * unmounts, so reopening never shows what was typed the time before.
 */
export default function FreeTextFilterModal({
  pending,
  onCancel,
  onSubmit,
}: FreeTextFilterModalProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Modal
      title={t('table.contextMenu.filter.freeText.title')}
      open={pending !== null}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
    >
      {pending && (
        <FreeTextFilterForm
          pending={pending}
          onCancel={onCancel}
          onSubmit={onSubmit}
        />
      )}
    </Modal>
  );
}

function FreeTextFilterForm({
  pending,
  onCancel,
  onSubmit,
}: FreeTextFilterModalProps & {
  pending: PendingFreeTextFilter;
}): ReactElement {
  const { t } = useTranslation();
  const [text, setText] = useState<string>('');

  return (
    <Flex vertical gap="middle">
      <Input
        autoFocus
        // the clause reads in full while typing, and what precedes the value is
        // exactly what will be sent. `prefix` rather than `addonBefore` — antd 6
        // deprecates the addons in favour of `Space.Compact`, and inside the
        // field the clause reads as one line anyway, right before the caret
        prefix={
          <ClausePrefix>{`${escapeIdentifier(pending.columnName)} ${
            pending.operator
          }`}</ClausePrefix>
        }
        value={text}
        onChange={(event) => setText(event.target.value)}
        onPressEnter={() => onSubmit(text)}
      />

      <Flex gap="small" justify="flex-end">
        <Button onClick={onCancel}>{t('cancel')}</Button>
        <Button color="primary" variant="solid" onClick={() => onSubmit(text)}>
          {t('filter')}
        </Button>
      </Flex>
    </Flex>
  );
}

// muted, so that the fixed part of the clause reads apart from what is typed
const ClausePrefix = styled.span`
  color: ${commentForeground};
  white-space: nowrap;
`;
