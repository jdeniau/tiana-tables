import { useMemo } from 'react';
import { Input, InputNumber, Select } from 'antd';
import { isNullable, parseEnumValues } from '../../../sql/columnEditing';
import type { ColumnDetail } from '../../../sql/types';
import JsonCellEditor from './JsonCellEditor';
import { fromDateInputValue, toDateInputValue } from './dateTimeText';
import type { EditableValue } from './editableValue';
import { EditorKind, resolveEditorKind } from './editorKind';

const JSON_EDITOR_HEIGHT = 320;

interface CellEditorProps {
  column: ColumnDetail;
  /** the type of the field, which decides the editor wherever it can */
  fieldType: number | undefined;
  value: EditableValue;
  onChange: (value: EditableValue) => void;
  /** true while the cell is set to NULL, or while a save is in flight */
  disabled: boolean;
}

/**
 * The editor a cell deserves, given its declared type.
 *
 * Every editor answers with the same `EditableValue`, so the modal above knows
 * nothing of dates or enums — it only ever holds a text and a NULL flag. Antd
 * components are used freely here: unlike the grid, a modal mounts one cell.
 */
export default function CellEditor({
  column,
  fieldType,
  value,
  onChange,
  disabled,
}: CellEditorProps) {
  const kind = resolveEditorKind(column, fieldType, value.text);
  const nullable = isNullable(column);

  const enumValues = useMemo(
    () =>
      kind === EditorKind.Enum || kind === EditorKind.Set
        ? parseEnumValues(column.ColumnType).map((enumValue) => ({
            value: enumValue,
            label: enumValue === '' ? '(empty)' : enumValue,
          }))
        : [],
    [kind, column.ColumnType]
  );

  // clearing an editor means NULL on a nullable column, and an empty value
  // otherwise — which MySQL is then free to reject
  const clear = (): void => onChange({ isNull: nullable, text: '' });
  const setText = (text: string): void => onChange({ isNull: false, text });

  switch (kind) {
    case EditorKind.Enum:
      return (
        <Select
          style={{ width: '100%' }}
          disabled={disabled}
          allowClear={nullable}
          showSearch
          options={enumValues}
          value={value.isNull ? undefined : value.text}
          onChange={(selected: string | undefined) =>
            selected === undefined ? clear() : setText(selected)
          }
        />
      );

    case EditorKind.Set:
      return (
        <Select
          style={{ width: '100%' }}
          mode="multiple"
          disabled={disabled}
          allowClear={nullable}
          options={enumValues}
          // a SET is stored as its members joined by commas, and a member
          // cannot hold one — so splitting is lossless
          value={value.isNull || value.text === '' ? [] : value.text.split(',')}
          onChange={(selected: Array<string>) =>
            selected.length === 0 ? clear() : setText(selected.join(','))
          }
        />
      );

    case EditorKind.Date:
    case EditorKind.DateTime: {
      const withTime = kind === EditorKind.DateTime;

      return (
        // the calendar of the platform, through an antd-styled input: a MySQL
        // date is a wall clock, and going through no date library at all is
        // what keeps it from being reinterpreted in a time zone (see
        // `dateTimeText`)
        <Input
          type={withTime ? 'datetime-local' : 'date'}
          // without it the input hides the seconds, and a DATETIME has them
          step={withTime ? 1 : undefined}
          disabled={disabled}
          value={value.isNull ? '' : toDateInputValue(value.text, withTime)}
          onChange={(event) =>
            event.target.value === ''
              ? clear()
              : setText(fromDateInputValue(event.target.value, withTime))
          }
        />
      );
    }

    case EditorKind.Number:
      return (
        <InputNumber
          style={{ width: '100%' }}
          disabled={disabled}
          // stringMode keeps a BIGINT or a DECIMAL exact: antd hands back the
          // digits that were typed instead of a rounded JavaScript number
          stringMode
          value={value.isNull ? null : value.text}
          onChange={(selected) =>
            selected === null ? clear() : setText(String(selected))
          }
        />
      );

    case EditorKind.Json:
      return (
        <JsonCellEditor
          value={value.isNull ? '' : value.text}
          onChange={setText}
          readOnly={disabled}
          height={JSON_EDITOR_HEIGHT}
        />
      );

    case EditorKind.Text:
      return (
        <Input.TextArea
          disabled={disabled}
          value={value.isNull ? '' : value.text}
          onChange={(event) => setText(event.target.value)}
          autoSize={{ minRows: 8, maxRows: 20 }}
        />
      );
  }
}
