import { SiteMessages } from './type';

const fr: SiteMessages = {
  'meta.title': 'Tiana Tables : un client SQL pour les développeur·euse·s',
  'meta.description':
    'Un client MySQL, MariaDB et PostgreSQL pour les développeur·euse·s, sous Linux, macOS et Windows. Naviguez, requêtez et modifiez vos données efficacement. Facile à utiliser et joli.',
  'nav.label': 'Sections',
  'nav.editor': 'Éditeur',
  'nav.browse': 'Parcourir',
  'nav.keyboard': 'Clavier',
  'nav.privacy': 'Confidentialité',
  'nav.charts': 'Graphes',
  'nav.themes': 'Thèmes',
  'nav.ssh': 'SSH',
  'nav.download': 'Télécharger',
  'language.current': 'Langue : {name}',
  'theme.label': 'Thème',
  'theme.system': 'Thème du système',
  'theme.dark': 'Sombres',
  'theme.light': 'Clairs',

  'hero.eyebrow': 'MySQL · MariaDB · PostgreSQL · Linux, macOS, Windows',
  'hero.title': 'Un client SQL pour les développeur·euse·s',
  'hero.title.short': 'Un client SQL pour les devs',
  'hero.lead':
    'Naviguez, requêtez et modifiez vos données efficacement, sans lâcher le clavier. Facile à utiliser, joli et multiplateforme.',
  'hero.download': 'Télécharger',
  'hero.source': 'Le code sur GitHub',
  'hero.other': 'Autres plateformes',
  'spec.engines': 'Moteurs',
  'spec.engines.value': 'MySQL, MariaDB, PostgreSQL',
  'spec.runsOn': 'Systèmes',
  'spec.runsOn.value': 'Linux, macOS, Windows',
  'spec.connects': 'Connexion',
  'spec.connects.value': 'Directe, SSL ou tunnel SSH',
  'spec.themes': 'Thèmes',
  'spec.themes.value': '{count, number} thèmes',
  'spec.languages': 'Langues',
  'spec.languages.value': 'Français, anglais',
  'spec.account': 'Compte',
  'spec.account.value': 'Aucun. Aucune télémétrie',
  'spec.license': 'Licence',
  'spec.latest': 'Version',
  'app.label': 'Tiana Tables affiche la table article, filtrée sur son statut',
  'app.caption':
    'Cette fenêtre est du HTML, dessiné avec la palette choisie dans la barre de titre, comme dans l’application. Données d’exemple : « Le Fil », le jeu de données de développement.',

  'editor.title': 'Éditeur SQL',
  'editor.meta': 'Monaco, l’éditeur de VS Code',
  'editor.lead':
    'Il connaît la grammaire de votre moteur et le schéma de votre base : il fait plus que colorer les mots-clés.',
  'editor.items': [
    'Il complète les tables, les colonnes et les alias. Après <code>a.</code>, vous obtenez les colonnes de cette table, et rien d’autre.',
    'Compléter une table dans un <code>FROM</code> ou un <code>JOIN</code> écrit son alias, et la clause <code>ON</code> quand une clé étrangère la relie à une table déjà dans la requête.',
    'Il ne propose que les mots-clés valides à la position du curseur.',
    'Il souligne les erreurs de syntaxe pendant la frappe, et signale les colonnes inconnues comme <code>u.emial</code>. Jamais sur du SQL valide.',
    'Il exécute la requête sous le curseur, ou toutes dans l’ordre, en s’arrêtant à la première erreur.',
  ],
  'editor.label': 'Requête SQL avec la liste de complétion ouverte après a.',

  'browse.title': 'Parcourir',
  'browse.meta': 'grille virtualisée, rendu instantané',
  'browse.lead':
    'Une table très large défile sans à-coups, et les lignes suivantes sont à un clic.',
  'browse.items': [
    'Filtrez avec une clause <code>WHERE</code>, retenue pour chaque table.',
    'Un clic droit sur une cellule filtre sur sa valeur, sur votre presse-papiers ou sur ce que vous voulez.',
    'Les clés étrangères sont des liens : un clic mène à la ligne référencée.',
    'Copiez les valeurs des cellules cliquées, ou des lignes entières en TSV, CSV, Markdown, JSON ou <code>INSERT</code> SQL.',
  ],

  'edit.title': 'Modifier',
  'edit.meta': 'détection optimiste des conflits',
  'edit.lead':
    'Un double-clic sur une cellule ouvre l’éditeur du type de sa colonne.',
  'edit.editors.label': 'Éditeurs de cellule',
  'edit.editors': ['date', 'ENUM / SET', 'JSON', 'texte'],
  'edit.text':
    'Si la valeur a changé, ou si la ligne a été supprimée, depuis son chargement, c’est vous qui choisissez. Rien n’est écrasé en silence. Une cellule qui ne peut pas être écrite dit pourquoi : pas de clé primaire, colonne générée, colonne binaire.',

  'keyboard.title': 'Clavier',
  'keyboard.meta': 'les principaux raccourcis',
  'keyboard.lead':
    'D’une table à l’autre, de la grille à l’éditeur : les mains peuvent rester sur le clavier.',
  'keyboard.text':
    'Les touches suivent VS Code et votre navigateur, et les menus et les boutons affichent les leurs : on les apprend en s’en servant.',
  'keyboard.navigate': 'Aller à une table ou une base',
  'keyboard.sqlPanel': 'Ouvrir le panneau SQL',
  'keyboard.run': 'Exécuter la requête sous le curseur',
  'keyboard.move': 'Passer d’une cellule à l’autre',
  'keyboard.extend': 'Étendre la sélection',
  'keyboard.edit': 'Modifier la cellule',
  'keyboard.delete': 'Mettre à NULL, ou supprimer les lignes',
  'keyboard.copy': 'Copier les cellules ou les lignes',
  'keyboard.goToId': 'Aller à une ligne par son id',
  'keyboard.escape.key': 'Échap',
  'keyboard.escape': 'Vider la sélection',
  'keyboard.connection': 'Connexion suivante',
  'keyboard.history': 'Précédent, suivant',

  'privacy.title': 'Votre machine',
  'privacy.meta': 'identifiants',
  'privacy.statement': [
    'Pas de compte.',
    'Pas de synchro cloud.',
    'Pas de télémétrie.',
  ],
  'privacy.lead':
    'Tiana Tables tourne sur votre machine, face à vos bases de données.',
  'privacy.text':
    'Les mots de passe des connexions sont chiffrés par le trousseau du système. S’il n’y en a pas, l’application vous dit qu’ils sont seulement obscurcis, au lieu de faire semblant.',

  'databases.title': 'Bases de données',
  'databases.meta': 'le périmètre',
  'databases.ssl': 'SSL, requis ou vérifié',
  'databases.ssh': 'Tunnel SSH',
  'databases.others': 'Autres moteurs SQL',
  'databases.admin': 'Administration du serveur et des utilisateurs',
  'databases.supported': 'pris en charge',
  'databases.outOfScope': 'hors périmètre',
  'databases.text':
    'Une connexion PostgreSQL ouvre une base, et liste ses schémas là où un serveur MySQL liste ses bases. Un autre moteur assez proche du standard SQL peut se discuter dans une issue.',

  'charts.title': 'Graphes',
  'charts.meta': 'barres ou lignes, depuis tout résultat',
  'charts.lead':
    'Tout résultat de requête SQL avec une colonne numérique devient un graphe en barres ou en lignes. Vous choisissez l’axe X et les séries.',
  'charts.quote':
    'Un résultat avec un <code>LIMIT</code> est refusé exprès : le graphe d’un résultat partiel ment.',
  'charts.text':
    'Copiez-le comme image, ou enregistrez-le en PNG pour la diapo qu’on vous a demandée.',
  'charts.label':
    'Lectures et lecteurs identifiés par mois, de janvier 2024 à septembre 2026, tous deux en hausse',

  'themes.title': 'Thèmes',
  'themes.meta':
    '{count, number} palettes base16 · T pour passer à la suivante',
  'themes.lead':
    'De Dracula à Solarized, clairs et sombres. Le thème s’applique à toute l’application, grille et éditeur SQL compris. Cette page utilise les mêmes palettes : choisissez-en une.',

  'ssh.title': 'Tunnel SSH',
  'ssh.meta': 'depuis la v1.24.0',
  'ssh.lead':
    'Atteignez une base derrière un serveur SSH, comme le fait votre terminal.',
  'ssh.items': [
    'Le tunnel lance la commande <code>ssh</code> de votre machine : votre <code>~/.ssh/config</code>, vos <code>known_hosts</code> et votre agent SSH s’appliquent.',
    'Laissez l’utilisateur SSH vide, il vient de votre config.',
    'Ce que ssh demande, l’application le demande : un serveur inconnu montre son empreinte avant que vous lui fassiez confiance, une passphrase est demandée quand une clé en a une.',
    'L’hôte et le port de la base sont ceux que voit le serveur SSH.',
  ],
  'ssh.caption':
    'Valeurs d’exemple, dans le formulaire et la question que montre l’application.',

  'download.title': 'Télécharger',
  'download.meta': 'v{version} · MIT',
  'download.platform': 'Plateforme',
  'download.file': 'Fichier',
  'download.row.deb': 'Linux · Debian, Ubuntu',
  'download.row.rpm': 'Linux · Fedora, openSUSE',
  'download.row.macArm': 'macOS · Apple silicon',
  'download.row.macIntel': 'macOS · Intel',
  'download.row.windowsSetup': 'Windows',
  'download.button.deb': 'Télécharger le .deb',
  'download.button.rpm': 'Télécharger le .rpm',
  'download.button.macArm': 'Télécharger pour Apple silicon',
  'download.button.macIntel': 'Intel',
  'download.button.windowsSetup': 'Télécharger pour Windows',
  'download.note.linux':
    '.deb pour Debian et Ubuntu, .rpm pour Fedora et openSUSE',
  'download.note.macos':
    'Apple silicon à partir des M1, Intel pour les Mac plus anciens',
  'download.note.windows': 'Installeur pour Windows 64 bits',
  'download.all':
    'Toutes les versions, avec leurs notes, sur la <link>page des releases</link>.',
  'download.source': 'Ou compilez-le depuis les sources, avec Node 26 :',
  'download.contributing':
    'Les contributions sont bienvenues : voir <link>CONTRIBUTING.md</link>.',

  'foot.credits': 'Tiana Tables · MIT · Julien Deniau',
  'foot.issues': 'Issues',
  'foot.releases': 'Releases',
};

export default fr;
