# Tiana Tables

Some SQL tool that works on Linux, Windows and MacOS.

## Purpose 

Tiana tables is a MySQL / MariaDB database query application for developers. 

The main purpose of Tiana tables is to be :
- easy to use: access to data and modifications should be easy for all tasks that a, developer has to make on a daily basis,
- pretty (as far as a SQL tool can be considered pretty), 
- multi-platform for desktop, with what you can expect for a modern application (auto-update for exemple). 

What you won't find in Tiana tables (or at least for a long time):

- database and user administration : you will probably want to use another tool more "admin"-friendly like sql workbench or similar

## Installation

You can download the latest release in the [Release page](https://github.com/jdeniau/tiana-tables/releases).

## Contributing

### Translations

Translations can be added to the [`locales`](locales/) directory. The file name should be the language code (e.g. `fr.ts` for French). The file should export a default value that must implement the [`Translation`](locales/type.ts) type (which is generated upon the english translations). Object keys are translation keys, and the values being the translated string.

The default and reference locale is [`en.ts`](locales/en.ts).
