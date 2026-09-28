import { describe, expect, test } from 'vitest';
import { DateDisplay } from '../../configuration/dateDisplay';
import {
  dateDisplayOptions,
  effectiveDateDisplay,
  resolveServerZone,
  zoneShiftOf,
} from './dateZones';

// the names measured on the dev servers, and on a MariaDB whose machine runs in New York
describe('resolveServerZone', () => {
  test.each([
    ['Etc/UTC', false, 'Etc/UTC'],
    ['Europe/Paris', false, 'Europe/Paris'],
    ['+05:30', false, '+05:30'],
    // MySQL's `SYSTEM` on a machine in UTC
    ['UTC', true, 'UTC'],
  ])('%s resolves', (name, isAbbreviation, zone) => {
    expect(resolveServerZone({ name, isAbbreviation })).toEqual({
      label: name,
      zone,
    });
  });

  test.each([
    ['EDT', true],
    // a zone of its own with no summer time, which a New York server named so in winter has
    ['EST', true],
    // London's and Dublin's winter, which Temporal takes for UTC
    ['GMT', true],
    ['localtime', false],
    // POSIX, where UTC+3 is three hours behind
    ['UTC+3', false],
  ])('%s gives no rules to convert with', (name, isAbbreviation) => {
    expect(resolveServerZone({ name, isAbbreviation })).toEqual({
      label: name,
      zone: null,
    });
  });
});

describe('dateDisplayOptions', () => {
  const displays = (zone: string | null, localZone: string) =>
    dateDisplayOptions({ label: zone ?? 'EDT', zone }, localZone).map(
      ({ display, disabled }) => [display, disabled]
    );

  test('a UTC server leaves no UTC segment', () => {
    expect(displays('Etc/UTC', 'Europe/Paris')).toEqual([
      [DateDisplay.Server, false],
      [DateDisplay.Local, false],
    ]);
  });

  test('a server in another zone offers all three', () => {
    expect(displays('America/New_York', 'Europe/Paris')).toEqual([
      [DateDisplay.Server, false],
      [DateDisplay.Utc, false],
      [DateDisplay.Local, false],
    ]);
  });

  test("a machine in the server's zone leaves no local segment", () => {
    expect(displays('Europe/Paris', 'Europe/Paris')).toEqual([
      [DateDisplay.Server, false],
      [DateDisplay.Utc, false],
    ]);
  });

  test('a machine in UTC has its local time in the UTC segment', () => {
    expect(displays('America/New_York', 'UTC')).toEqual([
      [DateDisplay.Server, false],
      [DateDisplay.Utc, false],
    ]);
  });

  test('everything in UTC leaves a single segment', () => {
    expect(displays('+00:00', 'Etc/UTC')).toEqual([
      [DateDisplay.Server, false],
    ]);
  });

  test('without the rules of the server, nothing converts', () => {
    expect(displays(null, 'Europe/Paris')).toEqual([
      [DateDisplay.Server, false],
      [DateDisplay.Utc, true],
      [DateDisplay.Local, true],
    ]);
  });
});

describe('effectiveDateDisplay', () => {
  const options = (displays: Array<[DateDisplay, boolean]>) =>
    displays.map(([display, disabled]) => ({
      display,
      zoneLabel: null,
      disabled,
    }));

  test('a segment on offer is the one shown', () => {
    expect(
      effectiveDateDisplay(
        DateDisplay.Utc,
        options([
          [DateDisplay.Server, false],
          [DateDisplay.Utc, false],
        ])
      )
    ).toBe(DateDisplay.Utc);
  });

  test('local time on a machine in UTC is the UTC segment', () => {
    expect(
      effectiveDateDisplay(
        DateDisplay.Local,
        options([
          [DateDisplay.Server, false],
          [DateDisplay.Utc, false],
        ])
      )
    ).toBe(DateDisplay.Utc);
  });

  test("a segment left out or disabled is the server's", () => {
    expect(
      effectiveDateDisplay(
        DateDisplay.Utc,
        options([[DateDisplay.Server, false]])
      )
    ).toBe(DateDisplay.Server);
    expect(
      effectiveDateDisplay(
        DateDisplay.Local,
        options([
          [DateDisplay.Server, false],
          [DateDisplay.Utc, true],
          [DateDisplay.Local, true],
        ])
      )
    ).toBe(DateDisplay.Server);
  });
});

describe('zoneShiftOf', () => {
  const server = { label: 'America/New_York', zone: 'America/New_York' };

  test("the server's display converts nothing", () => {
    expect(zoneShiftOf(DateDisplay.Server, server, 'Europe/Paris')).toBeNull();
  });

  test("UTC and local time move from the server's zone", () => {
    expect(zoneShiftOf(DateDisplay.Utc, server, 'Europe/Paris')).toEqual({
      from: 'America/New_York',
      to: 'UTC',
    });
    expect(zoneShiftOf(DateDisplay.Local, server, 'Europe/Paris')).toEqual({
      from: 'America/New_York',
      to: 'Europe/Paris',
    });
  });
});
