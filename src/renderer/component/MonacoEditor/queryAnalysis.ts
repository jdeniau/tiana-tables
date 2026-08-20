import { EntityContextType } from 'dt-sql-parser';
import { AttrName } from 'dt-sql-parser/dist/parser/common/entityCollector';
// type-only imports: this module must not pull the editor into the tests
import type { IRange } from 'monaco-editor';
import type { WordRange } from 'monaco-sql-languages';
import { collectEntities, mysqlParser } from '../../../sql/mysqlParser';
import { unquote } from '../../../sql/tableName';

export type SqlSemanticKind = 'table' | 'alias';

export interface SqlSemanticToken {
  readonly kind: SqlSemanticKind;
  readonly range: IRange;
}

export interface UnknownColumn {
  readonly range: IRange;
  readonly table: string;
  readonly column: string;
}

/**
 * What the editor knows of the server, which is the current database only:
 * `getAllColumns` and the table list are both filtered on its schema.
 */
export interface QuerySchema {
  readonly database: string | null;
  readonly tables: ReadonlySet<string>;
  /** table name -> its column names, lowercased since MySQL ignores their case */
  readonly columns: ReadonlyMap<string, ReadonlySet<string>>;
}

/** entity and alias positions share these three fields */
type WordBounds = Pick<WordRange, 'line' | 'startColumn' | 'endColumn'>;

function toRange(word: WordBounds): IRange {
  return {
    startLineNumber: word.line,
    endLineNumber: word.line,
    startColumn: word.startColumn,
    endColumn: word.endColumn,
  };
}

/**
 * The table a `FROM` or `JOIN` name refers to, when we can vouch for it.
 *
 * A name qualified by another database is rejected rather than trusted: we
 * only ever loaded the schema of the current database, so `other_db.employee`
 * cannot be told apart from a typo.
 */
function resolveTable(
  tableNamePath: string,
  schema: QuerySchema
): string | undefined {
  const segments = tableNamePath.split('.').map(unquote);
  const name = segments.at(-1);

  if (!name || (segments.length > 1 && segments.at(-2) !== schema.database)) {
    return undefined;
  }

  return schema.tables.has(name) ? name : undefined;
}

interface Analysis {
  /** table names and aliases, to color */
  readonly semanticTokens: SqlSemanticToken[];
  /** qualified references to a column the table does not have */
  readonly unknownColumns: UnknownColumn[];
}

/**
 * Read a query against the schema.
 *
 * Declarations come from the parsed entities — that is the only place where a
 * name is known to be a table rather than a column. Usages are then found by
 * walking the token stream: a name is a qualifier when a dot follows it, and we
 * already know which qualifiers are tables and which are aliases.
 *
 * Only tables of the schema are reported, so that a typo stays uncolored.
 * Aliases are reported either way: the query declares them itself, no schema
 * needed to tell that `u` in `FROM whatever u` is an alias.
 */
export function analyzeQuery(sql: string, schema: QuerySchema): Analysis {
  const entities = collectEntities(sql).filter(
    (entity) => entity.entityContextType === EntityContextType.TABLE
  );

  const semanticTokens: SqlSemanticToken[] = [];
  const tables = new Set<string>();
  // an alias of an unknown table is still an alias, it just resolves to nothing
  const aliases = new Map<string, string | undefined>();

  for (const entity of entities) {
    const table = resolveTable(entity.text, schema);

    if (table) {
      semanticTokens.push({ kind: 'table', range: toRange(entity.position) });
      tables.add(table);
    }

    const alias = entity[AttrName.alias];

    if (alias) {
      semanticTokens.push({ kind: 'alias', range: toRange(alias) });
      aliases.set(alias.text, table);
    }
  }

  const declarationCount = semanticTokens.length;
  const unknownColumns: UnknownColumn[] = [];

  for (const reference of qualifiedReferences(sql)) {
    const { qualifier, name } = reference;
    const kind = aliases.has(qualifier.text)
      ? 'alias'
      : tables.has(unquote(qualifier.text))
        ? 'table'
        : undefined;

    if (!kind) {
      continue;
    }

    // a declaration may already cover this token — `db1` in `FROM db1.users`
    // is part of the table name — and Monaco drops the whole result when two
    // semantic tokens overlap
    if (
      !isCovered(qualifier.range, semanticTokens.slice(0, declarationCount))
    ) {
      semanticTokens.push({ kind, range: qualifier.range });
    }

    const table =
      kind === 'alias' ? aliases.get(qualifier.text) : unquote(qualifier.text);
    const columns = table ? schema.columns.get(table) : undefined;

    // an empty column list means "not loaded", not "no column"
    if (!table || !columns?.size || !name) {
      continue;
    }

    if (!columns.has(unquote(name.text).toLowerCase())) {
      unknownColumns.push({
        range: name.range,
        table,
        column: unquote(name.text),
      });
    }
  }

  return { semanticTokens, unknownColumns };
}

interface QualifiedReference {
  readonly qualifier: { text: string; range: IRange };
  /** what follows the dot, unless it is `*` or the end of the query */
  readonly name?: { text: string; range: IRange };
}

/** every `qualifier.name` of the query, whatever the names turn out to be */
function qualifiedReferences(sql: string): QualifiedReference[] {
  const tokens = mysqlParser
    .getAllTokens(sql)
    .filter((token) => token.text?.trim());

  const references: QualifiedReference[] = [];

  for (let index = 0; index < tokens.length - 1; index++) {
    const qualifier = tokens[index];
    const dot = tokens[index + 1];

    if (dot.text !== '.' || !qualifier.text) {
      continue;
    }

    const name = tokens[index + 2];
    // the name has to touch the dot: in `SELECT u. FROM users u` the next
    // token is the `FROM` of the clause, not a column the user typed
    const isName =
      name?.text &&
      name.start === dot.start + 1 &&
      /^[A-Za-z_`"[]/.test(name.text);

    references.push({
      qualifier: { text: qualifier.text, range: tokenRange(qualifier) },
      name:
        isName && name.text
          ? { text: name.text, range: tokenRange(name) }
          : undefined,
    });
  }

  return references;
}

function tokenRange(token: {
  line: number;
  column: number;
  text: string | null;
}): IRange {
  return toRange({
    // antlr reports 1-based lines but 0-based columns
    line: token.line,
    startColumn: token.column + 1,
    endColumn: token.column + 1 + (token.text?.length ?? 0),
  });
}

function isCovered(
  range: IRange,
  declarations: ReadonlyArray<SqlSemanticToken>
): boolean {
  return declarations.some(
    ({ range: declared }) =>
      declared.startLineNumber === range.startLineNumber &&
      declared.startColumn <= range.startColumn &&
      range.startColumn < declared.endColumn
  );
}
