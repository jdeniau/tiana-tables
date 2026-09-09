import { describe, expect, test } from 'vitest';
import { ConnectionColorKind } from '../../configuration/connectionColor';
import { AccentSlot } from '../../configuration/palettes/types';
import { AppTheme } from '../../configuration/themes';
import { resolveConnectionTint } from './connectionTint';

const dark: AppTheme = {
  name: 'test dark',
  variant: 'dark',
  palette: {
    base00: '#000000',
    base01: '#111111',
    base02: '#222222',
    base03: '#333333',
    base04: '#444444',
    base05: '#555555',
    base06: '#666666',
    base07: '#ffffff',
    base08: '#ff5555',
    base09: '#ffb86c',
    base0A: '#f1fa8c',
    base0B: '#50fa7b',
    base0C: '#8be9fd',
    base0D: '#bd93f9',
    base0E: '#ff79c6',
    base0F: '#6272a4',
  },
};

describe('resolveConnectionTint', () => {
  test('a connection without a colour is not tinted', () => {
    expect(resolveConnectionTint(undefined, dark)).toBeUndefined();
  });

  test('a palette colour is read from the theme, so it follows it', () => {
    expect(
      resolveConnectionTint(
        { kind: ConnectionColorKind.Palette, slot: 'base08' },
        dark
      )
    ).toEqual({
      background: '#ff5555',
      text: '#000000',
      muted: 'color-mix(in srgb, #000000 70%, #ff5555)',
    });
  });

  test('a light fill takes the background as its text, a dark one the emphasis colour', () => {
    const light = resolveConnectionTint(
      { kind: ConnectionColorKind.Custom, hex: '#f1fa8c' },
      dark
    );
    const shadow = resolveConnectionTint(
      { kind: ConnectionColorKind.Custom, hex: '#1a1a2e' },
      dark
    );

    expect(light?.text).toBe('#000000');
    expect(shadow?.text).toBe('#ffffff');
  });

  test('the text is picked against the palette, not against black and white', () => {
    // on a light theme the two extremes are swapped: base00 is the pale one
    const paper: AppTheme = {
      ...dark,
      variant: 'light',
      palette: { ...dark.palette, base00: '#ffffff', base07: '#322d34' },
    };

    expect(
      resolveConnectionTint(
        { kind: ConnectionColorKind.Custom, hex: '#f1fa8c' },
        paper
      )?.text
    ).toBe('#322d34');
  });

  test('a three-digit hex is accepted', () => {
    expect(
      resolveConnectionTint(
        { kind: ConnectionColorKind.Custom, hex: '#fff' },
        dark
      )?.text
    ).toBe('#000000');
  });

  test.each([
    ['a colour that is not hexadecimal', 'red'],
    ['a hex without its hash', 'ff5555'],
    ['an empty value', ''],
  ])('%s leaves the frame untinted', (_label, hex) => {
    expect(
      resolveConnectionTint({ kind: ConnectionColorKind.Custom, hex }, dark)
    ).toBeUndefined();
  });

  test('a slot the palette does not hold leaves the frame untinted', () => {
    expect(
      resolveConnectionTint(
        { kind: ConnectionColorKind.Palette, slot: 'base10' as AccentSlot },
        dark
      )
    ).toBeUndefined();
  });
});
