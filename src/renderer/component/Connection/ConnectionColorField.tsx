import { ColorPicker } from 'antd';
import { css, styled, useTheme } from 'styled-components';
import {
  ConnectionColor,
  ConnectionColorKind,
} from '../../../configuration/connectionColor';
import {
  ACCENT_SLOTS,
  AccentSlot,
} from '../../../configuration/palettes/types';
import { useTranslation } from '../../../i18n';
import {
  accent,
  background,
  commentForeground,
  emphasisForeground,
  size,
  space,
} from '../../theme';

type Props = {
  /** `value` and `onChange` are what a `Form.Item` hands to its control */
  value?: ConnectionColor;
  onChange?: (value: ConnectionColor | undefined) => void;
};

function isSlot(value: ConnectionColor | undefined, slot: AccentSlot): boolean {
  return value?.kind === ConnectionColorKind.Palette && value.slot === slot;
}

/**
 * The colour a connection is marked with: no colour, one of the theme's accent
 * slots (`ACCENT_SLOTS`) — which follow it when the theme changes — or a
 * colour of one's own, which does not.
 */
export default function ConnectionColorField({ value, onChange }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();

  const custom =
    value?.kind === ConnectionColorKind.Custom ? value.hex : undefined;

  return (
    <Row role="radiogroup" aria-label={t('connection.form.color.label')}>
      <NoColorSwatch
        type="button"
        role="radio"
        aria-checked={value === undefined}
        aria-label={t('connection.form.color.none')}
        title={t('connection.form.color.none')}
        $fill="transparent"
        $selected={value === undefined}
        onClick={() => onChange?.(undefined)}
      />

      {ACCENT_SLOTS.map((slot) => {
        const hex = theme.palette[slot];
        const label = t('connection.form.color.palette', { hex });

        return (
          <Swatch
            key={slot}
            type="button"
            role="radio"
            aria-checked={isSlot(value, slot)}
            aria-label={label}
            title={label}
            $fill={hex}
            $selected={isSlot(value, slot)}
            onClick={() =>
              onChange?.({ kind: ConnectionColorKind.Palette, slot })
            }
          />
        );
      })}

      <ColorPicker
        value={custom ?? theme.palette.base08}
        disabledAlpha
        format="hex"
        onChangeComplete={(color) =>
          onChange?.({
            kind: ConnectionColorKind.Custom,
            hex: color.toHexString(),
          })
        }
      >
        <Swatch
          type="button"
          role="radio"
          aria-checked={custom !== undefined}
          aria-label={t('connection.form.color.custom')}
          title={t('connection.form.color.custom')}
          $fill={custom ?? 'transparent'}
          $selected={custom !== undefined}
        >
          {custom ? null : '+'}
        </Swatch>
      </ColorPicker>
    </Row>
  );
}

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${space.xs};
`;

const Swatch = styled.button<{ $fill: string; $selected: boolean }>`
  flex: none;
  width: ${size.control};
  height: ${size.control};
  padding: 0;
  border: 1px solid ${commentForeground};
  background: ${({ $fill }) => $fill};
  color: ${commentForeground};
  font: inherit;
  line-height: 1;
  cursor: pointer;

  ${({ $selected }) =>
    $selected &&
    css`
      outline: 1px solid ${emphasisForeground};
      outline-offset: 2px;
    `}

  &:focus-visible {
    outline: 1px solid ${accent};
    outline-offset: 2px;
  }
`;

/** "no colour": the background of the app, struck through in the rule colour */
const NoColorSwatch = styled(Swatch)`
  background:
    linear-gradient(
      to top right,
      transparent calc(50% - 1px),
      ${commentForeground} calc(50% - 1px),
      ${commentForeground} calc(50% + 1px),
      transparent calc(50% + 1px)
    ),
    ${background};
`;
