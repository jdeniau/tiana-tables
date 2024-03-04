# Tiana Tables

Some SQL tool that works on Linux, Windows and MacOS.

## Installation

You can download the latest release in the [Release page](https://github.com/jdeniau/tiana-tables/releases).

## Contributing

### Translations

Translations can be added to the [`locales`](locales/) directory. The file name should be the language code (e.g. `fr.ts` for French). The file should export a default value that must implement the [`Translation`](locales/type.ts) type (which is generated upon the english translations). Object keys are translation keys, and the values being the translated string.

The default and reference locale is [`en.ts`](locales/en.ts).
