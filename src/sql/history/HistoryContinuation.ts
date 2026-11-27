import type { DatabaseEngine } from '../engine';
import { CODE_CHANNEL, type SqlToken, getParser } from '../parser';
import {
  extractOuterTableAliases,
  generateTableAlias,
  unquote,
} from '../tableName';
import { joinedTable, qualifiers } from './HistoryUsage';
import { namesBareColumn, tablesOf, wordsOf } from './bareColumn';
import {
  Clause,
  type HistoryBlock,
  type QueryHistoryContent,
} from './recordedStatement';
import { clauseStarts } from './toRecordedStatement';

/** the words a clause opens on, `JOIN` whatever its modifiers */
const OPENING_WORDS: ReadonlyMap<string, Clause> = new Map([
  ['FROM', Clause.From],
  ['JOIN', Clause.Join],
  ['STRAIGHT_JOIN', Clause.Join],
  ['WHERE', Clause.Where],
  ['GROUP BY', Clause.GroupBy],
  ['HAVING', Clause.Having],
  ['ORDER BY', Clause.OrderBy],
  ['LIMIT', Clause.Limit],
]);

/** the words before a `JOIN` that make it take no `ON`: no join of the history follows one, nor is one */
const JOINS_WITHOUT_CONDITION: ReadonlySet<string> = new Set([
  'NATURAL',
  'CROSS',
]);

/** the words that may stand between `NATURAL` and its `JOIN` */
const JOIN_SIDES: ReadonlySet<string> = new Set([
  'LEFT',
  'RIGHT',
  'FULL',
  'INNER',
  'OUTER',
]);

const BLANK = /\s/;

/** a clause of the history, with what the query must hold for it to be proposed */
type Candidate = {
  block: HistoryBlock;
  /** the table a `JOIN` brings, which the query must not hold yet */
  joined: string | undefined;
  /** the tables its columns belong to, which the query must hold */
  reads: ReadonlySet<string>;
  /** whether it names a column without its table, which only the same tables, each read once, keep unambiguous */
  exact: boolean;
};

/**
 * What the history would type next, up to the end of the clause: the ghost text of the editor.
 * A text that ran and starts as typed comes first, the most run clause opened by the typed words after it.
 */
export class HistoryContinuation {
  private readonly runs: ReadonlyArray<string>;

  /** the runs as `endOfPrefix` compares them, to skip at once those that cannot match */
  private readonly comparableRuns: ReadonlyArray<string>;

  private readonly candidates: ReadonlyArray<Candidate>;

  constructor({ runs, blocks }: QueryHistoryContent) {
    this.runs = runs;
    this.comparableRuns = runs.map(comparable);
    this.candidates = blocks.flatMap((block): Array<Candidate> => {
      const words = wordsOf(block.shape);
      const tables = tablesOf(block.aliases);

      if (block.clause === Clause.From) {
        return [{ block, joined: undefined, reads: new Set(), exact: false }];
      }

      // a self-join: the shape no longer tells which copy each alias stood for
      if (tables.size !== Object.keys(block.aliases).length) {
        return [];
      }

      const exact = namesBareColumn(words, tables, block.shape.split(' '));

      if (block.clause === Clause.Join) {
        if (JOINS_WITHOUT_CONDITION.has(words[0]?.toUpperCase() ?? '')) {
          return [];
        }

        const joined = joinedTable(words, tables);

        return [
          {
            block,
            joined,
            // `USING ( commande_id )` names columns that only the tables of its statement hold
            reads: (exact ? tables : qualifiers(words, tables)).difference(
              new Set([joined])
            ),
            exact,
          },
        ];
      }

      return [
        {
          block,
          joined: undefined,
          reads:
            exact || tables.size === 1 ? tables : qualifiers(words, tables),
          exact,
        },
      ];
    });
  }

  /** the rest of the clause `typed` ends in, the statement from its start to the caret */
  after(typed: string, engine: DatabaseEngine): string | null {
    // a text that ran starts at its first word, without the comments above it
    const start = codeTokens(typed, engine)[0]?.start;

    if (start === undefined) {
      return null;
    }

    const code = typed.slice(start);

    return this.fromRuns(code, engine) ?? this.fromBlocks(code, engine);
  }

  private fromRuns(typed: string, engine: DatabaseEngine): string | null {
    const prefix = comparable(typed);

    for (const [index, run] of this.runs.entries()) {
      if (!this.comparableRuns[index]?.startsWith(prefix)) {
        continue;
      }

      const end = endOfPrefix(run, typed);

      if (end !== -1 && run.slice(end).trim() !== '') {
        const firstWord = skipBlanks(run, end);
        const next = clauseStarts(run, engine).find(
          (start) => start > firstWord
        );

        return run.slice(end, next).trimEnd();
      }
    }

    return null;
  }

