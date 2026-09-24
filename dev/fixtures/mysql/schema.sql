-- "Le Fil": a French news site with subscriptions, as a development dataset.
SET FOREIGN_KEY_CHECKS = 0;

DROP VIEW IF EXISTS vue_article_publie;
DROP VIEW IF EXISTS vue_audience_mensuelle;

DROP TABLE IF EXISTS envoi_newsletter;
DROP TABLE IF EXISTS inscription_newsletter;
DROP TABLE IF EXISTS newsletter;
DROP TABLE IF EXISTS lecture;
DROP TABLE IF EXISTS favori;
DROP TABLE IF EXISTS signalement_commentaire;
DROP TABLE IF EXISTS commentaire;
DROP TABLE IF EXISTS remboursement;
DROP TABLE IF EXISTS paiement;
DROP TABLE IF EXISTS moyen_paiement;
DROP TABLE IF EXISTS abonnement;
DROP TABLE IF EXISTS code_promo;
DROP TABLE IF EXISTS formule_abonnement;
DROP TABLE IF EXISTS utilisateur;
DROP TABLE IF EXISTS article_revision;
DROP TABLE IF EXISTS article_media;
DROP TABLE IF EXISTS article_tag;
DROP TABLE IF EXISTS tag;
DROP TABLE IF EXISTS media;
DROP TABLE IF EXISTS article;
DROP TABLE IF EXISTS dossier;
DROP TABLE IF EXISTS categorie;
DROP TABLE IF EXISTS auteur;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE auteur (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(80) NOT NULL,
  prenom VARCHAR(60) DEFAULT NULL,
  genre ENUM('male','female','other') DEFAULT NULL,
  initiale VARCHAR(1) GENERATED ALWAYS AS (LEFT(nom, 1)) STORED,
  email VARCHAR(120) DEFAULT NULL,
  role ENUM('redacteur','pigiste','redacteur_chef','correspondant','photographe','stagiaire') NOT NULL DEFAULT 'redacteur',
  service VARCHAR(40) DEFAULT NULL COMMENT 'Rubrique de rattachement',
  biographie TEXT DEFAULT NULL,
  ville VARCHAR(60) DEFAULT NULL,
  arrive_le DATE DEFAULT NULL,
  parti_le DATE DEFAULT NULL COMMENT 'NULL tant que la personne est en poste',
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  compte_x VARCHAR(40) DEFAULT NULL,
  UNIQUE KEY uniq_auteur_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE categorie (
  id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  parent_id SMALLINT UNSIGNED DEFAULT NULL,
  nom VARCHAR(60) NOT NULL,
  slug VARCHAR(60) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  couleur CHAR(7) NOT NULL DEFAULT '#3b6ea5' COMMENT 'Couleur de la rubrique en une',
  ordre TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uniq_categorie_slug (slug),
  CONSTRAINT fk_categorie_parent FOREIGN KEY (parent_id) REFERENCES categorie (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE dossier (
  id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  titre VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  description TEXT DEFAULT NULL,
  ouvert_le DATE NOT NULL,
  clos_le DATE DEFAULT NULL,
  en_une BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE KEY uniq_dossier_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE media (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom_fichier VARCHAR(140) NOT NULL,
  type ENUM('photo','illustration','infographie','video') NOT NULL DEFAULT 'photo',
  legende VARCHAR(255) DEFAULT NULL,
  texte_alternatif VARCHAR(255) DEFAULT NULL,
  credit VARCHAR(80) DEFAULT NULL,
  licence ENUM('maison','agence','creative_commons','droits_reserves') NOT NULL DEFAULT 'maison',
  largeur SMALLINT UNSIGNED DEFAULT NULL,
  hauteur SMALLINT UNSIGNED DEFAULT NULL,
  poids_octets INT UNSIGNED DEFAULT NULL,
  auteur_id INT DEFAULT NULL,
  importe_le DATETIME NOT NULL,
  UNIQUE KEY uniq_media_fichier (nom_fichier),
  CONSTRAINT fk_media_auteur FOREIGN KEY (auteur_id) REFERENCES auteur (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE article (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titre VARCHAR(120) NOT NULL COMMENT 'Titre affiché en une',
  slug VARCHAR(160) NOT NULL,
  chapo VARCHAR(400) DEFAULT NULL COMMENT 'Résumé affiché sous le titre',
  contenu TEXT DEFAULT NULL,
  statut ENUM('brouillon','relecture','programme','publie','archive') NOT NULL DEFAULT 'brouillon',
  acces ENUM('libre','inscrit','abonne') NOT NULL DEFAULT 'libre' COMMENT 'Niveau requis pour lire l''article en entier',
  vues INT DEFAULT 0 COMMENT 'Compteur de vues, remis à zéro chaque mois',
  publie_le DATETIME DEFAULT NULL,
  modifie_le TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  auteur_id INT DEFAULT NULL,
  categorie_id SMALLINT UNSIGNED DEFAULT NULL,
  dossier_id SMALLINT UNSIGNED DEFAULT NULL,
  media_une_id INT DEFAULT NULL,
  en_une BOOLEAN NOT NULL DEFAULT FALSE,
  temps_lecture TINYINT UNSIGNED DEFAULT NULL COMMENT 'Minutes',
  nombre_mots SMALLINT UNSIGNED DEFAULT NULL,
  note_moyenne DECIMAL(3,2) DEFAULT NULL,
  metadonnees JSON DEFAULT NULL COMMENT 'Balises pour les réseaux sociaux',
  UNIQUE KEY uniq_article_slug (slug),
  KEY fk_article_auteur (auteur_id),
  KEY idx_article_publication (statut, publie_le),
  CONSTRAINT fk_article_auteur FOREIGN KEY (auteur_id) REFERENCES auteur (id),
  CONSTRAINT fk_article_categorie FOREIGN KEY (categorie_id) REFERENCES categorie (id),
  CONSTRAINT fk_article_dossier FOREIGN KEY (dossier_id) REFERENCES dossier (id),
  CONSTRAINT fk_article_media_une FOREIGN KEY (media_une_id) REFERENCES media (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE tag (
  id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(60) NOT NULL,
  slug VARCHAR(60) NOT NULL,
  usages SMALLINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Dénormalisé, recalculé chaque nuit',
  UNIQUE KEY uniq_tag_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE article_tag (
  article_id INT NOT NULL,
  tag_id SMALLINT UNSIGNED NOT NULL,
  pose_le DATETIME NOT NULL,
  PRIMARY KEY (article_id, tag_id),
  KEY idx_article_tag_tag (tag_id),
  CONSTRAINT fk_article_tag_article FOREIGN KEY (article_id) REFERENCES article (id) ON DELETE CASCADE,
  CONSTRAINT fk_article_tag_tag FOREIGN KEY (tag_id) REFERENCES tag (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE article_media (
  article_id INT NOT NULL,
  media_id INT NOT NULL,
  position TINYINT UNSIGNED NOT NULL DEFAULT 1,
  legende_specifique VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (article_id, media_id),
  KEY idx_article_media_media (media_id),
  CONSTRAINT fk_article_media_article FOREIGN KEY (article_id) REFERENCES article (id) ON DELETE CASCADE,
  CONSTRAINT fk_article_media_media FOREIGN KEY (media_id) REFERENCES media (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE article_revision (
  id INT AUTO_INCREMENT PRIMARY KEY,
  article_id INT NOT NULL,
  numero SMALLINT UNSIGNED NOT NULL,
  auteur_id INT DEFAULT NULL,
  titre VARCHAR(120) NOT NULL,
  contenu TEXT DEFAULT NULL,
  resume_modification VARCHAR(255) DEFAULT NULL,
  enregistre_le DATETIME NOT NULL,
  UNIQUE KEY uniq_revision (article_id, numero),
  CONSTRAINT fk_revision_article FOREIGN KEY (article_id) REFERENCES article (id) ON DELETE CASCADE,
  CONSTRAINT fk_revision_auteur FOREIGN KEY (auteur_id) REFERENCES auteur (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE utilisateur (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(160) NOT NULL,
  prenom VARCHAR(60) NOT NULL,
  nom VARCHAR(80) NOT NULL,
  pseudo VARCHAR(40) DEFAULT NULL,
  ville VARCHAR(60) DEFAULT NULL,
  code_postal CHAR(5) DEFAULT NULL,
  pays CHAR(2) NOT NULL DEFAULT 'FR',
  inscrit_le DATETIME NOT NULL,
  derniere_connexion DATETIME DEFAULT NULL,
  email_verifie BOOLEAN NOT NULL DEFAULT FALSE,
  accepte_prospection BOOLEAN NOT NULL DEFAULT FALSE,
  preferences JSON DEFAULT NULL COMMENT 'Rubriques suivies, notifications',
  statut ENUM('actif','inactif','suspendu','supprime') NOT NULL DEFAULT 'actif',
  UNIQUE KEY uniq_utilisateur_email (email),
  KEY idx_utilisateur_inscription (inscrit_le)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE formule_abonnement (
  id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(60) NOT NULL,
  code VARCHAR(30) NOT NULL,
  periodicite ENUM('mensuel','annuel') NOT NULL DEFAULT 'mensuel',
  prix DECIMAL(6,2) NOT NULL,
  devise CHAR(3) NOT NULL DEFAULT 'EUR',
  jours_essai TINYINT UNSIGNED NOT NULL DEFAULT 0,
  acces_archives BOOLEAN NOT NULL DEFAULT TRUE,
  nombre_comptes TINYINT UNSIGNED NOT NULL DEFAULT 1,
  description VARCHAR(255) DEFAULT NULL,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uniq_formule_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE code_promo (
  id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(24) NOT NULL,
  libelle VARCHAR(120) DEFAULT NULL,
  reduction_pourcent TINYINT UNSIGNED DEFAULT NULL,
  reduction_montant DECIMAL(6,2) DEFAULT NULL COMMENT 'Exclusif de reduction_pourcent',
  valide_du DATE NOT NULL,
  valide_au DATE DEFAULT NULL,
  utilisations_max SMALLINT UNSIGNED DEFAULT NULL,
  utilisations SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY uniq_code_promo (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE moyen_paiement (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT NOT NULL,
  type ENUM('carte','prelevement','paypal') NOT NULL DEFAULT 'carte',
  reseau ENUM('visa','mastercard','amex','cb') DEFAULT NULL,
  quatre_derniers CHAR(4) DEFAULT NULL,
  titulaire VARCHAR(100) DEFAULT NULL,
  expire_le DATE DEFAULT NULL,
  iban_masque VARCHAR(34) DEFAULT NULL,
  par_defaut BOOLEAN NOT NULL DEFAULT FALSE,
  ajoute_le DATETIME NOT NULL,
  KEY idx_moyen_paiement_utilisateur (utilisateur_id),
  CONSTRAINT fk_moyen_paiement_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateur (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE abonnement (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT NOT NULL,
  formule_id TINYINT UNSIGNED NOT NULL,
  code_promo_id SMALLINT UNSIGNED DEFAULT NULL,
  moyen_paiement_id INT DEFAULT NULL,
  statut ENUM('essai','actif','impaye','suspendu','resilie') NOT NULL DEFAULT 'actif',
  debute_le DATE NOT NULL,
  prochaine_echeance DATE DEFAULT NULL,
  resilie_le DATE DEFAULT NULL,
  motif_resiliation VARCHAR(160) DEFAULT NULL,
  renouvellement_auto BOOLEAN NOT NULL DEFAULT TRUE,
  prix_paye DECIMAL(6,2) NOT NULL COMMENT 'Prix réellement facturé, remise déduite',
  KEY idx_abonnement_utilisateur (utilisateur_id),
  KEY idx_abonnement_statut (statut),
  CONSTRAINT fk_abonnement_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateur (id) ON DELETE CASCADE,
  CONSTRAINT fk_abonnement_formule FOREIGN KEY (formule_id) REFERENCES formule_abonnement (id),
  CONSTRAINT fk_abonnement_code_promo FOREIGN KEY (code_promo_id) REFERENCES code_promo (id),
  CONSTRAINT fk_abonnement_moyen_paiement FOREIGN KEY (moyen_paiement_id) REFERENCES moyen_paiement (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE paiement (
  id INT AUTO_INCREMENT PRIMARY KEY,
  abonnement_id INT NOT NULL,
  moyen_paiement_id INT DEFAULT NULL,
  reference VARCHAR(32) NOT NULL,
  numero_facture VARCHAR(20) DEFAULT NULL,
  montant DECIMAL(8,2) NOT NULL,
  tva DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  devise CHAR(3) NOT NULL DEFAULT 'EUR',
  statut ENUM('en_attente','reussi','refuse','rembourse') NOT NULL DEFAULT 'reussi',
  motif_echec VARCHAR(120) DEFAULT NULL,
  paye_le DATETIME NOT NULL,
  periode_debut DATE DEFAULT NULL,
  periode_fin DATE DEFAULT NULL,
  UNIQUE KEY uniq_paiement_reference (reference),
  KEY idx_paiement_abonnement (abonnement_id),
  CONSTRAINT fk_paiement_abonnement FOREIGN KEY (abonnement_id) REFERENCES abonnement (id) ON DELETE CASCADE,
  CONSTRAINT fk_paiement_moyen FOREIGN KEY (moyen_paiement_id) REFERENCES moyen_paiement (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE remboursement (
  id INT AUTO_INCREMENT PRIMARY KEY,
  paiement_id INT NOT NULL,
  montant DECIMAL(8,2) NOT NULL,
  motif ENUM('doublon','erreur_facturation','geste_commercial','retractation') NOT NULL,
  commentaire VARCHAR(255) DEFAULT NULL,
  rembourse_le DATETIME NOT NULL,
  traite_par VARCHAR(80) DEFAULT NULL,
  KEY idx_remboursement_paiement (paiement_id),
  CONSTRAINT fk_remboursement_paiement FOREIGN KEY (paiement_id) REFERENCES paiement (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE commentaire (
  id INT AUTO_INCREMENT PRIMARY KEY,
  article_id INT NOT NULL,
  utilisateur_id INT DEFAULT NULL,
  parent_id INT DEFAULT NULL COMMENT 'Réponse à un autre commentaire',
  contenu TEXT NOT NULL,
  statut ENUM('en_attente','publie','masque','supprime') NOT NULL DEFAULT 'publie',
  votes_positifs SMALLINT NOT NULL DEFAULT 0,
  votes_negatifs SMALLINT NOT NULL DEFAULT 0,
  poste_le DATETIME NOT NULL,
  modere_le DATETIME DEFAULT NULL,
  modere_par INT DEFAULT NULL,
  KEY idx_commentaire_article (article_id),
  KEY idx_commentaire_utilisateur (utilisateur_id),
  CONSTRAINT fk_commentaire_article FOREIGN KEY (article_id) REFERENCES article (id) ON DELETE CASCADE,
  CONSTRAINT fk_commentaire_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateur (id) ON DELETE SET NULL,
  CONSTRAINT fk_commentaire_parent FOREIGN KEY (parent_id) REFERENCES commentaire (id) ON DELETE CASCADE,
  CONSTRAINT fk_commentaire_moderateur FOREIGN KEY (modere_par) REFERENCES auteur (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE signalement_commentaire (
  id INT AUTO_INCREMENT PRIMARY KEY,
  commentaire_id INT NOT NULL,
  utilisateur_id INT DEFAULT NULL,
  motif ENUM('injure','hors_sujet','spam','desinformation','harcelement') NOT NULL,
  precision_texte VARCHAR(255) DEFAULT NULL,
  signale_le DATETIME NOT NULL,
  traite BOOLEAN NOT NULL DEFAULT FALSE,
  decision ENUM('conserve','masque','supprime') DEFAULT NULL,
  KEY idx_signalement_commentaire (commentaire_id),
  CONSTRAINT fk_signalement_commentaire FOREIGN KEY (commentaire_id) REFERENCES commentaire (id) ON DELETE CASCADE,
  CONSTRAINT fk_signalement_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateur (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE favori (
  utilisateur_id INT NOT NULL,
  article_id INT NOT NULL,
  ajoute_le DATETIME NOT NULL,
  lu BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (utilisateur_id, article_id),
  KEY idx_favori_article (article_id),
  CONSTRAINT fk_favori_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateur (id) ON DELETE CASCADE,
  CONSTRAINT fk_favori_article FOREIGN KEY (article_id) REFERENCES article (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE lecture (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  article_id INT NOT NULL,
  utilisateur_id INT DEFAULT NULL COMMENT 'NULL pour un visiteur non connecté',
  lu_le DATETIME NOT NULL,
  duree_secondes SMALLINT UNSIGNED DEFAULT NULL,
  pourcentage_lu TINYINT UNSIGNED DEFAULT NULL,
  source ENUM('accueil','rubrique','recherche','newsletter','reseaux','moteur','notification') NOT NULL DEFAULT 'accueil',
  appareil ENUM('ordinateur','mobile','tablette') NOT NULL DEFAULT 'mobile',
  paywall_affiche BOOLEAN NOT NULL DEFAULT FALSE,
  KEY idx_lecture_article (article_id),
  KEY idx_lecture_date (lu_le),
  CONSTRAINT fk_lecture_article FOREIGN KEY (article_id) REFERENCES article (id) ON DELETE CASCADE,
  CONSTRAINT fk_lecture_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateur (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE newsletter (
  id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(80) NOT NULL,
  slug VARCHAR(80) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  periodicite ENUM('quotidienne','hebdomadaire','mensuelle') NOT NULL DEFAULT 'hebdomadaire',
  heure_envoi TIME NOT NULL DEFAULT '07:00:00',
  reservee_abonnes BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE KEY uniq_newsletter_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE inscription_newsletter (
  utilisateur_id INT NOT NULL,
  newsletter_id TINYINT UNSIGNED NOT NULL,
  inscrit_le DATETIME NOT NULL,
  desinscrit_le DATETIME DEFAULT NULL,
  origine ENUM('inscription','popup','pied_de_page','offre') NOT NULL DEFAULT 'inscription',
  PRIMARY KEY (utilisateur_id, newsletter_id),
  KEY idx_inscription_newsletter (newsletter_id),
  CONSTRAINT fk_inscription_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateur (id) ON DELETE CASCADE,
  CONSTRAINT fk_inscription_newsletter FOREIGN KEY (newsletter_id) REFERENCES newsletter (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE envoi_newsletter (
  id INT AUTO_INCREMENT PRIMARY KEY,
  newsletter_id TINYINT UNSIGNED NOT NULL,
  objet VARCHAR(160) NOT NULL,
  article_une_id INT DEFAULT NULL,
  envoye_le DATETIME NOT NULL,
  destinataires MEDIUMINT UNSIGNED NOT NULL DEFAULT 0,
  ouvertures MEDIUMINT UNSIGNED NOT NULL DEFAULT 0,
  clics MEDIUMINT UNSIGNED NOT NULL DEFAULT 0,
  desinscriptions SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  KEY idx_envoi_newsletter (newsletter_id),
  CONSTRAINT fk_envoi_newsletter FOREIGN KEY (newsletter_id) REFERENCES newsletter (id) ON DELETE CASCADE,
  CONSTRAINT fk_envoi_article FOREIGN KEY (article_une_id) REFERENCES article (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE VIEW vue_article_publie AS
SELECT a.id, a.titre, a.slug, a.publie_le, a.acces, a.vues,
       CONCAT(au.prenom, ' ', au.nom) AS auteur, c.nom AS rubrique,
       (SELECT COUNT(*) FROM commentaire cm WHERE cm.article_id = a.id AND cm.statut = 'publie') AS commentaires
FROM article a
LEFT JOIN auteur au ON au.id = a.auteur_id
LEFT JOIN categorie c ON c.id = a.categorie_id
WHERE a.statut = 'publie';

CREATE VIEW vue_audience_mensuelle AS
SELECT DATE_FORMAT(l.lu_le, '%Y-%m') AS mois, c.nom AS rubrique,
       COUNT(*) AS lectures, COUNT(DISTINCT l.utilisateur_id) AS lecteurs_identifies,
       ROUND(AVG(l.duree_secondes)) AS duree_moyenne
FROM lecture l
JOIN article a ON a.id = l.article_id
LEFT JOIN categorie c ON c.id = a.categorie_id
GROUP BY mois, rubrique;
