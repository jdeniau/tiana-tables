import { useEffect, useRef } from 'react';
import { EntityContextType } from 'dt-sql-parser';
import { MarkerSeverity, Position, editor, languages } from 'monaco-editor';
import { setupLanguageFeatures } from 'monaco-sql-languages';
// register the `mysql` and `pgsql` languages; Monaco loads a tokenizer when a model first uses it
import 'monaco-sql-languages/esm/languages/mysql/mysql.contribution';
import 'monaco-sql-languages/esm/languages/pgsql/pgsql.contribution';
import { useAllColumnsContext } from '../../../contexts/AllColumnsContext';
import { useForeignKeysContext } from '../../../contexts/ForeignKeysContext';
import { useTableListContext } from '../../../contexts/TableListContext';
import { ColumnDetailHelper } from '../../../sql/ColumnDetailHelper';
import { ForeignKeysHelper } from '../../../sql/ForeignKeysHelper';
import type { DatabaseEngine } from '../../../sql/engine';
import { getParser } from '../../../sql/parser';
import {
  splitStatements,
  statementAtOffset,
} from '../../../sql/splitStatements';
import {
  extractTableAliases,
  generateTableAlias,
} from '../../../sql/tableName';
import { SQL_LANGUAGES, engineOf } from './language';
import { QuerySchema, analyzeQuery } from './queryAnalysis';
import {
  fromPrefixedRange,
  getQueryPrefix,
  prefixedValue,
  toPrefixedPosition,
} from './queryPrefix';
import useQuerySchema from './useQuerySchema';

/*
 * `monaco-sql-languages` gives us the SQL tokenizers, but its completion and
 * diagnostics run in a worker it creates through Monaco's pre-0.45 API: the
 * worker never receives its `createData`, never answers, and the suggest
 * widget spins on "Loading" forever. Those two features are turned off here
 * and rebuilt on `dt-sql-parser` — which we already depend on, and which is
 * fast enough on the main thread for editor-sized queries.
 */
for (const [, language] of SQL_LANGUAGES) {
  setupLanguageFeatures(language, {
    completionItems: false,
    diagnostics: false,
  });
}

type CompletionRange = languages.CompletionItem['range'];

export function buildCompletionProvider(
  engine: DatabaseEngine,
  tableList: string[],
  foreignKeys: ForeignKeysHelper,
  allColumns: ColumnDetailHelper
): languages.CompletionItemProvider {
  return {
    triggerCharacters: [' ', '.'],
    provideCompletionItems(model, position) {
      // the query the model is a fragment of: a bare `WHERE` body knows no
      // table, and its columns can only be completed from the prefix
      const prefix = getQueryPrefix(model);
      const sql = prefixedValue(model);
      const suggestions = getParser(engine).getSuggestionAtCaretPosition(
        sql,
        toPrefixedPosition(prefix, position)
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

      // the whole statement, not only what precedes the caret: completing the
      // select list of `SELECT e.| FROM employee e` needs the `FROM` clause.
      // Only that statement though: a `;` opens a new scope, where the tables
      // and the aliases of the previous ones mean nothing.
      const statement = statementAtOffset(
        splitStatements(sql, engine),
        model.getOffsetAt(position) + prefix.length
      );
      const tableAliases = extractTableAliases(statement?.sql ?? sql, engine);
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
  tableList: string[],
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
    const alias = generateTableAlias(table, usedAliases);
    const foreignKey = foreignKeys.getLinkBetweenTables(table, usedTables);

    const joinString = foreignKey
      ? `ON ${alias}.${foreignKey.referencedColumnName} = ${
          foreignKey.alias || foreignKey.referencedTableName
        }.${foreignKey.columnName} `
      : '';

    return {
      label: table,
      detail: foreignKey?.referencedTableName ?? undefined,
      kind: languages.CompletionItemKind.Variable,
      insertText: `${table} ${alias} ${joinString}`,
      range,
      sortText: `1${table}`,
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
        label: column.name,
        insertText: column.name,
        kind: languages.CompletionItemKind.Field,
        detail: tableName,
        range,
        sortText: `1${column.name}`,
      })
    )
  );
}

const MARKER_OWNER = 'sql-syntax';

export function validateModel(
  model: editor.ITextModel,
  schema: QuerySchema
): void {
  const engine = engineOf(model.getLanguageId());

  if (model.isDisposed() || !engine) {
    return;
  }

  // an empty editor is not a mistake, and the prefix alone would be reported
  // as an unfinished query
  if (!model.getValue().trim()) {
    editor.setModelMarkers(model, MARKER_OWNER, []);

    return;
  }

  const prefix = getQueryPrefix(model);
  const sql = prefixedValue(model);

  const syntaxErrors = getParser(engine)
    .validate(sql)
    .map((error) => ({
      severity: MarkerSeverity.Error,
      message: error.message,
      range: fromPrefixedRange(prefix, {
        startLineNumber: error.startLine,
        startColumn: error.startColumn,
        endLineNumber: error.endLine,
        endColumn: error.endColumn,
      }),
    }))
    .flatMap(({ range, ...marker }): editor.IMarkerData[] =>
      range ? [{ ...marker, ...range }] : []
    );

  // a warning rather than an error: the query is valid SQL, and only the
  // qualified references we could resolve are checked, never a bare column
  const unknownColumns = analyzeQuery(
    sql,
    schema,
    engine
  ).unknownColumns.flatMap(({ range, table, column }): editor.IMarkerData[] => {
    const modelRange = fromPrefixedRange(prefix, range);

    return modelRange
      ? [
          {
            severity: MarkerSeverity.Warning,
            message: `Unknown column \`${column}\` on table \`${table}\``,
            ...modelRange,
          },
        ]
      : [];
  });

  editor.setModelMarkers(model, MARKER_OWNER, [
    ...syntaxErrors,
    ...unknownColumns,
  ]);
}

/** underline syntax errors, re-checked shortly after the user stops typing */
function watchModel(
  model: editor.ITextModel,
  validate: (model: editor.ITextModel) => void
): { dispose: () => void } {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const schedule = () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => validate(model), 300);
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
  const schema = useQuerySchema();

  useEffect(() => {
    const providers = SQL_LANGUAGES.map(([engine, language]) =>
      languages.registerCompletionItemProvider(
        language,
        buildCompletionProvider(engine, tableList, foreignKeys, allColumns)
      )
    );

    return () => providers.forEach((provider) => provider.dispose());
  }, [allColumns, foreignKeys, tableList]);

  // read through a ref: the schema changes identity on every render of its
  // provider, and rebuilding the watchers would reset their debounce each time
  const schemaRef = useRef(schema);
  schemaRef.current = schema;

  useEffect(() => {
    const watchers = new Map<string, { dispose: () => void }>();
    const validate = (model: editor.ITextModel) =>
      validateModel(model, schemaRef.current);

    const watch = (model: editor.ITextModel) => {
      if (engineOf(model.getLanguageId())) {
        watchers.set(model.uri.toString(), watchModel(model, validate));
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
