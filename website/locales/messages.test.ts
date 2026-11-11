import { IntlMessageFormat } from 'intl-messageformat';
import { describe, expect, test } from 'vitest';
import de from './de';
import en from './en';
import es from './es';
import fr from './fr';
import ja from './ja';
import ptBr from './pt-BR';
import type { SiteMessages } from './type';
import zhCn from './zh-CN';

const TRANSLATIONS: Array<[locale: string, messages: SiteMessages]> = [
  ['de', de],
  ['es', es],
  ['fr', fr],
  ['ja', ja],
  ['pt-BR', ptBr],
  ['zh-CN', zhCn],
];

/** Each message by its key, a list giving one per item: `editor.items.0` */
function flatten(
  messages: SiteMessages
): Array<[key: string, message: string]> {
  return Object.entries(messages).flatMap(([key, message]) =>
    typeof message === 'string'
      ? [[key, message]]
      : message.map((item, index): [string, string] => [
          `${key}.${index}`,
          item,
        ])
  );
}

/** What a translation keeps of a message: its arguments, its links, and the code it quotes */
function skeleton(message: string, locale: string): Array<string> {
  const kept: Array<string> = [];
  // the formatter reads each argument and each tag's function from the values: the proxy records them
  const values = new Proxy<Record<string, unknown>>(
    {},
    {
      has: () => true,
      get: (_values, name) => {
        if (name === 'code') {
          return (chunks: Array<string>) => {
            kept.push(`<code>${chunks.join('')}</code>`);
            return '';
          };
        }
        if (name === 'link') {
          return () => {
            kept.push('<link>');
            return '';
          };
        }
        kept.push(`{${String(name)}}`);
        return 1;
      },
    }
  );
  new IntlMessageFormat(message, locale).format(values);
  return kept.sort();
}

/** A message the ICU parser refuses is shown raw, `{count, number}` and all, and nothing else says so */
describe.each([['en', en], ...TRANSLATIONS])(
  'every %s message',
  (locale, messages) => {
    test.each(flatten(messages))('%s parses', (_key, message) => {
      expect(() => new IntlMessageFormat(message, locale)).not.toThrow();
    });
  }
);

describe.each(TRANSLATIONS)('the %s messages', (locale, messages) => {
  test('hold the items of every English list', () => {
    expect(flatten(messages).map(([key]) => key)).toEqual(
      flatten(en).map(([key]) => key)
    );
  });

  const translated = new Map(flatten(messages));
  test.each(flatten(en))(
    '%s keeps the arguments, links and code of English',
    (key, message) => {
      expect(skeleton(translated.get(key) ?? '', locale)).toEqual(
        skeleton(message, 'en')
      );
    }
  );
});
