import { LanguageIdEnum } from 'monaco-sql-languages';
import { DatabaseEngine } from '../../../sql/engine';

/** The language of SQLite, which monaco-sql-languages does not know: ours, colored by its PostgreSQL tokenizer. */
export const SQLITE_LANGUAGE = 'sqlite';

/**
 * The Monaco language of each engine, whose tokenizer colors its SQL.
 * One per engine: a model's language is how the editor finds its engine.
 */
const LANGUAGES: Record<DatabaseEngine, string> = {
  [DatabaseEngine.MySQL]: LanguageIdEnum.MYSQL,
  [DatabaseEngine.PostgreSQL]: LanguageIdEnum.PG,
  [DatabaseEngine.SQLite]: SQLITE_LANGUAGE,
};

/** Every engine with the language its SQL providers are registered for. */
export const SQL_LANGUAGES = Object.entries(LANGUAGES) as Array<
  [DatabaseEngine, string]
>;

export function languageOf(engine: DatabaseEngine): string {
  return LANGUAGES[engine];
}

/** The engine a model is written for, `undefined` on a model that is not SQL. */
export function engineOf(languageId: string): DatabaseEngine | undefined {
  return (Object.keys(LANGUAGES) as Array<DatabaseEngine>).find(
    (engine) => LANGUAGES[engine] === languageId
  );
}
