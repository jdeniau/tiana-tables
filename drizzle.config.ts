import { defineConfig } from 'drizzle-kit';

/** `yarn history:generate` writes the migration of a change to the query history's schema */
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/main-process/queryHistory/schema.ts',
  out: './src/main-process/queryHistory/migrations',
});
