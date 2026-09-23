/**
 * @vitest-environment happy-dom
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeProvider } from 'styled-components';
import { describe, expect, test } from 'vitest';
import { DEFAULT_THEME } from '../../configuration/themes';
import { FieldKind } from '../../sql/resultField';
import Cell from './Cell';

function renderCell(kind: FieldKind, value: unknown): string {
  return renderToStaticMarkup(
    <ThemeProvider theme={DEFAULT_THEME}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Cell kind={kind} value={value as any} />
    </ThemeProvider>
  );
}

describe('JSON cells', () => {
  // mysql2 parses JSON columns (`jsonStrings` is off), so the value reaching
  // the cell is an object: rendering it as-is would throw.
  test('an object is serialized to a compact one-liner', () => {
    expect(renderCell(FieldKind.Json, { a: 1, b: ['x'] })).toContain(
      '{&quot;a&quot;:1,&quot;b&quot;:[&quot;x&quot;]}'
    );
  });

  test('an array is serialized too', () => {
    expect(renderCell(FieldKind.Json, [1, 2])).toContain('>[1,2]<');
  });

  // A JSON column can hold a scalar: `CAST('"foo"' AS JSON)` is parsed by
  // mysql2 into the string `foo`, which must not be re-serialized (it would
  // come back with its quotes).
  test('a JSON scalar is left as-is', () => {
    expect(renderCell(FieldKind.Json, 'foo')).toContain('>foo<');
  });

  test('a long payload is cut down to the readable part', () => {
    const rendered = renderCell(FieldKind.Json, { a: 'x'.repeat(1000) });

    expect(rendered).toContain('\u2026');
    expect(rendered).not.toContain('x'.repeat(1000));
  });
});

/**
 * The three kinds the grid used to throw on, and the two shapes it used to
 * hand React whole. Each blanked the grid: the cell threw, and the error
 * boundary took the table down with it.
 */
describe('a value the grid has no rendering of', () => {
  // a duration has no day to sit on, so mysql2 answers `HH:MM:SS`
  test('a TIME column shows the string it was answered', () => {
    expect(renderCell(FieldKind.Time, '12:34:56')).toContain('>12:34:56<');
  });

  // measured: `BIT(8)` holding b'10101010' answers one byte
  test('a BIT column shows its bytes', () => {
    expect(renderCell(FieldKind.Binary, new Uint8Array([0xaa]))).toContain(
      '>0xAA<'
    );
  });

  // measured: `POINT(1 2)` answers `{ x: 1, y: 2 }`, which React refuses
  test('a GEOMETRY column shows the object it was answered', () => {
    expect(renderCell(FieldKind.Unknown, { x: 1, y: 2 })).toContain(
      '{&quot;x&quot;:1,&quot;y&quot;:2}'
    );
  });

  test('a type nothing here knows still renders', () => {
    expect(renderCell(FieldKind.Unknown, 42)).toContain('>42<');
    expect(renderCell(FieldKind.Boolean, true)).toContain('>true<');
  });
});

describe('the order of the tiers', () => {
  /**
   * The reason the shape is asked before the kind. `TEXT` and `BLOB` are one
   * wire type, so a `BLOB` of a raw query — where no collation correction can
   * reach, a `CAST` having none — arrives with the kind of a text column.
   */
  test('bytes win over a kind that says text', () => {
    const bytes = new Uint8Array([0x62, 0x6c, 0x6f, 0x62]);

    expect(renderCell(FieldKind.Text, bytes)).toContain('>0x626C6F62<');
  });

  test('a long value of bytes is cut down, and says so', () => {
    const rendered = renderCell(
      FieldKind.Binary,
      new Uint8Array(1000).fill(0xff)
    );

    expect(rendered).toContain('\u2026');
    expect(rendered).not.toContain('FF'.repeat(200));
  });

  // the value settles that it is a date; the kind only picks the format
  test('a Date takes its format from the kind', () => {
    const date = new Date(2026, 8, 11, 14, 3, 9);

    expect(renderCell(FieldKind.Date, date)).toContain('>2026-09-11<');
    expect(renderCell(FieldKind.DateTime, date)).toContain(
      '>2026-09-11 14:03:09<'
    );
  });

  // a `VARCHAR` keeps the colour of a string, which a `TEXT` does not have
  test('a string still reads its kind', () => {
    expect(renderCell(FieldKind.String, 'x')).not.toBe(
      renderCell(FieldKind.Text, 'x')
    );
  });
});
