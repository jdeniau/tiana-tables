import { ReactElement, useState } from 'react';
import { Button, Flex, Input, InputNumber, Modal } from 'antd';
import { useTranslation } from '../../../i18n';
import {
  type PrimaryKeyColumn,
  primaryKeyFilterClause,
} from '../../../sql/filterClause';
import { FieldKind } from '../../../sql/resultField';
import { useDialect } from '../../hooks/useDialect';
import { ClausePrefix } from './ClausePrefix';

interface GoToIdModalProps {
  open: boolean;
  /** the columns of the table's primary key, one field each */
  primaryKey: ReadonlyArray<PrimaryKeyColumn>;
  onCancel: () => void;
  /** called with the `WHERE` clause of the row */
  onSubmit: (where: string) => void;
}

/**
 * "Go to id…": the value of each column of the primary key, typed, then
 * applied as the table's filter.
 *
 * As in `FreeTextFilterModal`, the draft lives in a child that
 * `destroyOnHidden` unmounts, so reopening never shows what was typed before.
 */
export default function GoToIdModal({
  open,
  primaryKey,
  onCancel,
  onSubmit,
}: GoToIdModalProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Modal
      title={t('table.goToId.title')}
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
    >
      <GoToIdForm
        primaryKey={primaryKey}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    </Modal>
  );
}

function GoToIdForm({
  primaryKey,
  onCancel,
  onSubmit,
}: Omit<GoToIdModalProps, 'open'>): ReactElement {
  const { t } = useTranslation();
  const dialect = useDialect();
  // by column: a column absent has nothing typed yet
  const [texts, setTexts] = useState<Readonly<Record<string, string>>>({});

  const complete = primaryKey.every(({ column }) => texts[column]);

  const setText = (column: string, text: string) => {
    setTexts((previous) => ({ ...previous, [column]: text }));
  };

  const submit = () => {
    if (complete) {
      onSubmit(
        primaryKeyFilterClause(
          dialect,
          primaryKey.map(({ column, kind }) => ({
            column,
            kind,
            text: texts[column] ?? '',
          }))
        )
      );
    }
  };

  return (
    <Flex vertical gap="middle">
      {primaryKey.map(({ column, kind }, index) => {
        const prefix = (
          <ClausePrefix>{`${dialect.escapeIdentifier(column)} =`}</ClausePrefix>
        );

        return kind === FieldKind.Number ? (
          <InputNumber
            key={column}
            autoFocus={index === 0}
            // stringMode keeps a BIGINT exact, as the cell editor does
            stringMode
            style={{ width: '100%' }}
            prefix={prefix}
            value={texts[column]}
            onChange={(value) => setText(column, String(value ?? ''))}
            onPressEnter={submit}
          />
        ) : (
          <Input
            key={column}
            autoFocus={index === 0}
            prefix={prefix}
            value={texts[column] ?? ''}
            onChange={(event) => setText(column, event.target.value)}
            onPressEnter={submit}
          />
        );
      })}

      <Flex gap="small" justify="flex-end">
        <Button onClick={onCancel}>{t('cancel')}</Button>
        <Button
          color="primary"
          variant="solid"
          disabled={!complete}
          onClick={submit}
        >
          {t('filter')}
        </Button>
      </Flex>
    </Flex>
  );
}
