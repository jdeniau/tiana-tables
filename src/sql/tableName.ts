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

// TODO maybe import a list of reserved keywords ? https://en.wikipedia.org/wiki/List_of_SQL_reserved_words
const FORBIDDEN_ALIASES = [
  'JOIN',
  'INNER',
  'LEFT',
  'RIGHT',
  'FULL',
  'LIMIT',
  'OFFSET',
  'ON',
];
const FORBIDDEN_ALIASES_JOINED = FORBIDDEN_ALIASES.join('|');

const TABLE_NAME_REGEX = new RegExp(
  `(from|join)\\s+(?<database>\\w*\\.)?(?<tablename>\\w+)?\\s*(as\\s+)?(?!${FORBIDDEN_ALIASES_JOINED})(?<alias>\\w+)?`,
  'gi'
);

type Alias = string;
type TableName = string;
/**
 * Extract all table names from the given query.
 * This function does not check that the table exist,
 * but do only extract the table names from the SQL syntax
 */
export function extractTableAliases(sql: string): Record<Alias, TableName> {
  const matches = sql.matchAll(TABLE_NAME_REGEX);

  const arrayMatches = [...matches];

  // console.log(arrayMatches);

  return Object.fromEntries(
    arrayMatches
      .filter((match) => {
        const alias = match.groups?.alias;

        return (
          typeof alias === 'undefined' ||
          (typeof alias === 'string' && !FORBIDDEN_ALIASES.includes(alias))
        );
      })
      .map((match) => [
        match.groups?.alias ?? match.groups?.tablename,
        match.groups?.tablename,
      ])
  );
}
