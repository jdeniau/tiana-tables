import { Translation } from './type';

const fr: Translation = {
  cancel: 'Annuler',
  edit: 'Modifier',
  save: 'Enregistrer',
  filter: 'Filtrer',
  // ICU select on the `ValidationError` enum
  'cell.detail.error':
    "{error, select, invalidJson {Ce n'est pas du JSON valide.} other {Cette valeur ne peut pas être enregistrée.}}",
  'cell.detail.linkedRow.label': 'Ligne liée',
  'cell.detail.linkedRow.noRow': "Aucune ligne dans {table} n'a {key}",
  'cell.detail.linkedRow.searching': 'recherche…',
  'cell.detail.linkedRow.showMore':
    "{count, plural, one {Afficher l'autre colonne} other {Afficher les # autres colonnes}}",
  'cell.detail.nullPlaceholder': '(NULL)',
  // ICU select on the `NotEditableReason` enum
  'cell.detail.readOnly':
    '{reason, select,' +
    ' binary {Lecture seule : une colonne binaire ne peut pas être modifiée comme du texte.}' +
    ' generated {Lecture seule : cette colonne est calculée par le serveur.}' +
    " noPrimaryKey {Lecture seule : aucune clé primaire n'identifie cette ligne.}" +
    " unknownColumn {Lecture seule : cette colonne n'appartient à aucune table de cette base.}" +
    ' other {Lecture seule.}}',
  'cell.detail.serverTime':
    '{zone, select,' +
    ' none {Heure du serveur : la valeur est lue et écrite telle que le serveur la stocke, quel que soit le fuseau d’affichage de la grille.}' +
    ' other {Heure du serveur ({zone}) : la valeur est lue et écrite telle que le serveur la stocke, quel que soit le fuseau d’affichage de la grille.}}',
  'cell.detail.setNull': 'Mettre à NULL',
  'cell.foreignKey.open': 'Ouvrir la ligne référencée',
  'cell.write.cancel': 'Annuler ma modification',
  'cell.write.changed.description':
    "Cette cellule a été modifiée par quelqu'un d'autre depuis le chargement de la ligne. Écrasez-la avec votre valeur, ou annulez votre modification.",
  'cell.write.changed.title': 'La valeur a changé dans la base de données',
  'cell.write.close': 'Fermer',
  'cell.write.deleted.description':
    "La ligne a été supprimée depuis son chargement : rien n'a été écrit.",
  'cell.write.deleted.title': "La ligne n'existe plus",
  'cell.write.failed.title': "La valeur n'a pas pu être écrite",
  'cell.write.overwrite': 'Écraser',
  'cell.write.serverValue': 'Dans la base de données',
  'cell.write.yourValue': 'Votre valeur',
  'config.encryption.insecureBackend.detail':
    'Backend de stockage : {backend}. Installez un trousseau (gnome-keyring, KWallet) et redémarrez l’application pour chiffrer vos mots de passe.',
  'config.encryption.insecureBackend.message':
    'Aucun trousseau système n’a été trouvé : vos mots de passe de connexion sont seulement obfusqués, pas chiffrés.',
  'config.encryption.insecureBackend.title': 'Mots de passe non chiffrés',
  'config.encryption.unavailable.message':
    'Votre système a refusé de chiffrer les mots de passe de connexion, la configuration n’a donc pas été enregistrée. Déverrouillez votre trousseau puis redémarrez Tiana Tables.',
  'config.encryption.unavailable.title': 'Configuration non enregistrée',
  'config.unreadable.blank': 'Repartir d’une configuration vierge',
  'config.unreadable.detail':
    'Restaurer ou repartir d’une configuration vierge garde le fichier illisible sous {backupPath}.',
  'config.unreadable.empty': 'Le fichier est vide.',
  'config.unreadable.message':
    'Votre fichier de configuration est illisible : {path}',
  'config.unreadable.notAnObject':
    'Le fichier ne contient pas de configuration.',
  'config.unreadable.quit': 'Quitter pour corriger le fichier',
  'config.unreadable.restore':
    'Restaurer la version du {date, date, medium} à {date, time, short}',
  'config.unreadable.title': 'Configuration illisible',
  'config.writeFailed.message':
    'Vos changements restent dans l’app, et chaque nouveau changement réessaie de les enregistrer : ils sont perdus si vous quittez avant qu’un enregistrement réussisse. Raison : {reason}',
  'config.writeFailed.title': 'Configuration non enregistrée',
  'chart.axis.x': 'Axe X',
  'chart.axis.y': 'Séries',
  'chart.export.copied': 'Copié',
  'chart.export.copy': 'Copier en image',
  'chart.export.download': 'Enregistrer en PNG',
  'chart.kind.bar': 'Barres',
  'chart.kind.line': 'Courbe',
  'chart.tab.chart': 'Graphe',
  'chart.tab.data': 'Données',
  'chart.truncated':
    'Seules les {count, number} premières lignes sont tracées.',
  // ICU select on the `ChartUnavailableReason` enum
  'chart.unavailable':
    '{reason, select,' +
    " notTabular {Ce résultat n'a pas de lignes à tracer.}" +
    ' hasLimit {La requête a un LIMIT : le résultat est partiel, et un graphe en serait trompeur. Retirez le LIMIT pour le tracer.}' +
    " noRow {La requête n'a retourné aucune ligne.}" +
    " noNumericColumn {Il faut une colonne numérique à tracer en face d'une autre colonne.}" +
    ' other {Ce résultat ne peut pas être tracé.}}',
  'connect.new': 'Nouvelle connexion',
  'connection.connecting': 'Connexion…',
  'connection.delete.confirm': 'Supprimer',
  'connection.delete.description':
    'La connexion disparaît de la liste avec son mot de passe enregistré, sans retour possible.',
  'connection.delete.title': 'Supprimer {name} ?',
  // ICU select on `DatabaseEngine`: product names, the same in every language
  'connection.engine.name':
    '{engine, select, mysql {MySQL / MariaDB} postgresql {PostgreSQL} other {{engine}}}',
  'connection.failed.back': 'Retour aux connexions',
  // ICU select on the `ConnectionFailure` enum
  'connection.failed.reason':
    '{reason, select,' +
    " timeout {Le serveur n'a pas répondu en {seconds} secondes.}" +
    " refused {Le serveur a refusé la connexion. Vérifiez qu'il tourne, et que le port est le bon.}" +
    " unknownHost {Ce nom d'hôte n'a pas pu être résolu.}" +
    ' accessDenied {Le serveur a rejeté ces identifiants.}' +
    ' unknownDatabase {Le serveur n’a pas de base de données de ce nom.}' +
    ' tooManyConnections {Le serveur n’accepte plus de connexion pour l’instant, de cet utilisateur ou de personne.}' +
    ' encryptionRequired {Le serveur n’accepte que les connexions chiffrées. Passez SSL à Requis dans le formulaire de connexion.}' +
    ' encryptionUnsupported {Le serveur n’accepte pas les connexions chiffrées. Passez SSL à Désactivé dans le formulaire de connexion.}' +
    ' certificateRejected {Le certificat du serveur n’a pas pu être vérifié. Passez SSL à Requis pour chiffrer sans le vérifier.}' +
    ' reset {Le serveur a fermé la connexion pendant son ouverture. C’est ce que fait un serveur qui n’accepte que les connexions chiffrées : essayez de passer SSL à Requis dans le formulaire de connexion.}' +
    ' keyringLocked {Votre trousseau est verrouillé, le mot de passe enregistré n’a donc pas pu être lu. Déverrouillez-le, puis réessayez.}' +
    ' passwordUnreadable {Le mot de passe enregistré a été chiffré avec une clé que cette machine n’a plus. Saisissez-le à nouveau dans le formulaire de connexion.}' +
    ' sshMissing {Aucune commande ssh n’a été trouvée sur cette machine : le tunnel SSH utilise le client OpenSSH du système. Installez-le, puis réessayez.}' +
    ' sshAuthFailed {Le serveur SSH a refusé de vous connecter. Vérifiez que ssh s’y connecte depuis un terminal, avec le même utilisateur.}' +
    ' sshHostKeyChanged {Le serveur SSH ne présente pas la clé d’hôte que votre known_hosts a pour lui : il a peut-être été réinstallé, ou quelqu’un s’est peut-être placé entre vous deux. S’il a été réinstallé, supprimez son ancienne clé avec ssh-keygen -R, puis réessayez.}' +
    ' sshHostKeyRejected {La clé d’hôte du serveur SSH n’a pas été acceptée.}' +
    ' sshForwardFailed {Le serveur SSH n’a pas pu joindre la base de données. L’hôte et le port sont ceux que voit le serveur SSH.}' +
    " other {La connexion n'a pas pu être ouverte.}}",
  'connection.failed.retry': 'Réessayer',
  'connection.failed.target': 'La connexion à {address} a échoué',
  'connection.failed.title': 'Connexion impossible',
  'connection.form.action.connect': 'Connecter',
  'connection.form.action.delete': 'Supprimer',
  'connection.form.action.saveAndConnect': 'Enregistrer et connecter',
  'connection.form.color.custom': 'Une couleur à vous',
  'connection.form.color.label': 'Couleur',
  'connection.form.color.none': 'Aucune couleur',
  'connection.form.color.palette': 'Couleur {hex} du thème',
  'connection.form.database.label': 'Base de données',
  'connection.form.group.label': 'Groupe',
  'connection.form.group.placeholder': 'Aucun groupe',
  'connection.form.host.label': 'Hôte',
  'connection.form.name.label': 'Nom',
  'connection.form.password.label': 'Mot de passe',
  'connection.form.password.placeholder':
    'Laissez vide pour conserver le mot de passe enregistré',
  'connection.form.port.label': 'Port',
  // ICU select on the form's `Route` enum: where the host and port above are reached from
  'connection.form.route.help':
    '{route, select,' +
    ' direct {Depuis cette machine.}' +
    ' ssh {Depuis un serveur SSH, joint par la commande ssh de cette machine, comme dans un terminal : votre ~/.ssh/config, votre known_hosts et votre agent SSH s’appliquent.}' +
    ' other {}}',
  'connection.form.route.label': 'Accès',
  // ICU select on the form's `Route` enum
  'connection.form.route.option':
    '{route, select, direct {Direct} ssh {Tunnel SSH} other {{route}}}',
  'connection.form.ssh.host.label': 'Hôte SSH',
  'connection.form.ssh.user.label': 'Utilisateur SSH',
  'connection.form.ssh.user.placeholder': 'Selon ~/.ssh/config',
  'connection.form.ssl.help':
    '{mode, select,' +
    ' disable {En clair.}' +
    ' require {Chiffrée, le certificat du serveur pris tel quel.}' +
    ' verifyFull {Chiffrée, vers un certificat reconnu par votre système et au nom de cet hôte.}' +
    ' other {}}',
  'connection.form.ssl.label': 'SSL',
  'connection.form.ssl.mode':
    '{mode, select, disable {Désactivé} require {Requis} verifyFull {Vérifié} other {{mode}}}',
  'connection.form.title.create': 'Nouvelle connexion',
  'connection.form.title.edit': 'Modifier {name}',
  'connection.form.user.label': 'Utilisateur',
  'connection.list.count':
    '{count, plural, one {# enregistrée} other {# enregistrées}}',
  'connection.list.title': 'Connexions',
  'connection.ssh.question.answer':
    '{kind, select, hostKey {Faire confiance} secret {Envoyer} confirm {Autoriser} other {OK}}',
  'connection.ssh.question.cancel':
    '{kind, select, hostKey {Refuser} confirm {Refuser} notice {Fermer} other {Annuler}}',
  'connection.ssh.question.hostKeyHelp':
    'ssh ne connaît pas ce serveur sous ce nom. Ne lui faites confiance que si cette empreinte est bien la sienne : ssh l’ajoute alors à votre known_hosts.',
  'connection.ssh.question.title':
    '{kind, select, hostKey {{connection} : serveur SSH inconnu} other {{connection} : ssh demande}}',
  'dateDisplay.assumed':
    'Les dates sans fuseau (DATETIME, timestamp) sont lues comme l’heure du serveur ({zone}), puis converties.',
  'dateDisplay.label': 'Dates',
  'dateDisplay.option':
    '{display, select, server {Serveur} utc {UTC} local {Local} other {Serveur}}',
  'dateDisplay.unresolved':
    'Le serveur nomme son fuseau « {zone} », qui ne donne aucune règle pour convertir les dates, heure d’été comprise. Réglez son fuseau sur un nom, par exemple America/New_York.',
  'error.connection.notFound': 'Connexion introuvable',
  'errorPage.goHome': "Retourner à la page d'accueil",
  'errorPage.sorry': "Désolé, une erreur inattendue s'est produite.",
  'errorPage.title': 'Oups !',
  'language.switch.label': 'Langue',
  'menu.app.about': 'À propos de {name}',
  'menu.app.hide': 'Masquer {name}',
  'menu.app.hideOthers': 'Masquer les autres',
  'menu.app.quit': 'Quitter {name}',
  'menu.app.services': 'Services',
  'menu.app.unhide': 'Tout afficher',
  'menu.edit.copy': 'Copier',
  'menu.edit.cut': 'Couper',
  'menu.edit.paste': 'Coller',
  'menu.edit.pasteAndMatchStyle': 'Coller et adapter le style',
  'menu.edit.redo': 'Rétablir',
  'menu.edit.selectAll': 'Tout sélectionner',
  'menu.edit.speech': 'Parole',
  'menu.edit.startSpeaking': 'Commencer la lecture',
  'menu.edit.stopSpeaking': 'Arrêter la lecture',
  'menu.edit.undo': 'Annuler',
  'menu.edit': 'Édition',
  'menu.file': 'Fichier',
  'menu.help.configuration': 'Configuration',
  'menu.help.dataFolders': 'Dossiers de données',
  'menu.help.githubRepository': 'Dépôt GitHub',
  'menu.help.logs': 'Journaux',
  'menu.help': 'Aide',
  'menu.navigate.newConnection': 'Nouvelle connexion',
  'menu.navigate.next': 'Suivant',
  'menu.navigate.nextConnection': 'Connexion suivante',
  'menu.navigate.openNavigationPanel': 'Ouvrir le panneau de navigation',
  'menu.navigate.previous': 'Précédent',
  'menu.navigate.previousConnection': 'Connexion précédente',
  'menu.navigate.sqlPanel': 'Panneau SQL',
  'menu.navigate': 'Naviguer',
  'menu.settings': 'Réglages…',
  'menu.title': 'Menu',
  'menu.view.devTools': 'Outils de développement',
  'menu.view.forceReload': 'Forcer le rechargement',
  'menu.view.reload': 'Recharger',
  'menu.view.resetZoom': 'Taille réelle',
  'menu.view.toggleDevTools': 'Afficher les outils de développement',
  'menu.view.toggleFullScreen': 'Plein écran',
  'menu.view.togglePath': "Afficher la barre d'adresse",
  'menu.view.toggleQueryDevtools': 'Afficher les devtools de TanStack Query',
  'menu.view.zoomIn': 'Zoom avant',
  'menu.view.zoomOut': 'Zoom arrière',
  'menu.view': 'Affichage',
  'menu.window.close': 'Fermer',
  'menu.window.front': 'Tout ramener au premier plan',
  'menu.window.minimize': 'Réduire',
  'menu.window.zoom': 'Zoom',
  'menu.window': 'Fenêtre',
  'navigation_modal.search.placeholder': 'Commencer à chercher…',
  'navigation_modal.title': 'Naviguer',
  'rawSql.query.statementCount':
    '{count, plural, one {# requête} other {# requêtes}}',
  'rawSql.query.title': 'Requête',
  'rawSql.result.affectedRows': 'Lignes affectées :',
  'rawSql.result.insertId': 'ID inséré :',
  'rawSql.result.meta.duration': '{ms, number} ms',
  'rawSql.result.meta.rows':
    '{count, plural, one {# ligne} other {# lignes}} · {ms, number} ms',
  'rawSql.result.meta.selectedRows':
    '{selected, plural, one {# ligne} other {# lignes}} / {count, plural, one {# ligne} other {# lignes}} · {ms, number} ms',
  'rawSql.result.noStatement':
    "L'éditeur ne contient aucune requête à exécuter.",
  'rawSql.result.title': 'Résultat',
  'rawSql.run.description':
    '{mode, select,' +
    " all {Toutes les requêtes de l'éditeur, dans l'ordre, en s'arrêtant à la première erreur.}" +
    ' other {Seule la requête où se trouve le curseur est envoyée.}}',
  'rawSql.run.label':
    '{mode, select,' +
    ' all {Exécuter toutes les requêtes}' +
    ' other {Exécuter la requête sous le curseur}}',
  'rawSql.run.more': "Autres façons d'exécuter",
  'rawSql.submit': 'Exécuter',
  'settings.title': 'Réglages',
  'sqlPanel.callerButton': 'SQL',
  'table.columns.count': '{count, plural, one {# colonne} other {# colonnes}}',
  'table.contextMenu.copy':
    '{count, plural, one {Copier la valeur} other {Copier les # valeurs}}',
  'table.contextMenu.copyRow': 'Copier la ligne en',
  'table.contextMenu.delete':
    '{count, plural, one {Supprimer la ligne…} other {Supprimer # lignes…}}',
  'table.contextMenu.delete.shortcut': 'Suppr',
  'table.contextMenu.edit':
    '{editable, select, true {Modifier…} other {Afficher…}}',
  'table.contextMenu.edit.shortcut': 'Entrée / Double-clic',
  'table.contextMenu.filter': 'Filtre',
  'table.contextMenu.filter.cellValue': 'Valeur de la cellule',
  'table.contextMenu.filter.clipboard': 'Presse-papier',
  'table.contextMenu.filter.freeText': '…',
  'table.contextMenu.filter.freeText.title': 'Filtrer sur une valeur',
  'table.contextMenu.setNull':
    '{count, plural, one {Mettre à NULL} other {Mettre # valeurs à NULL…}}',
  'table.copy.columnNames': 'Noms de colonnes',
  'table.copy.columnNames.formats': 'TSV, CSV',
  'table.copy.format':
    '{format, select, tsv {TSV} csv {CSV} markdown {Markdown} json {JSON} sqlInsert {INSERT SQL} other {{format}}}',
  'table.copy.rowsAs':
    'Copier {count, plural, one {# ligne} other {# lignes}} en',
  'table.delete.cancel': 'Annuler',
  'table.delete.confirm': 'Supprimer',
  'table.delete.description':
    '{count, plural, one {La ligne est supprimée} other {Les # lignes sont supprimées}} de la base de données, sans retour possible.',
  'table.delete.title':
    '{count, plural, one {Supprimer cette ligne ?} other {Supprimer ces # lignes ?}}',
  'table.filters.history': 'Filtres déjà utilisés',
  'table.filters.title': 'Filtres',
  'table.goToId': "Aller à l'id…",
  'table.goToId.title': "Aller à l'id",
  'table.rowDetail.close': 'Fermer le panneau de la ligne',
  'table.rowDetail.collapse': 'Replier',
  'table.rowDetail.copied': '{name} copié',
  'table.rowDetail.expand':
    'Tout afficher · {length, plural, one {# caractère} other {# caractères}}',
  'table.rowDetail.fieldCount':
    '{shown, number} / {count, plural, one {# colonne} other {# colonnes}}',
  'table.rowDetail.filter': 'Colonne ou valeur…',
  'table.rowDetail.hint': '↑ ↓ dans la grille changent de ligne · Échap ferme',
  'table.rowDetail.moreSelected': 'et {count, number} de plus',
  'table.rowDetail.noField': 'Aucune colonne ne correspond.',
  'table.rowDetail.position': '{position, number} / {count, number}',
  'table.rowDetail.row': 'ligne {position, number}',
  'table.rowDetail.selected':
    '{count, plural, one {# ligne sélectionnée} other {# lignes sélectionnées}}',
  'table.rowDetail.title': 'Ligne',
  'table.rowDetail.toggle':
    '{shown, select, true {Fermer le panneau de la ligne} other {Voir cette ligne à côté de la grille}}',
  'table.rows.count': '{count, plural, one {# ligne} other {# lignes}}',
  'table.rows.copied':
    '{count, plural, one {# ligne copiée} other {# lignes copiées}} en {format, select, tsv {TSV} csv {CSV} markdown {Markdown} json {JSON} sqlInsert {INSERT SQL} other {{format}}}',
  'table.rows.selected':
    '{selected, plural, one {# ligne} other {# lignes}} / {count, plural, one {# ligne} other {# lignes}}',
  'table.rows.loadMore': 'Charger plus…',
  'table.setNull.cancel': 'Annuler',
  'table.setNull.confirm': 'Mettre à NULL',
  'table.setNull.description':
    '{count, plural, one {La valeur est mise à NULL} other {Les # valeurs sont mises à NULL}} dans la base de données.',
  'table.setNull.title':
    '{count, plural, one {Mettre cette valeur à NULL ?} other {Mettre ces # valeurs à NULL ?}}',
  'table.sort.hint': 'Clic pour trier, Maj+clic pour ajouter au tri',
  'table.structure.extendedType': 'Type étendu',
  'table.structure.displayAfter': "S'affiche après",
  'table.structure.displayAfter.none': 'Ordre de la base',
  'table.structure.displayAfter.overriddenByPrimaryKey':
    "Les colonnes de la clé primaire s'affichent en premier : cette colonne ne suit pas directement celle choisie",
  'table.tab.data': 'Données',
  'table.tab.structure': 'Structure',
  'table.values.copied':
    '{count, plural, one {# valeur copiée} other {# valeurs copiées}}',
  'table.view.label': 'Vue de la table',
  'tableList.count': '{count, plural, one {# table} other {# tables}}',
  'tableList.navigate': 'Aller à une table…',
  'tableTabs.close': "Fermer l'onglet",
  'theme.group.dark': 'Sombres',
  'theme.group.light': 'Clairs',
  'theme.switch.label': 'Thème',
  'titleBar.devMode': '(mode dev)',
  'update.available':
    '{source, select,' +
    ' appimage {La version {version} est disponible — télécharge le nouvel AppImage depuis GitHub.}' +
    ' linuxPackage {La version {version} est disponible — télécharge le nouveau paquet depuis GitHub.}' +
    " selfUpdating {La version {version} est disponible. La mise à jour automatique ne l'a pas appliquée : télécharge-la depuis GitHub.}" +
    ' other {La version {version} est disponible sur GitHub.}}',
  'update.restart':
    "Une mise à jour est téléchargée — clique pour redémarrer et l'installer.",
};

export default fr;
