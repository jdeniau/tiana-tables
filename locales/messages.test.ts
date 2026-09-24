import { IntlMessageFormat } from 'intl-messageformat';
import { describe, expect, test } from 'vitest';
import en from './en';
import fr from './fr';

/**
 * A message the ICU parser refuses is shown raw, `{mode, select, …}` and all,
 * and nothing else says so: a hyphen in a `select` key did exactly that.
 */
describe.each([
  ['en', en],
  ['fr', fr],
])('every %s message', (locale, messages) => {
  test.each(Object.entries(messages))('%s parses', (_key, message) => {
    expect(() => new IntlMessageFormat(message, locale)).not.toThrow();
  });
});
