/**
 * @vitest-environment happy-dom
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeProvider } from 'styled-components';
import { describe, expect, test } from 'vitest';
import { DateDisplay } from '../../configuration/dateDisplay';
import { DEFAULT_THEME } from '../../configuration/themes';
import { testables } from '../../contexts/DateDisplayContext';
import { FieldKind, type ResultField } from '../../sql/resultField';
import DateDisplaySwitch from './DateDisplaySwitch';

const { DateDisplayContext } = testables;

const SERVER = {
  display: DateDisplay.Server,
  zoneLabel: 'UTC',
  disabled: false,
};
const LOCAL = {
  display: DateDisplay.Local,
  zoneLabel: 'Europe/Paris',
  disabled: false,
};

function renderSwitch(
  options: Array<typeof SERVER>,
  fields: ResultField[]
): string {
  return renderToStaticMarkup(
    <ThemeProvider theme={DEFAULT_THEME}>
      <DateDisplayContext.Provider
        value={{
          display: DateDisplay.Server,
          options,
          shift: null,
          serverZone: { label: 'UTC', zone: 'UTC' },
          setDisplay: () => {},
        }}
      >
        <DateDisplaySwitch fields={fields} />
      </DateDisplayContext.Provider>
    </ThemeProvider>
  );
}

const DATETIME: ResultField = {
  name: 'at',
  table: 't',
  kind: FieldKind.DateTime,
};

describe('DateDisplaySwitch', () => {
  test('names each zone, the IANA name as is', () => {
    const html = renderSwitch([SERVER, LOCAL], [DATETIME]);

    expect(html).toContain('Europe/Paris');
    expect(html).toContain(' · UTC');
  });

  // a `DATE` is not converted, so it has nothing to switch
  test('is left out of a result with no date-time', () => {
    expect(
      renderSwitch([SERVER, LOCAL], [{ ...DATETIME, kind: FieldKind.Date }])
    ).toBe('');
  });

  test('is left out when every zone is the same one', () => {
    expect(renderSwitch([SERVER], [DATETIME])).toBe('');
  });
});
