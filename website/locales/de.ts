import { SiteMessages } from './type';

const de: SiteMessages = {
  'meta.title': 'Tiana Tables: ein SQL-Client für Entwickler:innen',
  'meta.description':
    'Ein MySQL-, MariaDB- und PostgreSQL-Client für Entwickler:innen, unter Linux, macOS und Windows. Sieh dir deine Daten an, frag sie ab und bearbeite sie effizient. Einfach zu bedienen und schön.',
  'nav.label': 'Abschnitte',
  'nav.editor': 'Editor',
  'nav.browse': 'Durchsuchen',
  'nav.keyboard': 'Tastatur',
  'nav.privacy': 'Datenschutz',
  'nav.charts': 'Diagramme',
  'nav.themes': 'Themes',
  'nav.ssh': 'SSH',
  'nav.download': 'Download',
  'language.current': 'Sprache: {name}',
  'theme.label': 'Theme',
  'theme.system': 'System-Theme',
  'theme.dark': 'Dunkel',
  'theme.light': 'Hell',

  'hero.eyebrow': 'MySQL · MariaDB · PostgreSQL · Linux, macOS, Windows',
  'hero.title': 'Ein SQL-Client für Entwickler:innen',
  'hero.title.short': 'Ein SQL-Client für Devs',
  'hero.lead':
    'Sieh dir deine Daten an, frag sie ab und bearbeite sie effizient, ohne die Hände von der Tastatur zu nehmen. Einfach zu bedienen, schön und plattformübergreifend.',
  'hero.download': 'Herunterladen',
  'hero.source': 'Code auf GitHub',
  'hero.other': 'Andere Plattformen',
  'spec.engines': 'Datenbanken',
  'spec.engines.value': 'MySQL, MariaDB, PostgreSQL',
  'spec.runsOn': 'Systeme',
  'spec.runsOn.value': 'Linux, macOS, Windows',
  'spec.connects': 'Verbindung',
  'spec.connects.value': 'Direkt, SSL oder SSH-Tunnel',
  'spec.themes': 'Themes',
  'spec.themes.value': '{count, number} Themes',
  'spec.languages': 'Sprachen',
  'spec.languages.value': 'Englisch, Französisch',
  'spec.account': 'Konto',
  'spec.account.value': 'Keines. Keine Telemetrie',
  'spec.license': 'Lizenz',
  'spec.latest': 'Version',
  'app.label':
    'Tiana Tables zeigt die Tabelle article, gefiltert nach ihrem Status',
  'app.caption':
    'Dieses Fenster ist HTML, gezeichnet mit der in der Titelleiste gewählten Palette, wie die App. Beispieldaten: „Le Fil“, der Entwicklungsdatensatz.',

  'editor.title': 'SQL-Editor',
  'editor.meta': 'Monaco, der Editor von VS Code',
  'editor.lead':
    'Er kennt den SQL-Dialekt und das Schema deiner Datenbank, also kann er mehr, als Schlüsselwörter einzufärben.',
  'editor.items': [
    'Vervollständigt Tabellen, Spalten und Aliase. Nach <code>a.</code> bekommst du die Spalten dieser Tabelle und nichts anderes.',
    'Wird eine Tabelle in <code>FROM</code> oder <code>JOIN</code> vervollständigt, schreibt er ihren Alias dazu, und die <code>ON</code>-Klausel, wenn ein Fremdschlüssel sie mit einer Tabelle verbindet, die schon in der Abfrage steht.',
    'Schlägt nur die Schlüsselwörter vor, die an der Cursorposition gültig sind.',
    'Unterstreicht Syntaxfehler beim Tippen und warnt bei unbekannten Spalten wie <code>u.emial</code>. Nie bei gültigem SQL.',
    'Führt die Anweisung unter dem Cursor aus, oder alle der Reihe nach, bis zum ersten Fehler.',
  ],
  'editor.label': 'SQL-Abfrage mit geöffneter Vervollständigungsliste nach a.',

  'browse.title': 'Durchsuchen',
  'browse.meta': 'virtualisiertes Grid, sofortiges Rendering',
  'browse.lead':
    'Eine breite Tabelle scrollt ruckelfrei, und die nächsten Zeilen sind einen Klick entfernt.',
  'browse.items': [
    'Filtere mit einer <code>WHERE</code>-Klausel, die für jede Tabelle gespeichert wird.',
    'Ein Rechtsklick auf eine Zelle filtert nach ihrem Wert, nach deiner Zwischenablage oder wonach du willst.',
    'Fremdschlüssel sind Links: Ein Klick führt zur referenzierten Zeile.',
    'Kopiere die Werte der angeklickten Zellen oder ganze Zeilen als TSV, CSV, Markdown, JSON oder <code>INSERT</code>-Anweisungen.',
  ],

  'edit.title': 'Bearbeiten',
  'edit.meta': 'optimistische Konflikterkennung',
  'edit.lead':
    'Ein Doppelklick auf eine Zelle öffnet den Editor für den Typ ihrer Spalte.',
  'edit.editors.label': 'Zelleditoren',
  'edit.editors': ['Datumsauswahl', 'ENUM / SET', 'JSON', 'Text'],
  'edit.text':
    'Wenn sich der Wert geändert hat oder die Zeile gelöscht wurde, seit du sie geladen hast, entscheidest du, was passiert. Nichts wird stillschweigend überschrieben. Eine Zelle, in die nicht geschrieben werden kann, sagt, warum: kein Primärschlüssel, generierte Spalte, Binärspalte.',

  'keyboard.title': 'Tastatur',
  'keyboard.meta': 'die wichtigsten Tastenkürzel',
  'keyboard.lead':
    'Von einer Tabelle zur nächsten, vom Grid zum Editor: Deine Hände können auf der Tastatur bleiben.',
  'keyboard.text':
    'Die Tastenkürzel orientieren sich an VS Code und deinem Browser, und Menüs und Buttons zeigen sie an: So lernst du sie nebenbei.',
  'keyboard.navigate': 'Zu einer Tabelle oder Datenbank springen',
  'keyboard.sqlPanel': 'SQL-Panel öffnen',
  'keyboard.run': 'Anweisung unter dem Cursor ausführen',
  'keyboard.move': 'Von Zelle zu Zelle wechseln',
  'keyboard.extend': 'Auswahl erweitern',
  'keyboard.edit': 'Zelle bearbeiten',
  'keyboard.delete': 'Auf NULL setzen oder die Zeilen löschen',
  'keyboard.copy': 'Zellen oder Zeilen kopieren',
  'keyboard.goToId': 'Zu einer Zeile per id springen',
  'keyboard.escape.key': 'Esc',
  'keyboard.escape': 'Auswahl aufheben',
  'keyboard.connection': 'Nächste Verbindung',
  'keyboard.history': 'Zurück, vorwärts',

  'privacy.title': 'Dein Rechner',
  'privacy.meta': 'Zugangsdaten',
  'privacy.statement': [
    'Kein Konto.',
    'Keine Cloud-Synchronisierung.',
    'Keine Telemetrie.',
  ],
  'privacy.lead':
    'Tiana Tables läuft auf deinem Rechner, verbunden mit deinen Datenbanken.',
  'privacy.text':
    'Die Passwörter der Verbindungen werden über den Schlüsselbund des Systems verschlüsselt. Gibt es keinen, sagt dir die App, dass die Passwörter nur verschleiert sind, statt so zu tun, als wäre es anders.',

  'databases.title': 'Datenbanken',
  'databases.meta': 'der Umfang',
  'databases.ssl': 'SSL, erforderlich oder verifiziert',
  'databases.ssh': 'SSH-Tunnel',
  'databases.others': 'Andere SQL-Datenbanksysteme',
  'databases.admin': 'Server- und Benutzerverwaltung',
  'databases.supported': 'unterstützt',
  'databases.outOfScope': 'nicht vorgesehen',
  'databases.text':
    'Eine PostgreSQL-Verbindung öffnet eine Datenbank und listet deren Schemas dort auf, wo ein MySQL-Server seine Datenbanken auflistet. Ein anderes Datenbanksystem, das dem SQL-Standard nahe genug ist, kann in einem Issue besprochen werden.',

  'charts.title': 'Diagramme',
  'charts.meta': 'Balken oder Linien, aus jedem Ergebnis',
  'charts.lead':
    'Jedes Ergebnis einer SQL-Abfrage mit einer numerischen Spalte wird zum Balken- oder Liniendiagramm. Du wählst die X-Achse und die Datenreihen.',
  'charts.quote':
    'Ein Ergebnis mit <code>LIMIT</code> wird absichtlich abgelehnt: Das Diagramm eines Teilergebnisses lügt.',
  'charts.text':
    'Kopiere es als Bild oder speichere es als PNG für die Folie, um die man dich gebeten hat.',
  'charts.label':
    'Monatliche Lesevorgänge und identifizierte Leser, Januar 2024 bis September 2026, beide steigend',

  'themes.title': 'Themes',
  'themes.meta': '{count, number} base16-Paletten · T schaltet weiter',
  'themes.lead':
    'Von Dracula bis Solarized, hell und dunkel. Das Theme gilt für die ganze App, Grid und SQL-Editor inklusive. Diese Seite nutzt dieselben Paletten: Such dir eine aus.',

  'ssh.title': 'SSH-Tunnel',
  'ssh.meta': 'seit v1.24.0',
  'ssh.lead':
    'Erreiche eine Datenbank hinter einem SSH-Server, so wie es dein Terminal tut.',
  'ssh.items': [
    'Der Tunnel führt den <code>ssh</code>-Befehl deines Rechners aus: Es gelten deine <code>~/.ssh/config</code>, deine <code>known_hosts</code> und dein SSH-Agent.',
    'Lass den SSH-Benutzer leer, dann kommt er aus deiner Config.',
    'Was ssh fragt, fragt die App: Ein unbekannter Server zeigt seinen Fingerabdruck, bevor du ihm vertraust, und eine Passphrase wird abgefragt, wenn ein Schlüssel eine braucht.',
    'Host und Port der Datenbank sind die, die der SSH-Server sieht.',
  ],
  'ssh.caption':
    'Beispielwerte, im Formular und in der Frage, die die App stellt.',

  'download.title': 'Download',
  'download.meta': 'v{version} · MIT',
  'download.platform': 'Plattform',
  'download.file': 'Datei',
  'download.row.deb': 'Linux · Debian, Ubuntu',
  'download.row.rpm': 'Linux · Fedora, openSUSE',
  'download.row.macArm': 'macOS · Apple silicon',
  'download.row.macIntel': 'macOS · Intel',
  'download.row.windowsSetup': 'Windows',
  'download.button.deb': '.deb herunterladen',
  'download.button.rpm': '.rpm herunterladen',
  'download.button.macArm': 'Für Apple silicon herunterladen',
  'download.button.macIntel': 'Intel',
  'download.button.windowsSetup': 'Für Windows herunterladen',
  'download.note.linux':
    '.deb für Debian und Ubuntu, .rpm für Fedora und openSUSE',
  'download.note.macos': 'Apple silicon ab M1, Intel für ältere Macs',
  'download.note.windows': 'Installer für Windows 64-Bit',
  'download.all':
    'Alle Versionen, mit ihren Release Notes, auf der <link>Releases-Seite</link>.',
  'download.source': 'Oder kompiliere es aus dem Quellcode, mit Node 26:',
  'download.contributing':
    'Beiträge sind willkommen: siehe <link>CONTRIBUTING.md</link>.',

  'foot.credits': 'Tiana Tables · MIT · Julien Deniau',
  'foot.issues': 'Issues',
  'foot.releases': 'Releases',
};

export default de;
