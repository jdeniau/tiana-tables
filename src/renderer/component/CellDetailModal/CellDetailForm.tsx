import { type KeyboardEvent, useState } from 'react';
import { Button, Checkbox, Flex, Typography } from 'antd';
import { styled } from 'styled-components';
import { useTranslation } from '../../../i18n';
import {
  NotEditableReason,
  getCellEditability,
} from '../../../sql/columnEditing';
import { type ErrorLike, isErrorLike } from '../../../sql/errorSerializer';
import CellEditor from '../CellEditor/CellEditor';
import {
  findValidationError,
  isSameValue,
  toEditableValue,
  toSqlValue,
} from '../CellEditor/editableValue';
import { useCellWrite } from '../CellWrite';
import { KeyboardShortcut } from '../KeyboardShortcut';
import SqlErrorComponent from '../Query/SqlErrorComponent';
import ReadOnlyCellValue from './ReadOnlyCellValue';
import type { CellDetail } from './types';

/** pressed with Ctrl (⌘ on macOS), the key that saves the draft, as it runs a query in the SQL editor */
const SAVE_KEY = 'Enter';

// lined up with the editor: the modal's padding already holds it off the edges
const SaveError = styled(SqlErrorComponent)`
  && {
    margin: 0;
  }
`;

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
  const [saveError, setSaveError] = useState<ErrorLike | null>(null);

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
  const validationError = findValidationError(edited, fieldKind);
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
      setIsSaving(false);

      if (!isErrorLike(error)) {
        throw error;
      }

      // a SQL error stays here: it is the draft that has to be fixed
      setSaveError(error);
    }
  };

  // in the capture phase, so that the form claims the key before the editor:
  // Monaco binds it to "Insert Line Below", a Select to opening or picking
  const handleSaveKey = (event: KeyboardEvent): void => {
    if (
      event.key !== SAVE_KEY ||
      !(event.ctrlKey || event.metaKey) ||
      event.altKey ||
      event.shiftKey
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (canSave) {
      void save();
    }
  };

  return (
    <Flex vertical gap="small" onKeyDownCapture={handleSaveKey}>
      {saveError && <SaveError error={saveError} />}

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
          <KeyboardShortcut cmdOrCtrl pressedKey={SAVE_KEY} />
        </Button>
      </Flex>
    </Flex>
  );
}
