/** Opens the find widget of the Monaco editor holding the focus; tells whether one does. */
export function findInFocusedEditor(): boolean {
  const focused = document.activeElement;

  if (!focused?.closest('.monaco-editor')) {
    return false;
  }

  // loaded already, since an editor is mounted: a static import would bundle Monaco with the page
  void import('monaco-editor').then(({ editor }) =>
    editor
      .getEditors()
      .find((mounted) => mounted.getContainerDomNode().contains(focused))
      ?.getAction('actions.find')
      ?.run()
  );

  return true;
}
