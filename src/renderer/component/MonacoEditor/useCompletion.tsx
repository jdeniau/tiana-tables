import { useEffect } from 'react';
import {
  CancellationToken,
  Position,
  Range,
  editor,
  languages,
} from 'monaco-editor/esm/vs/editor/editor.api';
import invariant from 'tiny-invariant';
import { useTableListContext } from '../../../contexts/TableListContext';
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
];

function provideCompletionItems(
  languages: typeof import('monaco-editor/esm/vs/editor/editor.api').languages,
  tableList: ShowTableStatus[]
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
    // const textUntilPosition = model.getValueInRange({
    //   startLineNumber: 1,
    //   startColumn: 1,
    //   endLineNumber: position.lineNumber,
    //   endColumn: position.column,
    // });
    // const hasFromBefore = textUntilPosition.match(/FROM\s*$/i);
    const isAfterFromOrJoin = model.findMatches(
      '(from|join)\\s*(?<database>\\w*\\.)?(?<tablename>\\w+)?$', // searchString
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

      invariant(matches, 'matches should be defined');

      const fullLength = matches[0]?.length ?? 0;
      const tableLength = matches[3]?.length ?? 0;
      const startColumn = range.startColumn + fullLength - tableLength;

      return {
        suggestions: tableList.map((table) => ({
          label: table.Name,
          kind: languages.CompletionItemKind.Variable,
          insertText: table.Name,
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

  useEffect(() => {
    // interesting examples :
    // - foldable https://microsoft.github.io/monaco-editor/playground.html?source=v0.47.0#example-extending-language-services-folding-provider-example
    // - hover https://microsoft.github.io/monaco-editor/playground.html?source=v0.47.0#example-extending-language-services-hover-provider-example
    const completionItemProvider =
      monaco.languages.registerCompletionItemProvider('sql', {
        provideCompletionItems: provideCompletionItems(
          monaco.languages,
          tableList
        ),
      });

    return () => {
      completionItemProvider.dispose();
    };
  }, [monaco.Range, monaco.languages, tableList]);
}

export const testables = { provideCompletionItems, SQL_KEYWORDS };
