# Tiana Tables

SQL query tool that works on Linux, Windows and MacOS.

## Purpose

Tiana tables is a MySQL / MariaDB database query application for developers.

The main purpose of Tiana tables is to be :

- easy to use: access to data and modifications should be easy for all tasks that a developer has to make on a daily basis,
- pretty (as far as a SQL tool can be considered pretty),
- multi-platform for desktop, with what you can expect for a modern application (auto-update for exemple).

What you won't find in Tiana tables (or at least for a long time):

- database and user administration : you will probably want to use another tool more "admin"-friendly like sql workbench or similar

### DB support

For now, Tiana Tables supports MySQL and MariaDb.
I might add PostgreSql support one day, but as I do not use it, so it's not a priority for now.
If you like Tiana Table and want to implement PostgreSql though, it should be pretty easy as all queries that are made should be SQL standard
Other DB? I da not plan to support another DB system, but if it does share SQL standard, you might open an issue to discuss about it.
I probably won't accept DB that are too far from SQL, because it will rendor the app less good with SQL and the maintenance will be too hard.

## Installation

You can download the latest release in the [Release page](https://github.com/jdeniau/tiana-tables/releases).

## Contributing

### Translations

Translations can be added to the [`locales`](locales/) directory. The file name should be the language code (e.g. `fr.ts` for French). The file should export a default value that must implement the [`Translation`](locales/type.ts) type (which is generated upon the english translations). Object keys are translation keys, and the values being the translated string.

The default and reference locale is [`en.ts`](locales/en.ts).
