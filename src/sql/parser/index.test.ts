import { afterEach, describe, expect, test, vi } from 'vitest';
import { DatabaseEngine } from '../engine';
import { collectEntities, getParser } from '.';

afterEach(() => {
  vi.restoreAllMocks();
});

describe.each(Object.values(DatabaseEngine))('the %s parser', (engine) => {
  const parser = getParser(engine);
  const unfinished = 'SELECT * FROM users WHERE (';

  // measured: both grammars logged `no viable alternative at input '('`
  test('writes nothing to the console on a query being typed', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    parser.getAllEntities(unfinished);
    collectEntities(parser, unfinished);

    expect(error).not.toHaveBeenCalled();
  });

  test('still reports the syntax errors it is asked for', () => {
    expect(parser.validate(unfinished)).not.toEqual([]);
  });
});
