import { describe, expect, test } from 'vitest';
import { MAX_PANEL_PERCENT, formatPanelSize, parsePanelSize } from './panels';

describe('formatPanelSize', () => {
  test('keeps one decimal', () => {
    expect(formatPanelSize(33.333333)).toBe('33.3%');
    expect(formatPanelSize(40)).toBe('40%');
  });

  test('never lets a panel take more than the maximum share', () => {
    expect(formatPanelSize(95)).toBe(`${MAX_PANEL_PERCENT}%`);
  });

  test('never goes negative', () => {
    expect(formatPanelSize(-10)).toBe('0%');
  });
});

describe('parsePanelSize', () => {
  test('reads back a percentage', () => {
    expect(parsePanelSize('32.5%')).toBe('32.5%');
  });

  test('bounds a percentage that is out of range', () => {
    expect(parsePanelSize('320%')).toBe(`${MAX_PANEL_PERCENT}%`);
  });

  // an earlier build stored pixels as bare numbers: read as a percentage they
  // would blow the panel up over its whole splitter
  test('ignores a value with no unit', () => {
    expect(parsePanelSize(389)).toBeUndefined();
    expect(parsePanelSize('389')).toBeUndefined();
  });

  test('ignores anything unreadable', () => {
    expect(parsePanelSize(undefined)).toBeUndefined();
    expect(parsePanelSize('')).toBeUndefined();
    expect(parsePanelSize('200px')).toBeUndefined();
    expect(parsePanelSize('%')).toBeUndefined();
  });
});
