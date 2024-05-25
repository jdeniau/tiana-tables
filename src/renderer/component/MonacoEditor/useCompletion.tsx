import { useEffect } from 'react';
import {
  CancellationToken,
  Position,
  Range,
  editor,
  languages,
} from 'monaco-editor/esm/vs/editor/editor.api';
import invariant from 'tiny-invariant';
import { useAllColumnsContext } from '../../../contexts/AllColumnsContext';
import { useForeignKeysContext } from '../../../contexts/ForeignKeysContext';
import { useTableListContext } from '../../../contexts/TableListContext';
import { ColumnDetailHelper } from '../../../sql/ColumnDetailHelper';
import { ForeignKeysHelper } from '../../../sql/ForeignKeysHelper';
import {
  extractTableAliases,
  generateTableAlias,
} from '../../../sql/tableName';
import { ShowTableStatus } from '../../../sql/types';

const SQL_KEYWORDS = [
  'SELECT',
  'FROM',
  'WHERE',
  'AND',
  'OR',
  'JOIN',
  'LEFT JOIN',
  'RIGHT JOIN',
  'INNER JOIN',
  'ON',
  'LIMIT',
];

function provideCompletionItems(
  languages: typeof import('monaco-editor/esm/vs/editor/editor.api').languages,
  tableList: ShowTableStatus[],
  foreignKeys: ForeignKeysHelper,
  allColumns: ColumnDetailHelper
): languages.CompletionItemProvider['provideCompletionItems'] {
  return (
    model: editor.ITextModel,
    position: Position,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: languages.CompletionContext,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _token: CancellationToken
  ) => {
    // console.log(model, position);

    const sql = model.getValue();

    const tableAliases = extractTableAliases(sql);

    // const hasFromBefore = textUntilPosition.match(/FROM\s*$/i);
    const isAfterFromOrJoin = model.findMatches(
      '(from|join)\\s+(?<database>\\w*\\.)?(?<tablename>\\w+)?$', // searchString
      {
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      }, // searchOnlyEditableRange
      true, // isRegex
      false, // matchCase
      null, // wordSeparators
      true, // captureMatches
      1 // limitResultCount
    )?.[0];

    if (isAfterFromOrJoin) {
      const { matches, range } = isAfterFromOrJoin;

      const textUntilPosition = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });

      invariant(matches, 'matches should be defined');

      const fullLength = matches[0]?.length ?? 0;
      const tableLength = matches[3]?.length ?? 0;
      const startColumn = range.startColumn + fullLength - tableLength;

      const usedAliases: string[] = Object.keys(
        extractTableAliases(textUntilPosition)
      );
      // adapter here, but we could modiy `getLinkBetweenTables` directly
      // the new type may be Record<Alias extends string, TableName extends string>
      const usedTables: Array<{
        tableName: string;
        alias: string | undefined;
      }> = Object.entries(extractTableAliases(textUntilPosition)).map(
        ([alias, tablename]) => ({ tableName: tablename, alias })
      );

      return {
        suggestions: tableList.map((table) => {
          const alias = generateTableAlias(table.Name, usedAliases);

          const fk = foreignKeys.getLinkBetweenTables(table.Name, usedTables);

          const joinString = fk
            ? `ON ${alias}.${fk.referencedColumnName} = ${fk.alias || fk.referencedTableName}.${fk.columnName} `
            : '';

          const insertText = `${table.Name} ${alias} ${joinString}`;

          return {
            label: table.Name,
            detail: fk?.referencedTableName ?? undefined,
            kind: languages.CompletionItemKind.Variable,
            insertText,
            range: new Range(
              range.startLineNumber,
              startColumn,
              position.lineNumber,
              position.column
            ),
          };
        }),
      };
    }

    const isAfterDot = model.findMatches(
      '(?<alias>\\w*)\\.$', // searchString
      {
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      }, // searchOnlyEditableRange
      true, // isRegex
      false, // matchCase
      null, // wordSeparators
      true, // captureMatches
      1 // limitResultCount
    )?.[0];

    if (isAfterDot) {
      const { matches, range } = isAfterDot;

      invariant(matches, 'matches should be defined');

      const tableOrAlias = matches[1];

      const tablename = tableAliases[tableOrAlias];

      const columns = allColumns
        .getColumnsForTable(tablename)
        .map((c) => c.Column);

      const startColumn = range.startColumn + tableOrAlias.length + 1;

      return {
        suggestions: columns.map((column) => ({
          label: column,
          insertText: column,
          kind: languages.CompletionItemKind.Field,
          detail: tablename,
          range: new Range(
            range.startLineNumber,
            startColumn,
            position.lineNumber,
            position.column
          ),
        })),
      };
    }

    const defaultRange = new Range(
      position.lineNumber,
      position.column - 1,
      position.lineNumber,
      position.column
    );

    return {
      suggestions: SQL_KEYWORDS.map((keyword) => ({
        label: keyword,
        kind: languages.CompletionItemKind.Keyword,
        insertText: keyword,
        range: defaultRange,
      })),
    };
  };
}

export default function useCompletion(
  monaco: typeof import('monaco-editor/esm/vs/editor/editor.api')
) {
  const tableList = useTableListContext();
  const foreignKeys = useForeignKeysContext();
  const allColumns = useAllColumnsContext();

  useEffect(() => {
    // interesting examples :
    // - foldable https://microsoft.github.io/monaco-editor/playground.html?source=v0.47.0#example-extending-language-services-folding-provider-example
    // - hover https://microsoft.github.io/monaco-editor/playground.html?source=v0.47.0#example-extending-language-services-hover-provider-example
    const completionItemProvider =
      monaco.languages.registerCompletionItemProvider('sql', {
        provideCompletionItems: provideCompletionItems(
          monaco.languages,
          tableList,
          foreignKeys,
          allColumns
        ),
        // This function can be used to resolve additional information for the item that is being auto completed.
        // resolveCompletionItem: async (item, token) => {
        //   console.log('resolveCompletionItem', item, token);
        //
        //   const table = item.label;
        //   item.insertText += ` ON a.id = b.a_id`;
        //
        //   return item;
        // },
      });

    return () => {
      completionItemProvider.dispose();
    };
  }, [allColumns, foreignKeys, monaco.Range, monaco.languages, tableList]);
}

export const testables = {
  provideCompletionItems,
  SQL_KEYWORDS,
};
