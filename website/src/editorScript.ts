/** How the editor colours a word: its class in the drawn window, `Plain` for none. */
export enum TokenKind {
  Keyword = 'keyword',
  Table = 'table-name',
  Alias = 'alias',
  String = 'string',
  Plain = '',
}

const KEYWORDS = new Set(['SELECT', 'FROM', 'JOIN', 'ON', 'WHERE']);
const TABLES = new Set(['article', 'commentaire']);
const ALIASES = new Set(['a', 'c']);

/** What the history writes in the drawn editor: `SELECT *` and `FROM ` typed, the rest in three Tabs. */
export const QUERY =
  "SELECT *\nFROM commentaire c\nJOIN article a ON a.id = c.article_id\nWHERE a.statut = 'publie'";

/** The tables the completion lists after `FROM`: the most read first, then the alphabetical order. */
export const TABLES_BY_USE = [
  'commentaire',
  'article',
  'lecture',
  'abonnement',
  'article_media',
  'article_revision',
  'article_tag',
  'auteur',
];

/** One state of the drawn editor. */
export interface EditorStep {
  /** how many characters of `QUERY` are typed */
  typed: number;
  /** how many characters past those show as ghost text */
  ghost: number;
  /** whether the completion list is open at the caret */
  suggest: boolean;
  /** the key pressed to reach this step */
  key: string | null;
  /** how long the step shows, in ms */
  hold: number;
}

/** A run of text of one colour, `ghost` when the editor only proposes it. */
export interface Piece {
  text: string;
  kind: TokenKind;
  ghost: boolean;
}

/** A line of the drawn editor; a `ghost` line is one the ghost text adds, without a number. */
export interface Line {
  pieces: Array<Piece>;
  /** how many pieces of the line stand before the caret, `null` when it is on another line */
  caret: number | null;
  ghost: boolean;
}

const TYPED = 'SELECT *\nFROM '.length;
const JOIN_START = QUERY.indexOf('\nJOIN');
const WHERE_START = QUERY.indexOf('\nWHERE');
const TAB = 'Tab';

function step(
  typed: number,
  ghostEnd: number,
  hold: number,
  { suggest = false, key = null }: Partial<EditorStep> = {}
): EditorStep {
  return { typed, ghost: ghostEnd - typed, suggest, key, hold };
}

/** The step the page is built with, and the loop starts from: the ghost text of the `JOIN`. */
const START = step(JOIN_START, WHERE_START, 1800, { key: TAB });

/** The loop the drawn editor plays. */
export const STEPS: ReadonlyArray<EditorStep> = [
  START,
  step(WHERE_START, QUERY.length, 1800, { key: TAB }),
  step(QUERY.length, QUERY.length, 2600, { key: TAB }),
  step(0, 0, 700),
  ...Array.from({ length: TYPED }, (_, index) =>
    step(index + 1, index + 1, QUERY[index] === '\n' ? 220 : 90)
  ),
  step(TYPED, TYPED, 2200, { suggest: true }),
];

export function stepAt(index: number): EditorStep {
  return STEPS[index] ?? START;
}

/** A word, a run of spaces, a quoted string, or anything else up to the next of these. */
const TOKEN = /'[^']*'|\w+|\s+|[^\w\s']+/g;

function kindOf(token: string): TokenKind {
  if (KEYWORDS.has(token)) {
    return TokenKind.Keyword;
  }
  if (TABLES.has(token)) {
    return TokenKind.Table;
  }
  if (ALIASES.has(token)) {
    return TokenKind.Alias;
  }
  return token.startsWith("'") ? TokenKind.String : TokenKind.Plain;
}

/** The ghost text is coloured by the grammar alone: a table or an alias shows once written. */
const GHOST_KINDS = new Set([TokenKind.Keyword, TokenKind.String]);

/** The lines the editor shows at `step`: a word half typed is not coloured yet. */
export function linesOf({ typed, ghost }: EditorStep): Array<Line> {
  let line: Line = { pieces: [], caret: null, ghost: false };
  const lines = [line];
  const add = (text: string, kind: TokenKind, isGhost: boolean): void => {
    for (const [index, part] of text.split('\n').entries()) {
      if (index > 0) {
        line = { pieces: [], caret: null, ghost: isGhost };
        lines.push(line);
      }
      const last = line.pieces.at(-1);
      if (last && last.kind === kind && last.ghost === isGhost) {
        last.text += part;
      } else if (part) {
        line.pieces.push({ text: part, kind, ghost: isGhost });
      }
    }
  };

  for (const match of QUERY.matchAll(TOKEN)) {
    const [token] = match;
    const start = match.index;
    const end = start + token.length;
    const kind = kindOf(token);

    if (start < typed) {
      add(
        token.slice(0, typed - start),
        end <= typed ? kind : TokenKind.Plain,
        false
      );
    }
    if (start <= typed && typed < end) {
      line.caret = line.pieces.length;
    }
    if (end > typed && start < typed + ghost) {
      add(
        token.slice(Math.max(typed - start, 0), typed + ghost - start),
        GHOST_KINDS.has(kind) ? kind : TokenKind.Plain,
        true
      );
    }
  }
  if (typed === QUERY.length) {
    line.caret = line.pieces.length;
  }

  return lines;
}
