// Rich text: <code>…</code> and <link>…</link> are rendered by the components.
export default {
  'meta.title': 'Tiana Tables: a SQL client for developers',
  'meta.description':
    'A MySQL, MariaDB and PostgreSQL client for developers, on Linux, macOS and Windows. Browse, query and edit your data efficiently. Easy-to-use and pretty.',
  'nav.label': 'Sections',
  'nav.editor': 'Editor',
  'nav.browse': 'Browse',
  'nav.privacy': 'Privacy',
  'nav.charts': 'Charts',
  'nav.themes': 'Themes',
  'nav.ssh': 'SSH',
  'nav.download': 'Download',
  'language.other': 'Français',
  'theme.label': 'Theme',
  'theme.system': 'System theme',
  'theme.dark': 'Dark',
  'theme.light': 'Light',

  'hero.eyebrow': 'MySQL · MariaDB · PostgreSQL · Linux, macOS, Windows',
  'hero.title': 'A SQL client for developers',
  'hero.title.short': 'A SQL client for devs',
  'hero.lead':
    'Browse, query and edit your data efficiently. Easy-to-use, pretty and multiplatform.',
  'hero.download': 'Download',
  'hero.source': 'Source on GitHub',
  'hero.other': 'Other platforms',
  'spec.engines': 'Engines',
  'spec.engines.value': 'MySQL, MariaDB, PostgreSQL',
  'spec.runsOn': 'Runs on',
  'spec.runsOn.value': 'Linux, macOS, Windows',
  'spec.connects': 'Connects',
  'spec.connects.value': 'Direct, SSL or SSH tunnel',
  'spec.themes': 'Themes',
  'spec.themes.value': '{count, number} themes',
  'spec.languages': 'Languages',
  'spec.languages.value': 'English, french',
  'spec.account': 'Account',
  'spec.account.value': 'None. No telemetry',
  'spec.license': 'License',
  'spec.latest': 'Latest',
  'app.label':
    'Tiana Tables browsing the article table, filtered on its status',
  'app.caption':
    'This window is HTML, drawn with the palette picked in the title bar, like the app. Sample data: “Le Fil”, the development dataset.',

  'editor.title': 'SQL editor',
  'editor.meta': 'Monaco, the editor of VS Code',
  'editor.lead':
    'It knows the grammar of your engine and the schema of your database, so it does more than colour keywords.',
  'editor.items': [
    'Completes tables, columns and aliases. After <code>a.</code>, you get that table’s columns and nothing else.',
    'Completing a table in <code>FROM</code> or <code>JOIN</code> writes its alias, and the <code>ON</code> clause when a foreign key links it to a table already in the query.',
    'Suggests only the keywords that are valid at the caret.',
    'Underlines syntax errors as you type, and warns on unknown columns like <code>u.emial</code>. Never on valid SQL.',
    'Runs the statement under the caret, or all of them in order, stopping at the first error.',
  ],
  'editor.label': 'SQL query with the completion list open after a.',

  'browse.title': 'Browse',
  'browse.meta': 'virtualized grid, instant rendering',
  'browse.lead':
    'A wide table scrolls without stuttering, and the next rows are one click away.',
  'browse.items': [
    'Filter with a <code>WHERE</code> clause, remembered per table.',
    'Right-click a cell to filter on its value, on your clipboard, or on whatever you want.',
    'Foreign keys are links: click through to the referenced row.',
    'Copy rows as TSV, CSV, Markdown, JSON or SQL <code>INSERT</code>.',
  ],

  'edit.title': 'Edit',
  'edit.meta': 'optimistic conflict detection',
  'edit.lead': 'Double-click a cell to open the editor of its column type.',
  'edit.editors.label': 'Cell editors',
  'edit.editors': ['date picker', 'ENUM / SET', 'JSON', 'input'],
  'edit.text':
    'If the value changed, or the row was deleted, since you loaded it, you choose what happens. Nothing is overwritten silently. A cell that cannot be written says why: no primary key, generated column, binary column.',

  'privacy.title': 'Your machine',
  'privacy.meta': 'credentials',
  'privacy.statement': ['No account.', 'No cloud sync.', 'No telemetry.'],
  'privacy.lead': 'Tiana Tables runs on your machine, against your databases.',
  'privacy.text':
    'Connection passwords are encrypted through the system keychain. When there is none, the app tells you the passwords are only obfuscated, instead of pretending otherwise.',

  'databases.title': 'Databases',
  'databases.meta': 'what is in scope',
  'databases.ssl': 'SSL, Required or Verified',
  'databases.ssh': 'SSH tunnel',
  'databases.others': 'Other SQL engines',
  'databases.admin': 'Server and user administration',
  'databases.supported': 'supported',
  'databases.outOfScope': 'out of scope',
  'databases.text':
    'A PostgreSQL connection opens one database, and lists its schemas where a MySQL server lists its databases. Another engine that shares enough of the SQL standard can be discussed in an issue.',

  'charts.title': 'Charts',
  'charts.meta': 'bar or line, from any result',
  'charts.lead':
    'Any raw SQL result with a numeric column flips to a bar or line chart. You pick the X axis and the series.',
  'charts.quote':
    'A result with a <code>LIMIT</code> is refused on purpose: a chart of a partial result is a lie.',
  'charts.text':
    'Copy it as an image, or save it as a PNG for the slide you were asked for.',
  'charts.label':
    'Monthly reads and identified readers, January 2024 to September 2026, both rising',

  'themes.title': 'Themes',
  'themes.meta': '{count, number} base16 palettes · press T to cycle',
  'themes.lead':
    'From Dracula to Solarized, light and dark. The theme reaches the whole app, grid and SQL editor included. This page uses the same palettes: pick one.',

  'ssh.title': 'SSH tunnel',
  'ssh.meta': 'since v1.24.0',
  'ssh.lead':
    'Reach a database behind an SSH server, the way your terminal does.',
  'ssh.items': [
    'The tunnel runs the <code>ssh</code> command of your machine: your <code>~/.ssh/config</code>, <code>known_hosts</code> and SSH agent apply.',
    'Leave the SSH user empty and it comes from your config.',
    'What ssh asks, the app asks: an unknown server shows its fingerprint before you trust it, a passphrase is asked when a key needs one.',
    'The database host and port are the ones the SSH server sees.',
  ],
  'ssh.caption': 'Sample values, in the form and the question the app shows.',

  'download.title': 'Download',
  'download.meta': 'v{version} · MIT',
  'download.platform': 'Platform',
  'download.file': 'File',
  'download.row.deb': 'Linux · Debian, Ubuntu',
  'download.row.rpm': 'Linux · Fedora, openSUSE',
  'download.row.macArm': 'macOS · Apple silicon',
  'download.row.macIntel': 'macOS · Intel',
  'download.row.windowsSetup': 'Windows',
  'download.button.deb': 'Download .deb',
  'download.button.rpm': 'Download .rpm',
  'download.button.macArm': 'Download for Apple silicon',
  'download.button.macIntel': 'Intel',
  'download.button.windowsSetup': 'Download for Windows',
  'download.note.linux':
    '.deb for Debian and Ubuntu, .rpm for Fedora and openSUSE',
  'download.note.macos': 'Apple silicon for M1 and later, Intel for older Macs',
  'download.note.windows': 'Installer for 64-bit Windows',
  'download.all':
    'Every build, and its release notes, on the <link>releases page</link>.',
  'download.source': 'Or build it from the sources, with Node 26:',
  'download.contributing':
    'Contributions are welcome: see <link>CONTRIBUTING.md</link>.',

  'foot.credits': 'Tiana Tables · MIT · Julien Deniau',
  'foot.issues': 'Issues',
  'foot.releases': 'Releases',
};
