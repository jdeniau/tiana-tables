// Builds the "Le Fil" dataset and the verification tables into a new SQLite development file,
// which replaces the previous one: `node dev/fixtures/sqlite/load.mjs`.
import { execFileSync } from 'node:child_process';
import { readFileSync, renameSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const file = resolve(
  process.env.TIANA_DEV_FILE ?? join(here, '../../tiana_dev.sqlite')
);
// built aside, so that a failed load leaves the previous file whole
const building = `${file}.building`;

const rows = execFileSync(
  process.execPath,
  [join(here, '../generate.mjs'), 'sqlite'],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
);

rmSync(building, { force: true });

const database = new DatabaseSync(building, {
  enableForeignKeyConstraints: true,
});

database.exec(readFileSync(join(here, 'schema.sql'), 'utf8'));
database.exec(rows);
database.exec(readFileSync(join(here, 'verification.sql'), 'utf8'));
database.close();
renameSync(building, file);
console.log(`✓ ${file} rebuilt`);
