import { describe, expect, test } from 'vitest';
import {
  type EditorStep,
  type Line,
  QUERY,
  STEPS,
  TokenKind,
  linesOf,
} from './editorScript';

/** A line as text: `|` for the caret, `~ ` before a line the ghost text adds, `[…]` around the ghost text */
function show(lines: Array<Line>): Array<string> {
  return lines.map((line) => {
    const texts = line.pieces.map(({ text, ghost }) =>
      ghost ? `[${text}]` : text
    );
    if (line.caret !== null) {
      texts.splice(line.caret, 0, '|');
    }
    return (line.ghost ? '~ ' : '') + texts.join('').replaceAll('][', '');
  });
}

const typedUpTo = (text: string, ghost = ''): EditorStep => ({
  typed: text.length,
  ghost: ghost.length,
  suggest: false,
  key: null,
  hold: 0,
});

describe('the drawn editor', () => {
  test('starts on the ghost text of the JOIN, on a line of its own', () => {
    expect(show(linesOf(STEPS[0]!))).toEqual([
      'SELECT *',
      'FROM commentaire c|',
      '~ [JOIN article a ON a.id = c.article_id]',
    ]);
  });

  test('colours the ghost text by its grammar only', () => {
    const [, , join] = linesOf(STEPS[0]!);

    expect(join?.pieces.map(({ text, kind }) => [text, kind])).toEqual([
      ['JOIN', TokenKind.Keyword],
      [' article a ', TokenKind.Plain],
      ['ON', TokenKind.Keyword],
      [' a.id = c.article_id', TokenKind.Plain],
    ]);
  });

  test('writes with each Tab the ghost text it showed', () => {
    const tabs = STEPS.flatMap((step, index) => {
      const before = STEPS.at(index - 1)!;
      return step.key === 'Tab' ? [QUERY.slice(before.typed, step.typed)] : [];
    });

    expect(tabs).toEqual([
      'commentaire c',
      '\nJOIN article a ON a.id = c.article_id',
      "\nWHERE a.statut = 'publie'",
    ]);
    STEPS.forEach((step, index) => {
      const before = STEPS.at(index - 1)!;
      if (before.ghost) {
        expect(step.typed).toBe(before.typed + before.ghost);
      }
    });
  });

  test('opens the completion list once FROM is typed, and nowhere else', () => {
    expect(
      STEPS.filter(({ suggest }) => suggest).map((step) => show(linesOf(step)))
    ).toEqual([['SELECT *', 'FROM |']]);
  });

  test('colours a word once it is typed whole', () => {
    const kindOfFirst = (typed: string): TokenKind | undefined =>
      linesOf(typedUpTo(typed))[0]?.pieces[0]?.kind;

    expect(kindOfFirst('SEL')).toBe(TokenKind.Plain);
    expect(kindOfFirst('SELECT')).toBe(TokenKind.Keyword);
  });

  test('puts the caret in the empty editor, and on the new line after a line break', () => {
    expect(show(linesOf(typedUpTo('')))).toEqual(['|']);
    expect(show(linesOf(typedUpTo('SELECT *\n')))).toEqual(['SELECT *', '|']);
  });

  test('keeps the ghost text apart from the text typed before it on its line', () => {
    const typed = 'SELECT *\nFROM commentaire c\nJOIN article a ON a.';

    expect(show(linesOf(typedUpTo(typed, 'id')))[2]).toBe(
      'JOIN article a ON a.|[id]'
    );
  });
});
