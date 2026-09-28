import { type ReactElement } from 'react';
import { styled } from 'styled-components';
import { DateDisplay } from '../../configuration/dateDisplay';
import { useDateDisplay } from '../../contexts/DateDisplayContext';
import { useTranslation } from '../../i18n';
import { FieldKind, type ResultField } from '../../sql/resultField';
import { fontSize, mutedForeground, space } from '../theme';
import type { DateDisplaySegment } from '../utils/dateZones';
import { RegionSegmented } from './Style/RegionSegmented';

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
  const { display, segments, serverZone, setDisplay } = useDateDisplay();

  // UTC and local time take a zoneless date-time in the server's zone, and say so
  const tooltipOf = (segment: DateDisplaySegment) => {
    if (segment.disabled) {
      return t('dateDisplay.unresolved', { zone: serverZone?.label });
    }

    return segment.display === DateDisplay.Server
      ? undefined
      : t('dateDisplay.assumed', { zone: serverZone?.label });
  };

  if (
    segments.length < 2 ||
    !fields.some((field) => field.kind === FieldKind.DateTime)
  ) {
    return null;
  }

  return (
    <Switch>
      <Label>{t('dateDisplay.label')}</Label>
      <RegionSegmented<DateDisplay>
        value={display}
        onChange={setDisplay}
        options={segments.map((segment) => ({
          value: segment.display,
          label: (
            <>
              {t('dateDisplay.option', { display: segment.display })}
              {segment.zoneLabel !== null && (
                <ZoneName> · {segment.zoneLabel}</ZoneName>
              )}
            </>
          ),
          disabled: segment.disabled,
          tooltip: tooltipOf(segment),
        }))}
      />
    </Switch>
  );
}
