// TODO : handle context where alias is already used
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
