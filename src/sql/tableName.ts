export function generateTableAlias(
  tableName: string,
  usedAliases: Array<string>
): string {
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

  if (!usedAliases.includes(alias)) {
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
      usedAliases.includes(newAlias) &&
      // break if the alias is the table name
      newAlias !== tableName
    ) {
      newAlias += tableNameAsArray.shift();
    }

    if (!usedAliases.includes(newAlias)) {
      // if the alias is not used, return it, else, it does mean that the alias is the table name AND that it is already used !
      return newAlias;
    }
  }

  // if the alias is more than one letter long, or we couldn't make an alias already, add a number at the end
  let newAlias = alias;
  let i = 2;

  while (usedAliases.includes(newAlias)) {
    newAlias = `${alias}_${i}`;
    i++;
  }

  return newAlias;
}

const FORBIDDEN_ALIASES = ['JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL'];
const FORBIDDEN_ALIASES_JOINED = FORBIDDEN_ALIASES.join('|');

const TABLE_NAME_REGEX = new RegExp(
  `(from|join)\\s+(?<database>\\w*\\.)?(?<tablename>\\w+)?\\s*(as\\s+)?(?!${FORBIDDEN_ALIASES_JOINED})(?<alias>\\w+)?`,
  'gi'
);

/**
 * Extract all table names from the given query.
 * This function does not check that the table exist,
 * but do only extract the table names from the SQL syntax
 */
export function extractTableNames(
  sql: string
): Array<{ tableName: string; alias: string | undefined }> {
  // TODO add "alias" to the return type
  const matches = sql.matchAll(TABLE_NAME_REGEX);

  const arrayMatches = [...matches];

  // console.log(arrayMatches);

  return arrayMatches
    .map((m) => ({ tableName: m.groups?.tablename, alias: m.groups?.alias }))
    .filter(
      (m): m is { tableName: string; alias: string | undefined } =>
        typeof m.tableName === 'string'
    );
}

export function extractTableAliases(sql: string): Array<string> {
  const matches = sql.matchAll(TABLE_NAME_REGEX);

  const arrayMatches = [...matches];

  // console.log(arrayMatches);

  return arrayMatches
    .map((m) => m.groups?.alias)
    .filter(
      (m): m is string =>
        typeof m === 'string' && !FORBIDDEN_ALIASES.includes(m)
    );
}
