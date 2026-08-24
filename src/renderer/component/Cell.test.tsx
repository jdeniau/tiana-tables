/**
 * @vitest-environment happy-dom
 */
import { Types } from 'mysql';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeProvider } from 'styled-components';
import { describe, expect, test } from 'vitest';
import { DEFAULT_THEME } from '../../configuration/themes';
import Cell from './Cell';

function renderCell(type: number, value: unknown): string {
  return renderToStaticMarkup(
    <ThemeProvider theme={DEFAULT_THEME}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Cell type={type} value={value as any} />
    </ThemeProvider>
  );
}

describe('JSON cells', () => {
  // mysql2 parses JSON columns (`jsonStrings` is off), so the value reaching
  // the cell is an object: rendering it as-is would throw.
  test('an object is serialized to a compact one-liner', () => {
    expect(renderCell(Types.JSON, { a: 1, b: ['x'] })).toContain(
      '{&quot;a&quot;:1,&quot;b&quot;:[&quot;x&quot;]}'
    );
  });

  test('an array is serialized too', () => {
    expect(renderCell(Types.JSON, [1, 2])).toContain('>[1,2]<');
  });

  // A JSON column can hold a scalar: `CAST('"foo"' AS JSON)` is parsed by
  // mysql2 into the string `foo`, which must not be re-serialized (it would
  // come back with its quotes).
  test('a JSON scalar is left as-is', () => {
    expect(renderCell(Types.JSON, 'foo')).toContain('>foo<');
  });

  test('a long payload is cut down to the readable part', () => {
    const rendered = renderCell(Types.JSON, { a: 'x'.repeat(1000) });

    expect(rendered).toContain('\u2026');
    expect(rendered).not.toContain('x'.repeat(1000));
  });
});
