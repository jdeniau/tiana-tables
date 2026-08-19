import { useEffect } from 'react';
import { languages } from 'monaco-editor';
import { LanguageIdEnum } from 'monaco-sql-languages';
import { QuerySchema, SqlSemanticKind, analyzeQuery } from './queryAnalysis';
import useQuerySchema from './useQuerySchema';

/**
 * Token types are matched against the theme rules of the same name — see
 * `StandaloneTheme.getTokenStyleMetadata`, which resolves them through
 * `tokenTheme._match(type)`, exactly like the tokenizer ones. Hence the `.sql`
 * postfix of the tokenizer, to make clear these rules only style SQL.
 */
const KINDS: SqlSemanticKind[] = ['table', 'alias'];

const LEGEND: languages.SemanticTokensLegend = {
  tokenTypes: KINDS.map((kind) => `${kind}.sql`),
  tokenModifiers: [],
};

/** a semantic token is 5 numbers: line and column deltas, length, type, modifiers */
const TOKEN_SIZE = 5;

function buildProvider(
  schema: QuerySchema
): languages.DocumentSemanticTokensProvider {
  return {
    getLegend: () => LEGEND,

    provideDocumentSemanticTokens(model) {
      const tokens = analyzeQuery(model.getValue(), schema).semanticTokens.sort(
        (a, b) =>
          a.range.startLineNumber - b.range.startLineNumber ||
          a.range.startColumn - b.range.startColumn
      );

      const data = new Uint32Array(tokens.length * TOKEN_SIZE);
      let previousLine = 0;
      let previousColumn = 0;

      tokens.forEach(({ kind, range }, index) => {
        // the protocol is 0-based and encodes every position as a delta from
        // the previous token, the column one being absolute on a new line
        const line = range.startLineNumber - 1;
        const column = range.startColumn - 1;
        const deltaLine = line - previousLine;

        data.set(
          [
            deltaLine,
            deltaLine === 0 ? column - previousColumn : column,
            range.endColumn - range.startColumn,
            KINDS.indexOf(kind),
            0,
          ],
          index * TOKEN_SIZE
        );

        previousLine = line;
        previousColumn = column;
      });

      return { data };
    },

    releaseDocumentSemanticTokens() {
      // nothing to release: tokens are recomputed from the model on every call
    },
  };
}

/** color table names and aliases, which the lexer cannot tell from any other identifier */
export default function useSemanticTokens(): void {
  const schema = useQuerySchema();

  useEffect(() => {
    const registration = languages.registerDocumentSemanticTokensProvider(
      LanguageIdEnum.MYSQL,
      buildProvider(schema)
    );

    return () => registration.dispose();
  }, [schema]);
}
