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
  'rawSql.result.title': 'Result',
  'rawSql.submit': 'Submit',
  'sqlPanel.callerButton': 'SQL',
  'table.filters.title': 'Filters',
  'table.rows.loadMore': 'Load more…',
  'tableList.navigate': 'Navigate',
  'theme.group.dark': 'Dark',
  'theme.group.light': 'Light',
  'theme.switch.label': 'Theme:',
};