  private fromBlocks(typed: string, engine: DatabaseEngine): string | null {
    const words = codeTokens(typed, engine).map(upperCase);
    const clause = openedClause(words);

    if (
      clause === undefined ||
      (clause === Clause.Join && takesNoCondition(words)) ||
      !BLANK.test(typed.at(-1) ?? '') ||
      words[0] !== 'SELECT' ||
      depthAtEnd(words) !== 0
    ) {
      return null;
    }

    const aliases = extractOuterTableAliases(typed, engine);
    const tables = tablesOf(aliases);
    const readsEachOnce = tables.size === Object.keys(aliases).length;

    for (const { block, joined, reads, exact } of this.candidates) {
      if (
        block.clause === clause &&
        reads.isSubsetOf(tables) &&
        (!exact || (readsEachOnce && tables.isSubsetOf(reads))) &&
        (joined === undefined || !tables.has(joined))
      ) {
        const text = rewrite(block, joined, aliases, engine);

        if (text !== null) {
          return text;
        }
      }
    }

    return null;
  }
}

/** where `typed` ends in `run`, whatever their case and however long their blanks, `-1` when the run does not start with it */
function endOfPrefix(run: string, typed: string): number {
  let position = 0;
  let index = 0;

  while (index < typed.length) {
    const character = typed.charAt(index);

    if (BLANK.test(character)) {
      if (!BLANK.test(run.charAt(position))) {
        return -1;
      }

      index = skipBlanks(typed, index);
      position = skipBlanks(run, position);
    } else if (character.toLowerCase() === run.charAt(position).toLowerCase()) {
      index++;
      position++;
    } else {
      return -1;
    }
  }

  return position;
}

/** a text whatever its case and however long its blanks, as `endOfPrefix` reads it */
function comparable(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ');
}

function skipBlanks(text: string, from: number): number {
  let index = from;

  while (BLANK.test(text.charAt(index))) {
    index++;
  }

  return index;
}

function codeTokens(sql: string, engine: DatabaseEngine): Array<SqlToken> {
  return getParser(engine)
    .getAllTokens(sql)
    .filter((token) => token.channel === CODE_CHANNEL);
}

function upperCase(token: SqlToken): string {
  return (token.text ?? '').toUpperCase();
}

/** whether the `JOIN` the words end on is a `NATURAL` or a `CROSS` one */
function takesNoCondition(words: ReadonlyArray<string>): boolean {
  let index = words.length - 2;

  while (JOIN_SIDES.has(words[index] ?? '')) {
    index--;
  }

  return JOINS_WITHOUT_CONDITION.has(words[index] ?? '');
}

/** the clause the words end by opening: `JOIN` after `LEFT`, `BY` after `ORDER` */
function openedClause(words: ReadonlyArray<string>): Clause | undefined {
  return (
    OPENING_WORDS.get(words.at(-1) ?? '') ??
    OPENING_WORDS.get(words.slice(-2).join(' '))
  );
}

/** how many parentheses are still open: a subquery has its own tables */
function depthAtEnd(words: ReadonlyArray<string>): number {
  return words.reduce(
    (depth, word) => depth + (word === '(' ? 1 : word === ')' ? -1 : 0),
    0
  );
}

/** the block past its opening words, its columns qualified by the aliases of the query, `null` when one has none */
function rewrite(
  block: HistoryBlock,
  joined: string | undefined,
  aliases: Record<string, string>,
  engine: DatabaseEngine
): string | null {
  const tokens = codeTokens(block.sql, engine);
  const words = tokens.map(upperCase);
  const start =
    words.findIndex(
      (word, index) => openedClause(words.slice(0, index + 1)) === block.clause
    ) + 1;
  const first = tokens[start];

  if (start === 0 || first === undefined) {
    return null;
  }

  const tableOf = new Map(
    Object.entries(block.aliases).map(([alias, table]) => [
      alias,
      table.toLowerCase(),
    ])
  );
  // a table the query reads twice keeps the alias it first had
  const aliasOf = new Map(
    Object.entries(aliases)
      .reverse()
      .map(([alias, table]) => [table.toLowerCase(), alias])
  );

  // `JOIN blog . auteur au`: the alias follows the last part of the name
  const name = words[start + 1] === '.' ? start + 2 : start;
  const declaration = words[name + 1] === 'AS' ? name + 2 : name + 1;
  const declared = unquote(tokens[declaration]?.text ?? '');
  let joinedAlias: string | undefined;

  if (joined !== undefined && tableOf.get(declared) === joined) {
    // the query may already use that alias for another table
    joinedAlias = Object.hasOwn(aliases, declared)
      ? generateTableAlias(joined, Object.keys(aliases))
      : declared;
  }

  let text = '';
  let from = first.start;

  for (const [index, token] of tokens.entries()) {
    const word = unquote(token.text ?? '');
    const table = tableOf.get(word);
    let replacement: string | undefined;

    if (index < start || table === undefined) {
      continue;
    } else if (index === declaration && joinedAlias !== undefined) {
      replacement = joinedAlias;
    } else if (words[index + 1] !== '.') {
      continue;
    } else if (words[index - 1] === '.') {
      // `blog.article.id`: an alias cannot take the database with it
      return null;
    } else if (table === joined) {
      replacement = joinedAlias ?? word;
    } else {
      replacement = aliasOf.get(table);

      if (replacement === undefined) {
        return null;
      }
    }

    text += block.sql.slice(from, token.start) + replacement;
    from = token.stop + 1;
  }

  return (text + block.sql.slice(from)).trimEnd();
}
