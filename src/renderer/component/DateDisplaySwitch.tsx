import { type ReactElement } from 'react';
import { Segmented, theme as antdTheme } from 'antd';
import { styled } from 'styled-components';
import { DateDisplay } from '../../configuration/dateDisplay';
import { useDateDisplay } from '../../contexts/DateDisplayContext';
import { useTranslation } from '../../i18n';
import { FieldKind, type ResultField } from '../../sql/resultField';
import { fontSize, mutedForeground, space } from '../theme';
import type { DateDisplayOption } from '../utils/dateZones';

const Switch = styled.div`
  display: flex;
  flex: none;
  align-items: center;
  gap: ${space.sm};
`;

const Label = styled.span`
  font-size: ${fontSize.sm};
  color: ${mutedForeground};
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

// an IANA name keeps its case in the switch's caps: `Europe/Paris`
const ZoneName = styled.span`
  text-transform: none;
  letter-spacing: normal;
`;

/**
 * The zone a result's date-times are shown in, at the left of the view switch.
 * Nothing when no column holds a date-time, or when every zone is the same one.
 */
export default function DateDisplaySwitch({
  fields,
}: {
  fields: ReadonlyArray<ResultField>;
}): ReactElement | null {
  const { t } = useTranslation();
  const { token } = antdTheme.useToken();
  const { display, options, serverZone, setDisplay } = useDateDisplay();

  // UTC and local time take a zoneless date-time in the server's zone, and say so
  const tooltipOf = (option: DateDisplayOption) => {
    if (option.disabled) {
      return t('dateDisplay.unresolved', { zone: serverZone?.label });
    }

    return option.display === DateDisplay.Server
      ? undefined
      : t('dateDisplay.assumed', { zone: serverZone?.label });
  };

  if (
    options.length < 2 ||
    !fields.some((field) => field.kind === FieldKind.DateTime)
  ) {
    return null;
  }

  return (
    <Switch>
      <Label>{t('dateDisplay.label')}</Label>
      {/* the tokens and parts of the SQL page's Data / Chart switch */}
      <Segmented<DateDisplay>
        size="small"
        value={display}
        onChange={setDisplay}
        styles={{
          root: { border: `1px solid ${token.colorBorderSecondary}` },
          label: { textTransform: 'uppercase', letterSpacing: '0.06em' },
        }}
        options={options.map((option) => ({
          value: option.display,
          label: (
            <>
              {t('dateDisplay.option', { display: option.display })}
              {option.zoneLabel !== null && (
                <ZoneName> · {option.zoneLabel}</ZoneName>
              )}
            </>
          ),
          disabled: option.disabled,
          tooltip: tooltipOf(option),
        }))}
      />
    </Switch>
  );
}
