export default {
  cancel: 'Cancel',
  edit: 'Edit',
  save: 'Save',
  filter: 'Filter',
  'cell.detail.conflict.changed.description':
    'This cell was written by someone else since the row was loaded. Reload to start over from the current value, or overwrite it.',
  'cell.detail.conflict.changed.title': 'The value changed in the database',
  'cell.detail.conflict.deleted.description':
    'The row was deleted since it was loaded, so nothing was written.',
  'cell.detail.conflict.deleted.title': 'The row no longer exists',
  'cell.detail.conflict.overwrite': 'Overwrite',
  'cell.detail.conflict.reload': 'Reload',
  // ICU select on the `ValidationError` enum
  'cell.detail.error':
    '{error, select, invalidJson {This is not valid JSON.} other {This value cannot be saved.}}',
  'cell.detail.nullPlaceholder': '(NULL)',
  // ICU select on the `NotEditableReason` enum
  'cell.detail.readOnly':
    '{reason, select,' +
    ' binary {Read-only: a binary column cannot be edited as text.}' +
    ' generated {Read-only: this column is computed by the server.}' +
    ' noPrimaryKey {Read-only: no primary key identifies this row.}' +
    ' unknownColumn {Read-only: this column belongs to no table of this database.}' +
    ' other {Read-only.}}',
  'cell.detail.setNull': 'Set to NULL',
  'config.encryption.insecureBackend.detail':
    'Storage backend: {backend}. Install a keyring (gnome-keyring, KWallet) and restart the application to store your passwords encrypted.',
  'config.encryption.insecureBackend.message':
    'No system keyring was found, so your connection passwords are only obfuscated, not encrypted.',
  'config.encryption.insecureBackend.title': 'Passwords are not encrypted',
  'config.encryption.unavailable.message':
    'Your system refused to encrypt the connection passwords, so the configuration was not saved. Unlock your keyring, then try again.',
  'config.encryption.unavailable.title': 'Configuration not saved',
  'chart.axis.x': 'X axis',
  'chart.axis.y': 'Series',
  'chart.kind.bar': 'Bars',
  'chart.kind.line': 'Line',
  'chart.tab.chart': 'Chart',
  'chart.tab.data': 'Data',
  'chart.truncated': 'Only the first {count, number} rows are plotted.',
  // ICU select on the `ChartUnavailableReason` enum
  'chart.unavailable':
    '{reason, select,' +
    ' notTabular {This result has no rows to plot.}' +
    ' hasLimit {The query has a LIMIT: the result is partial, and a chart of it would be misleading. Remove the LIMIT to plot it.}' +
    ' noRow {The query returned no row.}' +
    ' noNumericColumn {Plotting needs a numeric column to chart against another column.}' +
    ' other {This result cannot be plotted.}}',
  'connect.new': 'New…',
  'connection.create.button': 'Create connection…',
  'connection.form.action.connect': 'Connect',
  'connection.form.action.saveAndConnect': 'Save and connect',
  'connection.form.host.label': 'Host',
  'connection.form.name.label': 'Name',
  'connection.form.password.label': 'Password',
  'connection.form.port.label': 'Port',
  'connection.form.user.label': 'User',
  'error.connection.notFound': 'Connection not found',
  'errorPage.goHome': 'Go back to the home page',
  'errorPage.sorry': 'Sorry, an unexpected error has occurred.',
  'errorPage.title': 'Oops!',
  'language.switch.label': 'Lang:',
  'menu.help.configuration': 'Configuration',
  'menu.help.dataFolders': 'Data folders',
  'menu.help.githubRepository': 'GitHub repository',
  'menu.help.logs': 'Logs',
  'menu.navigate.newConnection': 'New Connection',
  'menu.navigate.next': 'Next',
  'menu.navigate.openNavigationPanel': 'Open navigation panel',
  'menu.navigate.previous': 'Previous',
  'menu.navigate.sqlPanel': 'SQL Panel',
  'menu.navigate': 'Navigate',
  'navigation_modal.search.placeholder': 'Start searching…',
  'navigation_modal.title': 'Navigate',
  'rawSql.result.affectedRows': 'Affected rows:',
  'rawSql.result.insertId': 'Insert ID:',
  'rawSql.result.noStatement': 'The editor holds no query to run.',
  'rawSql.result.statement': 'Query {number}: {sql}',
  'rawSql.result.title': 'Result',
  'rawSql.run.description':
    '{mode, select,' +
    ' all {Every query of the editor, in order, stopping at the first error.}' +
    ' other {Only the query the caret sits in is sent.}}',
  'rawSql.run.label':
    '{mode, select,' +
    ' all {Run all queries}' +
    ' other {Run the query under the caret}}',
  'rawSql.run.more': 'Other ways to run',
  'rawSql.submit': 'Run query',
  'sqlPanel.callerButton': 'SQL',
  'table.contextMenu.filter': 'Filter',
  'table.contextMenu.filter.cellValue': 'Cell value',
  'table.contextMenu.filter.clipboard': 'Clipboard',
  'table.contextMenu.filter.freeText': '…',
  'table.contextMenu.filter.freeText.title': 'Filter on a value',
  'table.filters.title': 'Filters',
  'table.rows.loadMore': 'Load more…',
  'tableList.navigate': 'Navigate',
  'theme.group.dark': 'Dark',
  'theme.group.light': 'Light',
  'theme.switch.label': 'Theme:',
  'update.available':
    '{source, select,' +
    ' appimage {Version {version} is available — download the new AppImage from GitHub.}' +
    ' linuxPackage {Version {version} is available — download the new package from GitHub.}' +
    ' selfUpdating {Version {version} is available. The automatic update did not apply it: download it from GitHub.}' +
    ' other {Version {version} is available on GitHub.}}',
};
