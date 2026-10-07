import { useState } from 'react';
import { Alert, Button, Checkbox, Flex, Typography } from 'antd';
import { useTranslation } from '../../../i18n';
import {
  NotEditableReason,
  getCellEditability,
} from '../../../sql/columnEditing';
import CellEditor from '../CellEditor/CellEditor';
import {
  findValidationError,
  isSameValue,
  toEditableValue,
  toSqlValue,
} from '../CellEditor/editableValue';
import { useCellWrite } from '../CellWrite';
import ReadOnlyCellValue from './ReadOnlyCellValue';
import type { CellDetail } from './types';

interface CellDetailFormProps {
  detail: CellDetail;
  onClose: () => void;
}

/**
 * The body of the modal: the draft being edited, and the two buttons that end it.
 * A write that meets a conflict is handed over to the conflict modal, and this one closes.
 */
export default function CellDetailForm({
  detail,
  onClose,
}: CellDetailFormProps) {
  const { t } = useTranslation();
  const { writeCell } = useCellWrite();
  const columnDetail = detail.column.detail;
  const fieldKind = detail.column.kind;

  /** the loaded value as text: what the editor opens on, and what "unchanged" means */
  const baseEditable = toEditableValue(detail.value, fieldKind);

  const [edited, setEdited] = useState(baseEditable);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const editability = getCellEditability(columnDetail, detail.rowKey !== null);

  if (!editability.editable) {
    return (
      <ReadOnlyCellValue
        value={detail.value}
        kind={fieldKind}
        reason={editability.reason}
      />
    );
  }

  if (!columnDetail) {
    // unreachable: a cell without a column detail is never editable. Narrowing
    // it here rather than asserting keeps that invariant checked.
    return (
      <ReadOnlyCellValue
        value={detail.value}
        kind={fieldKind}
        reason={NotEditableReason.UnknownColumn}
      />
    );
  }

  const column = columnDetail;
  const validationError = findValidationError(edited, column.json);
  const isUnchanged = isSameValue(edited, baseEditable);
  const canSave = !isSaving && !isUnchanged && validationError === null;

  const save = async (): Promise<void> => {
    setIsSaving(true);
    setSaveError(null);

    try {
      await writeCell({
        detail,
        newValue: toSqlValue(edited),
        originalValue: detail.value,
      });
      onClose();
    } catch (error) {
      // a SQL error stays here: it is the draft that has to be fixed
      setSaveError(error instanceof Error ? error.message : String(error));
      setIsSaving(false);
    }
  };

  return (
    <Flex vertical gap="small">
      {saveError && <Alert type="error" showIcon title={saveError} />}

      {column.nullable && (
        <Checkbox
          checked={edited.isNull}
          disabled={isSaving}
          onChange={(event) =>
            setEdited(
              event.target.checked
                ? { isNull: true, text: '' }
                : // leaving NULL starts from the loaded text, so that
                  // unchecking by mistake costs nothing
                  { isNull: false, text: baseEditable.text }
            )
          }
        >
          {t('cell.detail.setNull')}
        </Checkbox>
      )}

      <CellEditor
        column={column}
        fieldKind={fieldKind}
        value={edited}
        onChange={setEdited}
        disabled={edited.isNull || isSaving}
      />

      {validationError && (
        <Typography.Text type="danger">
          {t('cell.detail.error', { error: validationError })}
        </Typography.Text>
      )}

      <Flex justify="flex-end" gap="small">
        <Button onClick={onClose} disabled={isSaving}>
          {t('cancel')}
        </Button>
        <Button
          type="primary"
          disabled={!canSave}
          loading={isSaving}
          onClick={() => void save()}
        >
          {t('save')}
        </Button>
      </Flex>
    </Flex>
  );
}
