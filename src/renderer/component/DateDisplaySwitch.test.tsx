/**
 * @vitest-environment happy-dom
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeProvider } from 'styled-components';
import { afterEach, describe, expect, test } from 'vitest';
import { DateDisplay } from '../../configuration/dateDisplay';
import { DEFAULT_THEME } from '../../configuration/themes';
import { testables } from '../../contexts/DateDisplayContext';
import { FieldKind, type ResultField } from '../../sql/resultField';
import type { ServerZone } from '../utils/dateZones';
import DateDisplaySwitch from './DateDisplaySwitch';

const { DateDisplayContext } = testables;

// tells React this environment wraps its updates in `act`
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

interface Segment {
  display: DateDisplay;
  zoneLabel: string | null;
  disabled: boolean;
}

const SERVER: Segment = {
  display: DateDisplay.Server,
  zoneLabel: 'UTC',
  disabled: false,
};
const UTC: Segment = {
  display: DateDisplay.Utc,
  zoneLabel: null,
  disabled: false,
};
const LOCAL: Segment = {
  display: DateDisplay.Local,
  zoneLabel: 'Europe/Paris',
  disabled: false,
};

const UTC_SERVER: ServerZone = { label: 'UTC', zone: 'UTC' };

function switchOf(
  segments: Segment[],
  fields: ResultField[],
  serverZone = UTC_SERVER
) {
  return (
    <ThemeProvider theme={DEFAULT_THEME}>
      <DateDisplayContext.Provider
        value={{
          display: DateDisplay.Server,
          segments,
          shift: null,
          serverZone,
          setDisplay: () => {},
        }}
      >
        <DateDisplaySwitch fields={fields} />
      </DateDisplayContext.Provider>
    </ThemeProvider>
  );
}

function renderSwitch(segments: Segment[], fields: ResultField[]): string {
  return renderToStaticMarkup(switchOf(segments, fields));
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

describe('the tooltip of a segment', () => {
  let unmount: () => void = () => {};

  afterEach(() => {
    act(() => unmount());
    document.body.innerHTML = '';
  });

  // antd opens a tooltip on hover, after its delay
  async function hover(
    label: string,
    segments = [SERVER, UTC, LOCAL],
    serverZone = UTC_SERVER
  ): Promise<string | undefined> {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    unmount = () => root.unmount();

    act(() => root.render(switchOf(segments, [DATETIME], serverZone)));

    await act(async () => {
      [...container.querySelectorAll('.ant-segmented-item')]
        .find((item) => item.textContent?.startsWith(label))
        ?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 300));
    });

    return document.querySelector('.ant-tooltip-container')?.textContent;
  }

  // a DATETIME holds no zone: converting it takes the server's
  test("UTC and local time say they read a zoneless date-time in the server's zone", async () => {
    expect(await hover('Local')).toBe(
      'Dates with no time zone (DATETIME, timestamp) are read as the server’s time (UTC), then converted.'
    );
  });

  test("the server's time converts nothing, so it says nothing", async () => {
    expect(await hover('Server')).toBeUndefined();
  });

  // a MariaDB whose machine runs in New York names its zone `EDT`
  test("a greyed segment says why the server's zone converts nothing", async () => {
    const greyed = (segment: Segment) => ({ ...segment, disabled: true });

    expect(
      await hover(
        'Local',
        [{ ...SERVER, zoneLabel: 'EDT' }, greyed(UTC), greyed(LOCAL)],
        { label: 'EDT', zone: null }
      )
    ).toBe(
      'The server names its zone “EDT”, which gives no rules to convert dates with, summer time included. Set its time zone to a name, such as America/New_York.'
    );
  });
});
