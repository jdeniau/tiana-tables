import { editor } from 'monaco-editor';
import { AppTheme } from '../../../configuration/themes';

/** monaco token rules want colors without the leading `#` */
function token(color: string): string {
  return color.replace('#', '').toLowerCase();
}

/**
 * Build a Monaco theme from a base16 palette.
 *
 * Slot roles map almost one to one onto Monaco's token types, so this replaces
 * the previous TextMate scope converter (color parsing, scope splitting and a
 * VS Code compatibility map, none of which we needed for a SQL editor).
 */
export function buildMonacoTheme(theme: AppTheme): editor.IStandaloneThemeData {
  const palette = theme.palette;

  return {
    base: theme.variant === 'dark' ? 'vs-dark' : 'vs',
    inherit: true,
    rules: [
      { token: '', foreground: token(palette.base05) },
      { token: 'comment', foreground: token(palette.base03) },
      { token: 'string', foreground: token(palette.base0B) },
      { token: 'number', foreground: token(palette.base09) },
      { token: 'constant', foreground: token(palette.base09) },
      { token: 'keyword', foreground: token(palette.base0E) },
      { token: 'operator', foreground: token(palette.base05) },
      { token: 'delimiter', foreground: token(palette.base05) },
      { token: 'identifier', foreground: token(palette.base05) },
      { token: 'type', foreground: token(palette.base0A) },
      { token: 'predefined', foreground: token(palette.base0D) },
      { token: 'function', foreground: token(palette.base0D) },
      { token: 'variable', foreground: token(palette.base08) },
      { token: 'invalid', foreground: token(palette.base0F) },

      // The SQL tokenizer suffixes every token with `.sql` (`tokenPostfix`),
      // and Monaco's built-in themes hardcode a few `*.sql` rules — notably
      // `string.sql` in bright red (#ff0000). Since we inherit from those
      // themes, their more specific rules would win over the generic ones
      // above, so the SQL variants have to be restated here.
      { token: 'string.sql', foreground: token(palette.base0B) },
      { token: 'predefined.sql', foreground: token(palette.base0D) },
      // `monaco-sql-languages` classifies AND, OR, NOT, IN, LIKE, IS, JOIN,
      // UNION… as `operator.keyword`, not as `keyword`, and checks that list
      // first. They are keywords to the reader, so they get the keyword color.
      // Symbolic operators (=, *, <) are `operator.symbol` and keep the
      // default foreground through the generic `operator` rule above.
      { token: 'operator.keyword.sql', foreground: token(palette.base0E) },
      { token: 'identifier.sql', foreground: token(palette.base05) },

      // Semantic tokens (see `useSemanticTokens`): the lexer cannot tell a
      // table name or an alias from any other identifier, the parser can.
      { token: 'table.sql', foreground: token(palette.base0A) },
      {
        token: 'alias.sql',
        foreground: token(palette.base0C),
        fontStyle: 'italic',
      },
    ],
    colors: {
      'editor.background': palette.base00,
      'editor.foreground': palette.base05,
      'editor.selectionBackground': palette.base02,
      'editor.lineHighlightBackground': palette.base01,
      'editorCursor.foreground': palette.base05,
      'editorWhitespace.foreground': palette.base03,
      'editorLineNumber.foreground': palette.base03,
      'editorLineNumber.activeForeground': palette.base05,
      'editorIndentGuide.background': palette.base01,
      'editorIndentGuide.activeBackground': palette.base02,
      // the same pair as every other scrollbar of the frame
      'scrollbarSlider.background': palette.base02,
      'scrollbarSlider.hoverBackground': palette.base03,
      'scrollbarSlider.activeBackground': palette.base03,
      'scrollbar.shadow': palette.base00,
    },
  };
}
