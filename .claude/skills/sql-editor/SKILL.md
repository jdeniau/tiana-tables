---
name: sql-editor
description: >
  Use when working on the SQL editor of Tiana Tables — completion, syntax
  validation, semantic highlighting, or anything under
  src/renderer/component/MonacoEditor/ and src/sql/mysqlParser.ts. Triggers on
  monaco-editor, monaco-sql-languages, dt-sql-parser, Monarch tokenizers,
  semantic tokens, model markers, or SQL parsing questions.
---

# The SQL editor stack

Three layers, three different jobs. Keep them straight — most of the traps below
come from confusing them.

| Layer                  | Job                                                                         |
| ---------------------- | --------------------------------------------------------------------------- |
| `monaco-editor`        | the editor: models, markers, themes, provider registries                    |
| `monaco-sql-languages` | registers the `mysql` language and its **Monarch tokenizer** (lexical only) |
| `dt-sql-parser`        | the real MySQL **grammar** (ANTLR): entities, suggestions, syntax errors    |

Monaco stays in charge; the two SQL packages are plugged into it.

## What we deliberately do NOT use

`monaco-sql-languages` also ships completion and diagnostics, and its own
`mysql.contribution` turns them on. **They are disabled** in
`useCompletion.tsx`:

```ts
setupLanguageFeatures(LanguageIdEnum.MYSQL, {
  completionItems: false,
  diagnostics: false,
});
```

Those features run in a worker it creates through Monaco's **pre-0.45** API. In
Monaco 0.55 the standalone `createWebWorker` forwards only `opts.worker` and
never sends the second message carrying `createData`, so the worker never
answers: the suggest widget spins on "Loading" forever and nothing is
underlined. Both features are rebuilt on `dt-sql-parser`, on the main thread —
fast enough for editor-sized queries. (Their package declares
`peerDependency monaco-editor >=0.37.1`, which is wrong.)

Only the tokenizer and the language registration are kept from that package.

## Token names — the trap that already bit twice

The Monarch tokenizer appends `tokenPostfix: '.sql'` to **every** token, and its
class names are not the ones Monaco's built-in SQL grammar uses:

| SQL                                                   | token emitted              |
| ----------------------------------------------------- | -------------------------- |
| `SELECT`, `FROM`, `WHERE`, `ON`, `LIMIT`              | `keyword.sql`              |
| **`JOIN`, `AND`, `OR`, `NOT`, `IN`, `LIKE`, `UNION`** | **`operator.keyword.sql`** |
| `=`, `*`, `<`                                         | `operator.symbol.sql`      |
| `CASE`, `WHEN`, `THEN`, `ELSE`, `BEGIN`, `END`        | `keyword.scope.sql`        |
| built-in functions                                    | `predefined.sql`           |
| `@@version`                                           | `variable.sql`             |
| everything else                                       | `identifier.sql`           |

The word operators are checked **before** the keyword list, so `JOIN` is never a
`keyword`. Theme rules match by dot segments, so `operator.sql` does **not**
match `operator.keyword.sql` — they are sibling branches. A rule that looks
right can silently never apply; check the emitted name, not the intuition.

Also: Monaco's built-in themes hardcode `string.sql` in **bright red**
(`#FF0000`), plus `operator.sql` and `predefined.sql`. `buildMonacoTheme` sets
`inherit: true`, so those more specific rules beat our generic ones and have to
be restated. Any SQL token that looks wrong despite a correct generic rule needs
an explicit `<token>.sql` override.

## Semantic tokens

Table names and aliases are colored through
`languages.registerDocumentSemanticTokensProvider` (`useSemanticTokens.ts`),
because a lexer cannot tell a table from any other identifier.

Three things to know:

1. **The editor option is mandatory.** `StandaloneTheme` hardcodes
   `semanticHighlighting = false`, and the default option value is
   `configuredByTheme` — so nothing renders until the editor is created with
   `'semanticHighlighting.enabled': true`.
2. **Token types resolve through the theme rules.**
   `StandaloneTheme.getTokenStyleMetadata` calls
   `tokenTheme._match([type, ...modifiers].join('.'))`, exactly like tokenizer
   tokens. A type named `table.sql` is styled by a `{ token: 'table.sql' }`
   rule. Hence the `.sql` postfix on our types, mirroring the tokenizer.
3. **Overlapping tokens void the whole result.** Monaco discards everything and
   warns. `db1` in `FROM db1.users` is inside the table entity's range, so the
   qualifier pass must skip anything a declaration already covers.

The wire format is `[deltaLine, deltaChar, length, typeIndex, modifiers]` per
token, **0-based**, sorted, each position relative to the previous one (the
column absolute again on a new line).

## Position conventions

Four of them, and mixing two is a silent off-by-one:

| Source                                       | line    | column                         |
| -------------------------------------------- | ------- | ------------------------------ |
| antlr `Token` (`getAllTokens`)               | 1-based | **0-based**                    |
| `dt-sql-parser` `WordPosition` / `WordRange` | 1-based | 1-based, `endColumn` exclusive |
| Monaco `IRange` / `Position` / markers       | 1-based | 1-based, `endColumn` exclusive |
| semantic token protocol                      | 0-based | 0-based                        |

`queryAnalysis.ts` normalises everything to `IRange` as early as possible.

## dt-sql-parser behaviours worth remembering

- **`getAllEntities` is all or nothing.** One syntax error and ANTLR drops the
  whole subtree — not even the tables written before the error come back. That
  is exactly what the editor holds while typing (`… JOIN `, `… WHERE x = `), so
  `collectEntities` retries on shorter prefixes, dropping the trailing token
  each time. Lexing never fails, which is what gives the cut points.
- **`getSuggestionAtCaretPosition` reports a `column` context only while the
  name is still empty.** Type one letter and `alias.na` becomes a `function`
  context; inside a `WHERE` it can return nothing at all. Never derive the
  qualifier from its `wordRanges` — read it from the model with
  `getWordUntilPosition` plus the character before the word.
- **`splitSQLByStatement` returns `null` on any syntax error**, so it cannot
  answer "is the tail unfinished?". Split on the `;` tokens of `getAllTokens`.
- The parser caches the parse tree of its last input, so one shared instance
  (`src/sql/mysqlParser.ts`) makes completion, validation and highlighting parse
  the editor content once.

## Electron

The squiggly underline is a `data:image/svg+xml` background image. The CSP in
`src/main.ts` must keep `img-src 'self' data:`, otherwise markers are computed
but invisible — with only a console CSP violation to go on.

## Testing

- Keep the analysis modules free of **runtime** monaco imports (`import type`
  only). Importing `monaco-editor` for real drags in `window` and the test dies
  in the node environment.
- A test that builds an editor model needs
  `/** @vitest-environment happy-dom */`.
- Verify highlighting by reading **computed styles** out of the DOM
  (`getComputedStyle(span).color`), not from screenshots — and pick a theme
  where the slots differ: Dracula has `base0A === base0C`, so tables and aliases
  look identical there and a screenshot proves nothing. Nord is a good default.
