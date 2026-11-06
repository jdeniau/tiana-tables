import { ReactElement, ReactNode, useState } from 'react';
import { styled } from 'styled-components';
import { useTranslation } from '../../../i18n';
import { FieldKind } from '../../../sql/resultField';
import {
  background,
  commentForeground,
  constantForeground,
  fontSize,
  foreground,
  selection,
  size,
  space,
  stringForeground,
} from '../../theme';
import { isNullish } from '../../utils/isNullish';
import type { RowDetailField } from './rowDetailFields';

/** past this many characters, or lines, a value opens folded */
const LONG_TEXT_LENGTH = 140;
const CLAMPED_LINES = 4;

/** One field of a row: its name, its value folded past a few lines, and the tools its caller gives it. */
export function FieldRow({
  entry,
  tools,
}: {
  entry: RowDetailField;
  tools?: ReactNode;
}): ReactElement {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const { field, value, text } = entry;
  const isNull = isNullish(value);
  const isLong =
    text.length > LONG_TEXT_LENGTH || text.split('\n').length > CLAMPED_LINES;

  return (
    <Field>
      <FieldName>{field.name}</FieldName>

      <FieldValue>
        <Value
          data-tone={toneOf(field.kind, value)}
          data-clamped={(isLong && !expanded) || undefined}
        >
          {isNull ? t('cell.detail.nullPlaceholder') : text}
        </Value>
        {isLong && (
          <TextButton type="button" onClick={() => setExpanded(!expanded)}>
            {expanded
              ? t('table.rowDetail.collapse')
              : t('table.rowDetail.expand', { length: text.length })}
          </TextButton>
        )}
      </FieldValue>

      <FieldTools>{tools}</FieldTools>
    </Field>
  );
}

/** The colour the grid gives a value. */
enum ValueTone {
  Plain = 'plain',
  Constant = 'constant',
  String = 'string',
}

/** read from the shape of the value first, as `Cell` does */
function toneOf(kind: FieldKind, value: unknown): ValueTone {
  if (isNullish(value) || value instanceof Uint8Array) {
    return ValueTone.Constant;
  }

  if (typeof value === 'object') {
    return ValueTone.Plain;
  }

  switch (kind) {
    case FieldKind.Number:
      return ValueTone.Constant;
    case FieldKind.String:
      return ValueTone.String;
    default:
      return ValueTone.Plain;
  }
}

export const Field = styled.div`
  display: grid;
  flex: none;
  grid-template-columns: 36% minmax(0, 1fr) auto;
  column-gap: ${space.md};
  align-items: baseline;
  padding: ${space.xs} ${space.xs} ${space.xs} ${space.md};
  border-bottom: 1px solid ${selection};

  &:hover {
    background: color-mix(in srgb, ${selection} 40%, ${background});
  }
`;

const FieldName = styled.span`
  font-size: ${fontSize.sm};
  color: ${commentForeground};
  overflow-wrap: anywhere;
`;

const FieldValue = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${space.xs};
  min-width: 0;
`;

const Value = styled.span`
  max-width: 100%;
  font-size: ${fontSize.base};
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: ${foreground};

  &[data-tone='${ValueTone.Constant}'] {
    color: ${constantForeground};
  }

  &[data-tone='${ValueTone.String}'] {
    color: ${stringForeground};
  }

  &[data-clamped] {
    display: -webkit-box;
    -webkit-line-clamp: ${CLAMPED_LINES};
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

export const TextButton = styled.button`
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: ${fontSize.sm};
  color: ${commentForeground};
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;

  &:hover {
    color: ${foreground};
  }
`;

const FieldTools = styled.div`
  display: flex;
  align-items: center;
  align-self: start;
  gap: ${space.xs};
  height: ${size.segment};
`;
