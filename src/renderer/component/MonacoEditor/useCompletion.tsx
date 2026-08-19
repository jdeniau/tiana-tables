import { useEffect } from 'react';
import { EntityContextType, MySQL } from 'dt-sql-parser';
import { MarkerSeverity, Position, editor, languages } from 'monaco-editor';
import { LanguageIdEnum, setupLanguageFeatures } from 'monaco-sql-languages';
// registers the `mysql` language and its tokenizer
import 'monaco-sql-languages/esm/languages/mysql/mysql.contribution';
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

/*
 * `monaco-sql-languages` gives us the MySQL tokenizer, but its completion and
 * diagnostics run in a worker it creates through Monaco's pre-0.45 API: the
 * worker never receives its `createData`, never answers, and the suggest
 * widget spins on "Loading" forever. Those two features are turned off here
 * and rebuilt on `dt-sql-parser` — which we already depend on, and which is
 * fast enough on the main thread for editor-sized queries.
 */
setupLanguageFeatures(LanguageIdEnum.MYSQL, {
  completionItems: false,
  diagnostics: false,
});

const parser = new MySQL();

type CompletionRange = languages.CompletionItem['range'];

export function buildCompletionProvider(
  tableList: ShowTableStatus[],
  foreignKeys: ForeignKeysHelper,
  allColumns: ColumnDetailHelper
): languages.CompletionItemProvider {
  return {
    triggerCharacters: [' ', '.'],
    provideCompletionItems(model, position) {
      const suggestions = parser.getSuggestionAtCaretPosition(
        model.getValue(),
        { lineNumber: position.lineNumber, column: position.column }
      );

      if (!suggestions) {
        return { suggestions: [] };
      }

      const word = model.getWordUntilPosition(position);
      const range: CompletionRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      // the whole query, not only what precedes the caret: completing the
      // select list of `SELECT e.| FROM employee e` needs the `FROM` clause
      const tableAliases = extractTableAliases(model.getValue());
      const qualifier = qualifierBefore(model, position, word.startColumn);
      const qualifiedTable = qualifier ? tableAliases[qualifier] : undefined;

      // after `alias.`, that table's columns are the only sensible suggestion,
      // and an unknown qualifier deserves silence rather than every column of
      // the query. The grammar is of no help here: it reports a column context
      // only while the name is still empty, then calls `alias.na` a function.
      if (qualifier) {
        return {
          suggestions: qualifiedTable
            ? columnCompletions(allColumns, [qualifiedTable], range)
            : [],
        };
      }

      const items: languages.CompletionItem[] = [];

      for (const { syntaxContextType } of suggestions.syntax) {
        if (syntaxContextType === EntityContextType.TABLE) {
          items.push(
            ...tableCompletions(tableList, foreignKeys, tableAliases, range)
          );
        }

        if (syntaxContextType === EntityContextType.COLUMN) {
          items.push(
            ...columnCompletions(
              allColumns,
              [...new Set(Object.values(tableAliases))],
              range
            )
          );
        }
      }

      // the grammar itself tells us which keywords are valid right here
      items.push(
        ...suggestions.keywords.map(
          (keyword): languages.CompletionItem => ({
            label: keyword,
            kind: languages.CompletionItemKind.Keyword,
            detail: 'keyword',
            insertText: keyword,
            range,
            // schema names first, keywords after
            sortText: `2${keyword}`,
          })
        )
      );

      return { suggestions: items };
    },
  };
}

