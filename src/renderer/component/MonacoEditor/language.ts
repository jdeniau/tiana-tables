import { LanguageIdEnum } from 'monaco-sql-languages';
import { DatabaseEngine } from '../../../sql/engine';

/** The Monaco language of each engine, whose tokenizer colors its SQL. */
const LANGUAGES: Record<DatabaseEngine, LanguageIdEnum> = {
  [DatabaseEngine.MySQL]: LanguageIdEnum.MYSQL,
  [DatabaseEngine.PostgreSQL]: LanguageIdEnum.PG,
};

/** Every engine with the language its SQL providers are registered for. */
export const SQL_LANGUAGES = Object.entries(LANGUAGES) as Array<
  [DatabaseEngine, LanguageIdEnum]
>;

export function languageOf(engine: DatabaseEngine): LanguageIdEnum {
  return LANGUAGES[engine];
}

/** The engine a model is written for, `undefined` on a model that is not SQL. */
export function engineOf(languageId: string): DatabaseEngine | undefined {
  return (Object.keys(LANGUAGES) as DatabaseEngine[]).find(
    (engine) => LANGUAGES[engine] === languageId
  );
}
