import { type EntityContext, EntityContextType } from 'dt-sql-parser';
import { AttrName } from 'dt-sql-parser/dist/parser/common/entityCollector';
import type { DatabaseEngine } from './engine';
import { SQL_RESERVED_KEYWORDS } from './keywords';
import {
  CODE_CHANNEL,
  type SqlParser,
  collectEntities,
  getParser,
} from './parser';

export function generateTableAlias(
  tableName: string,
  usedAliases: Array<string>
): string {
  const isAliasForbidden = (alias: string) =>
    usedAliases.includes(alias) ||
    SQL_RESERVED_KEYWORDS.includes(alias.toUpperCase());

  // detect :
  // - the first letter
  // - letters after a `_`
  // -capital letters after a lowercase letter
  const alias = tableName
    .match(/^[a-zA-Z]|(?<=_)[a-zA-Z]|(?<=[a-z])[A-Z]/g)
    ?.join('')
    .toLowerCase();

  if (!alias) {
    throw new Error(
      `Could not generate alias for ${tableName}. This should not happen.`
    );
  }

  if (!isAliasForbidden(alias)) {
    // alias is not used: perfect, return it
    return alias;
  }

  // main alias already exist, let's try to add characters
  if (alias.length === 1) {
    // if alias is one letter long, add the following lettters
    const tableNameAsArray = tableName.substring(1).split('');
    let newAlias = alias;

    while (
      // alias is still used, add one more letter
      isAliasForbidden(newAlias) &&
      // break if the alias is the table name
      newAlias !== tableName
    ) {
      newAlias += tableNameAsArray.shift();
    }

    if (!isAliasForbidden(newAlias)) {
      // if the alias is not used, return it, else, it does mean that the alias is the table name AND that it is already used !
      return newAlias;
    }
  }

  // if the alias is more than one letter long, or we couldn't make an alias already, add a number at the end
  let newAlias = alias;
  let i = 2;

  while (isAliasForbidden(newAlias)) {
    newAlias = `${alias}_${i}`;
    i++;
  }

  return newAlias;
}

type Alias = string;
type TableName = string;

/** `` `t1` `` and `"t1"` both name the table `t1` */
export function unquote(name: string): string {
  return name.replace(/^[`"[]|[`"\]]$/g, '');
}

/** `db1.t1` and `` `t1` `` both refer to the table `t1` */
function unqualify(tableNamePath: string): TableName {
  return unquote(lastSegment(tableNamePath));
}

/** `` db1.`t1` `` is `` `t1` `` once its database is left out */
function lastSegment(tableNamePath: string): string {
  return tableNamePath.split('.').at(-1) ?? tableNamePath;
}

/**
 * Extract all table names from the given query, indexed by their alias (or by
 * their own name when they have none).
 *
 * This function does not check that the tables exist, it only reads the SQL.
 * Incomplete queries are expected: the parser reports syntax errors instead of
 * throwing, and still returns the entities it managed to resolve.
 */
export function extractTableAliases(
  sql: string,
  engine: DatabaseEngine
): Record<Alias, TableName> {
  return aliasesOf(tableEntities(getParser(engine), sql));
}

/**
 * The tables of a query outside any parenthesis, those of a subquery being out of its scope,
 * by what qualifies their columns: their alias, or their name as written, quotes kept (`"Article".statut`).
 */
export function extractOuterTableAliases(
  sql: string,
  engine: DatabaseEngine
): Record<Alias, TableName> {
  const parser = getParser(engine);
  const parentheses = parser
    .getAllTokens(sql)
    .filter(
      (token) =>
        token.channel === CODE_CHANNEL &&
        (token.text === '(' || token.text === ')')
    );
  const depthAt = (index: number): number =>
    parentheses
      .filter((token) => token.start < index)
      .reduce((depth, token) => depth + (token.text === '(' ? 1 : -1), 0);

  return aliasesOf(
    tableEntities(parser, sql).filter(
      (table) => depthAt(table.position.startIndex) === 0
    ),
    lastSegment
  );
}

function tableEntities(parser: SqlParser, sql: string): Array<EntityContext> {
  return collectEntities(parser, sql).filter(
    (entity) => entity.entityContextType === EntityContextType.TABLE
  );
}

/** by the alias of each table, or by `ownName` of its path when it has none */
function aliasesOf(
  tables: Array<EntityContext>,
  ownName = unqualify
): Record<Alias, TableName> {
  return Object.fromEntries(
    tables.map((table) => {
      const alias = table[AttrName.alias]?.text;

      return [alias ?? ownName(table.text), unqualify(table.text)];
    })
  );
}
