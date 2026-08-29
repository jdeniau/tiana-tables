import { Translation } from './type';

const fr: Translation = {
  cancel: 'Annuler',
  edit: 'Modifier',
  save: 'Enregistrer',
  filter: 'Filtrer',
  'cell.detail.conflict.changed.description':
    "Cette cellule a été modifiée par quelqu'un d'autre depuis le chargement de la ligne. Rechargez pour repartir de la valeur actuelle, ou écrasez-la.",
  'cell.detail.conflict.changed.title':
    'La valeur a changé dans la base de données',
  'cell.detail.conflict.deleted.description':
    "La ligne a été supprimée depuis son chargement : rien n'a été écrit.",
  'cell.detail.conflict.deleted.title': "La ligne n'existe plus",
  'cell.detail.conflict.overwrite': 'Écraser',
  'cell.detail.conflict.reload': 'Recharger',
  // ICU select on the `ValidationError` enum
  'cell.detail.error':
    "{error, select, invalidJson {Ce n'est pas du JSON valide.} other {Cette valeur ne peut pas être enregistrée.}}",
  'cell.detail.nullPlaceholder': '(NULL)',
  // ICU select on the `NotEditableReason` enum
  'cell.detail.readOnly':
    '{reason, select,' +
    ' binary {Lecture seule : une colonne binaire ne peut pas être modifiée comme du texte.}' +
    ' generated {Lecture seule : cette colonne est calculée par le serveur.}' +
    " noPrimaryKey {Lecture seule : aucune clé primaire n'identifie cette ligne.}" +
    " unknownColumn {Lecture seule : cette colonne n'appartient à aucune table de cette base.}" +
    ' other {Lecture seule.}}',
  'cell.detail.setNull': 'Mettre à NULL',
  'config.encryption.insecureBackend.detail':
    'Backend de stockage : {backend}. Installez un trousseau (gnome-keyring, KWallet) et redémarrez l’application pour chiffrer vos mots de passe.',
  'config.encryption.insecureBackend.message':
    'Aucun trousseau système n’a été trouvé : vos mots de passe de connexion sont seulement obfusqués, pas chiffrés.',
  'config.encryption.insecureBackend.title': 'Mots de passe non chiffrés',
  'config.encryption.unavailable.message':
    'Votre système a refusé de chiffrer les mots de passe de connexion, la configuration n’a donc pas été enregistrée. Déverrouillez votre trousseau puis réessayez.',
  'config.encryption.unavailable.title': 'Configuration non enregistrée',
  'chart.axis.x': 'Axe X',
  'chart.axis.y': 'Séries',
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
  'connect.new': 'Nouveau…',
  'connection.create.button': 'Créer une connexion…',
  'connection.form.action.connect': 'Connecter',
  'connection.form.action.saveAndConnect': 'Enregistrer et connecter',
  'connection.form.host.label': 'Hôte',
  'connection.form.name.label': 'Nom',
  'connection.form.password.label': 'Mot de passe',
  'connection.form.port.label': 'Port',
  'connection.form.user.label': 'Utilisateur',
  'error.connection.notFound': 'Connexion introuvable',
  'errorPage.goHome': "Retourner à la page d'accueil",
  'errorPage.sorry': "Désolé, une erreur inattendue s'est produite.",
  'errorPage.title': 'Oups !',
  'language.switch.label': 'Langue :',
  'menu.help.configuration': 'Configuration',
  'menu.help.dataFolders': 'Dossiers de données',
  'menu.help.githubRepository': 'Dépôt GitHub',
  'menu.help.logs': 'Journaux',
  'menu.navigate.newConnection': 'Nouvelle connexion',
  'menu.navigate.next': 'Suivant',
  'menu.navigate.openNavigationPanel': 'Ouvrir le panneau de navigation',
  'menu.navigate.previous': 'Précédent',
  'menu.navigate.sqlPanel': 'Panneau SQL',
  'menu.navigate': 'Naviguer',
  'navigation_modal.search.placeholder': 'Commencer à chercher…',
  'navigation_modal.title': 'Naviguer',
  'rawSql.result.affectedRows': 'Lignes affectées :',
  'rawSql.result.insertId': 'ID inséré :',
  'rawSql.result.title': 'Résultat :',
  'rawSql.submit': 'Soumettre',
  'sqlPanel.callerButton': 'SQL',
  'table.contextMenu.filter': 'Filtre',
  'table.contextMenu.filter.cellValue': 'Valeur de la cellule',
  'table.contextMenu.filter.clipboard': 'Presse-papier',
  'table.contextMenu.filter.freeText': '…',
  'table.contextMenu.filter.freeText.title': 'Filtrer sur une valeur',
  'table.filters.title': 'Filtres',
  'table.rows.loadMore': 'Charger plus…',
  'tableList.navigate': 'Naviguer',
  'theme.group.dark': 'Sombres',
  'theme.group.light': 'Clairs',
  'theme.switch.label': 'Thème :',
  'update.available':
    '{source, select,' +
    ' appimage {La version {version} est disponible — télécharge le nouvel AppImage depuis GitHub.}' +
    ' linuxPackage {La version {version} est disponible — télécharge le nouveau paquet depuis GitHub.}' +
    " selfUpdating {La version {version} est disponible. La mise à jour automatique ne l'a pas appliquée : télécharge-la depuis GitHub.}" +
    ' other {La version {version} est disponible sur GitHub.}}',
};

export default fr;
