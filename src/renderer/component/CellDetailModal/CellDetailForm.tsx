import { useMemo, useState } from 'react';
import { Alert, Button, Checkbox, Flex, Typography } from 'antd';
import { useTranslation } from '../../../i18n';
import {
  NotEditableReason,
  getCellEditability,
  isJsonColumn,
  isNullable,
} from '../../../sql/columnEditing';
import CellEditor from '../CellEditor/CellEditor';
import {
  findValidationError,
  isSameValue,
  toEditableValue,
  toSqlValue,
} from '../CellEditor/editableValue';
import CellChangedAlert from './CellChangedAlert';
import ReadOnlyCellValue from './ReadOnlyCellValue';
import RowDeletedAlert from './RowDeletedAlert';
import type { CellDetail, Conflict, SaveCell } from './types';

interface CellDetailFormProps {
  detail: CellDetail;
  onClose: () => void;
  onSave: SaveCell;
}

/**
 * The body of the modal: the draft being edited, what happened to the last
 * attempt at writing it, and the two buttons that end it.
 */
export default function CellDetailForm({
  detail,
  onClose,
  onSave,
}: CellDetailFormProps) {
  const { t } = useTranslation();
  const columnDetail = detail.column.detail;
  const fieldType = detail.column.type;

  /**
   * The value the write is guarded on. It starts as the loaded value and moves
   * only when the user reloads a conflict, so the guard always describes what
   * the editor was opened on.
   */
  const [baseValue, setBaseValue] = useState<unknown>(detail.value);

  /** the same value as text: what the editor opens on, and what "unchanged" means */
  const baseEditable = useMemo(
    () => toEditableValue(baseValue, fieldType),
    [baseValue, fieldType]
  );

  const [edited, setEdited] = useState(baseEditable);
  const [isSaving, setIsSaving] = useState(false);
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const editability = getCellEditability(columnDetail, detail.rowKey !== null);

  if (!editability.editable) {
    return (
      <ReadOnlyCellValue
        value={detail.value}
        fieldType={fieldType}
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
        fieldType={fieldType}
        reason={NotEditableReason.UnknownColumn}
      />
    );
  }

  const column = columnDetail;
  const validationError = findValidationError(edited, isJsonColumn(column));
  const isUnchanged = isSameValue(edited, baseEditable);
  const isDeleted = conflict?.reason === 'deleted';
  const canSave =
    !isSaving && !isUnchanged && validationError === null && !isDeleted;

  const save = async (force: boolean): Promise<void> => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const outcome = await onSave({
        detail,
        newValue: toSqlValue(edited),
        originalValue: baseValue,
        force,
      });

      if (outcome.status === 'updated') {
        onClose();

        return;
      }

      setConflict(
        outcome.reason === 'deleted'
          ? { reason: 'deleted' }
          : { reason: 'changed', currentValue: outcome.currentValue }
      );
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSaving(false);
    }
  };

  /** Start over from what the server holds, guard included. */
  const reloadConflict = (currentValue: unknown): void => {
    setBaseValue(currentValue);
    setEdited(toEditableValue(currentValue, fieldType));
    setConflict(null);
  };

  return (
    <Flex vertical gap="small">
      {conflict?.reason === 'changed' && (
        <CellChangedAlert
          currentValue={conflict.currentValue}
          fieldType={fieldType}
          isSaving={isSaving}
          onReload={() => reloadConflict(conflict.currentValue)}
          onOverwrite={() => void save(true)}
        />
      )}

      {isDeleted && <RowDeletedAlert />}

      {saveError && <Alert type="error" showIcon title={saveError} />}

      {isNullable(column) && (
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
        fieldType={fieldType}
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
          onClick={() => void save(false)}
        >
          {t('save')}
        </Button>
      </Flex>
    </Flex>
  );
}
