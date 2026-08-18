import { EntityContext, EntityContextType, MySQL } from 'dt-sql-parser';
import { AttrName } from 'dt-sql-parser/dist/parser/common/entityCollector';
import { SQL_RESERVED_KEYWORDS } from './keywords';

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

// the parser holds no state between calls, so a single instance is enough
const parser = new MySQL();

/** `db1.t1` and `` `t1` `` both refer to the table `t1` */
function unqualify(tableNamePath: string): TableName {
  const lastSegment = tableNamePath.split('.').at(-1) ?? tableNamePath;

  return lastSegment.replace(/^[`"[]|[`"\]]$/g, '');
}

/** an incomplete clause is a few tokens long, no need to trim further */
const MAX_TRIM_ATTEMPTS = 8;

/**
 * Collect the entities of a query, tolerating an unfinished tail.
 *
 * Entity collection is all or nothing: as soon as the statement has a syntax
 * error, ANTLR cannot pick an alternative for the enclosing rule and drops the
 * whole subtree, so `getAllEntities` returns nothing — not even the tables
 * written before the error. That is exactly what the editor sends while the
 * user is still typing (`… JOIN `, `… WHERE x = `, `… ORDER BY `), so retry on
 * shorter prefixes, dropping the trailing token each time.
 *
 * Lexing, on the other hand, never fails, which is what gives us the token
 * boundaries to cut on.
 */
function collectEntities(sql: string): EntityContext[] {
  let candidate = sql;

  for (let attempt = 0; attempt <= MAX_TRIM_ATTEMPTS; attempt++) {
    const entities = parser.getAllEntities(candidate);

    if (entities?.length) {
      return entities;
    }

    const lastToken = parser
      .getAllTokens(candidate)
      .filter((token) => token.text?.trim())
      .at(-1);

    const shorter = lastToken ? candidate.slice(0, lastToken.start) : '';

    if (shorter.length >= candidate.length) {
      break;
    }

    candidate = shorter;

    if (!candidate.trim()) {
      break;
    }
  }

  return [];
}

/**
 * Extract all table names from the given query, indexed by their alias (or by
 * their own name when they have none).
 *
 * This function does not check that the tables exist, it only reads the SQL.
 * Incomplete queries are expected: the parser reports syntax errors instead of
 * throwing, and still returns the entities it managed to resolve.
 */
export function extractTableAliases(sql: string): Record<Alias, TableName> {
  const tables = collectEntities(sql).filter(
    (entity) => entity.entityContextType === EntityContextType.TABLE
  );

  return Object.fromEntries(
    tables.map((table) => {
      const tableName = unqualify(table.text);
      const alias = table[AttrName.alias]?.text;

      return [alias ?? tableName, tableName];
    })
  );
}
