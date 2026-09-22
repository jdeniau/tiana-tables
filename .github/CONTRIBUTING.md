# How to contribute ?

## Installation

This application is an electron app, so you need to have [Node.js](https://nodejs.org/fr) installed on your computer.

It does also use yarn 4+, which is built-in with Node.js, but you may need to activate corepack doing this:

```sh
corepack enable
```

Then, you can install the dependencies with:

```sh
yarn install
```

## A database to work against

Running the app means pointing it at a real server. [`dev/fixtures/`](../dev/fixtures/) holds a development dataset — "Le Fil", a news site with its articles, readers, subscriptions and comments — and the script that loads it into a local MariaDB container:

```sh
docker run -d --name tiana-dev-mysql --restart unless-stopped \
  -p 13306:3306 -v tiana-dev-mysql:/var/lib/mysql \
  -e MARIADB_ROOT_PASSWORD=devpassword -e MARIADB_DATABASE=tiana_dev \
  mariadb:11
dev/fixtures/mysql/load.sh
```

Then add a connection to `127.0.0.1:13306`, user `root`, password `devpassword`.

It is 25 tables and 2 views, around 14 000 rows, written to exercise what the app has to render: composite primary keys, self-referencing foreign keys, a generated column, `JSON`, `ENUM`, `DECIMAL`, `TIMESTAMP … ON UPDATE`, column comments, nullable columns everywhere, long `TEXT` and views next to base tables. The rows hold together in time, so a screenshot of any table reads like real data.

Loading is repeatable: the script drops and recreates its own tables, leaves anything else in the database alone, and the generator is seeded, so you always get the same rows. [`dev/fixtures/README.md`](../dev/fixtures/README.md) describes the dataset.

## Understand the project

The main code repository is located in the `src` folder.

As an electron app, you should read the [Electron documentation](https://www.electronjs.org/docs) to understand how it works, and in particular, the [Process model](https://www.electronjs.org/docs/latest/tutorial/process-model):

- The main process is the entry point of the application, and is responsible for creating the windows.
- The renderer process is the one that runs in the browser, and is responsible for the UI.
- The preload script is a script that runs in the renderer process, and can be used to expose APIs to the renderer process.

### Main process

In Tiana Tables, the main process is located in `src/main.ts`, and does import scripts from:

- `src/configuration`: everything related to the configuration of the application
- `src/sql`: everything related to the SQL queries
- `src/main-process`: everything else that the main process need to handle (window management, developper tools, menu, etc.)

### Renderer

Everything that renders the UI is located in the `src/renderer` folder.

It is [a ReactJS](https://react.dev/learn) application.

- `src/renderer/components`: contains the components of the application,
- `src/renderer/hooks`: contains global hooks, local hooks should be located in the component that uses them, or near them,
- `src/renderer/routes`: contains the routes of the application, using [react-router](https://reactrouter.com/en/main),
- `src/renderer/theme`: contains the theme of the application.

### Preload

The preload script is located in `src/preload.ts` or in the `src/preload/` directory, and is used to expose APIs to the renderer process.

Simple APIs can be exposed directly in the `preload.ts` file, but more complex APIs should be located in the `src/preload/` directory.

preload directory also contains TS enums named `XXXX_CHANNEL` that are used to communicate between the main process and the renderer process. There MUST be in a separate file, as you can not import preload file into the main process.

Every channel value should be exposed via a preload script, and should be handled by a main process. You can check out the `src/preload/sqlChannel.ts` file that defines the `SQL_CHANNEL` enum, and the `src/main-process/sql.ts` file that handles the SQL queries.
The `src/preload/sql.ts` file is used to expose the SQL queries to the renderer process (and is imported by the `src/preload.ts` file).

## Translations

Translations can be added to the [`locales`](locales/) directory. The file name should be the language code (e.g. `fr.ts` for French). The file should export a default value that must implement the [`Translation`](locales/type.ts) type (which is generated upon the english translations). Object keys are translation keys, and the values being the translated string.

The default and reference locale is [`en.ts`](locales/en.ts).