/** `FROM ` / `JOIN `: propose every table, aliased and joined when possible */
function tableCompletions(
  tableList: ShowTableStatus[],
  foreignKeys: ForeignKeysHelper,
  tableAliases: Record<string, string>,
  range: CompletionRange
): languages.CompletionItem[] {
  const usedAliases = Object.keys(tableAliases);
  const usedTables = Object.entries(tableAliases).map(([alias, tableName]) => ({
    tableName,
    alias,
  }));

  return tableList.map((table): languages.CompletionItem => {
    const alias = generateTableAlias(table.Name, usedAliases);
    const foreignKey = foreignKeys.getLinkBetweenTables(table.Name, usedTables);

    const joinString = foreignKey
      ? `ON ${alias}.${foreignKey.referencedColumnName} = ${
          foreignKey.alias || foreignKey.referencedTableName
        }.${foreignKey.columnName} `
      : '';

    return {
      label: table.Name,
      detail: foreignKey?.referencedTableName ?? undefined,
      kind: languages.CompletionItemKind.Variable,
      insertText: `${table.Name} ${alias} ${joinString}`,
      range,
      sortText: `1${table.Name}`,
    };
  });
}

/** the name a `qualifier.` refers to, when the caret follows one */
function qualifierBefore(
  model: editor.ITextModel,
  position: Position,
  wordStartColumn: number
): string | undefined {
  if (wordStartColumn < 3) {
    return undefined;
  }

  const previousCharacter = model.getValueInRange({
    startLineNumber: position.lineNumber,
    endLineNumber: position.lineNumber,
    startColumn: wordStartColumn - 1,
    endColumn: wordStartColumn,
  });

  if (previousCharacter !== '.') {
    return undefined;
  }

  return (
    model.getWordUntilPosition(
      new Position(position.lineNumber, wordStartColumn - 1)
    ).word || undefined
  );
}

function columnCompletions(
  allColumns: ColumnDetailHelper,
  tableNames: ReadonlyArray<string>,
  range: CompletionRange
): languages.CompletionItem[] {
  return tableNames.flatMap((tableName) =>
    allColumns.getColumnsForTable(tableName).map(
      (column): languages.CompletionItem => ({
        label: column.Column,
        insertText: column.Column,
        kind: languages.CompletionItemKind.Field,
        detail: tableName,
        range,
        sortText: `1${column.Column}`,
      })
    )
  );
}

const MARKER_OWNER = 'mysql-syntax';

function validateModel(model: editor.ITextModel): void {
  if (model.isDisposed() || model.getLanguageId() !== LanguageIdEnum.MYSQL) {
    return;
  }

  const markers = parser.validate(model.getValue()).map(
    (error): editor.IMarkerData => ({
      severity: MarkerSeverity.Error,
      message: error.message,
      startLineNumber: error.startLine,
      startColumn: error.startColumn,
      endLineNumber: error.endLine,
      endColumn: error.endColumn,
    })
  );

  editor.setModelMarkers(model, MARKER_OWNER, markers);
}

/** underline syntax errors, re-checked shortly after the user stops typing */
function watchModel(model: editor.ITextModel): { dispose: () => void } {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const schedule = () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => validateModel(model), 300);
  };

  schedule();
  const listener = model.onDidChangeContent(schedule);

  return {
    dispose: () => {
      clearTimeout(timeout);
      listener.dispose();
    },
  };
}

export default function useCompletion(): void {
  const tableList = useTableListContext();
  const foreignKeys = useForeignKeysContext();
  const allColumns = useAllColumnsContext();

  useEffect(() => {
    const provider = languages.registerCompletionItemProvider(
      LanguageIdEnum.MYSQL,
      buildCompletionProvider(tableList, foreignKeys, allColumns)
    );

    return () => provider.dispose();
  }, [allColumns, foreignKeys, tableList]);

  useEffect(() => {
    const watchers = new Map<string, { dispose: () => void }>();

    const watch = (model: editor.ITextModel) => {
      if (model.getLanguageId() === LanguageIdEnum.MYSQL) {
        watchers.set(model.uri.toString(), watchModel(model));
      }
    };

    editor.getModels().forEach(watch);
    const onCreate = editor.onDidCreateModel(watch);
    const onDispose = editor.onWillDisposeModel((model) => {
      const key = model.uri.toString();
      watchers.get(key)?.dispose();
      watchers.delete(key);
    });

    return () => {
      onCreate.dispose();
      onDispose.dispose();
      watchers.forEach((watcher) => watcher.dispose());
    };
  }, []);
}
