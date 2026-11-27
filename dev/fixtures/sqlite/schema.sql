-- "Le Fil": a French news site with subscriptions, as a development dataset.
-- The same tables as mysql/schema.sql, in SQLite's own types: an ENUM column is TEXT with a CHECK, an id is
-- the rowid (`INTEGER PRIMARY KEY`), a column comment is a SQL comment kept in the text of its CREATE TABLE,
-- ON UPDATE CURRENT_TIMESTAMP is a trigger. Loaded into a new file, so nothing is dropped first.

CREATE TABLE auteur (
  id INTEGER PRIMARY KEY,
  nom VARCHAR(80) NOT NULL,
  prenom VARCHAR(60),
  genre TEXT CHECK (genre IN ('male', 'female', 'other')),
  initiale VARCHAR(1) GENERATED ALWAYS AS (substr(nom, 1, 1)) STORED,
  email VARCHAR(120),
  role TEXT NOT NULL DEFAULT 'redacteur'
    CHECK (role IN ('redacteur', 'pigiste', 'redacteur_chef', 'correspondant', 'photographe', 'stagiaire')),
  service VARCHAR(40), -- Rubrique de rattachement
  biographie TEXT,
  ville VARCHAR(60),
  arrive_le DATE,
  parti_le DATE, -- NULL tant que la personne est en poste
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  compte_x VARCHAR(40),
  CONSTRAINT uniq_auteur_email UNIQUE (email)
);

CREATE TABLE categorie (
  id INTEGER PRIMARY KEY,
  parent_id INTEGER,
  nom VARCHAR(60) NOT NULL,
  slug VARCHAR(60) NOT NULL,
  description VARCHAR(255),
  couleur CHAR(7) NOT NULL DEFAULT '#3b6ea5', -- Couleur de la rubrique en une
  ordre SMALLINT NOT NULL DEFAULT 0,
  CONSTRAINT uniq_categorie_slug UNIQUE (slug),
  CONSTRAINT fk_categorie_parent FOREIGN KEY (parent_id) REFERENCES categorie (id)
);

CREATE TABLE dossier (
  id INTEGER PRIMARY KEY,
  titre VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  description TEXT,
  ouvert_le DATE NOT NULL,
  clos_le DATE,
  en_une BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uniq_dossier_slug UNIQUE (slug)
);

CREATE TABLE media (
  id INTEGER PRIMARY KEY,
  nom_fichier VARCHAR(140) NOT NULL,
  type TEXT NOT NULL DEFAULT 'photo' CHECK (type IN ('photo', 'illustration', 'infographie', 'video')),
  legende VARCHAR(255),
  texte_alternatif VARCHAR(255),
  credit VARCHAR(80),
  licence TEXT NOT NULL DEFAULT 'maison'
    CHECK (licence IN ('maison', 'agence', 'creative_commons', 'droits_reserves')),
  largeur INTEGER,
  hauteur INTEGER,
  poids_octets BIGINT,
  auteur_id INTEGER,
  importe_le DATETIME NOT NULL,
  CONSTRAINT uniq_media_fichier UNIQUE (nom_fichier),
  CONSTRAINT fk_media_auteur FOREIGN KEY (auteur_id) REFERENCES auteur (id)
);

CREATE TABLE article (
  id INTEGER PRIMARY KEY,
  titre VARCHAR(120) NOT NULL, -- Titre affiché en une
  slug VARCHAR(160) NOT NULL,
  chapo VARCHAR(400), -- Résumé affiché sous le titre
  contenu TEXT,
  statut TEXT NOT NULL DEFAULT 'brouillon'
    CHECK (statut IN ('brouillon', 'relecture', 'programme', 'publie', 'archive')),
  acces TEXT NOT NULL DEFAULT 'libre' CHECK (acces IN ('libre', 'inscrit', 'abonne')), -- Niveau requis pour lire l'article en entier
  vues INTEGER DEFAULT 0, -- Compteur de vues, remis à zéro chaque mois
  publie_le DATETIME,
  modifie_le TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  auteur_id INTEGER,
  categorie_id INTEGER,
  dossier_id INTEGER,
  media_une_id INTEGER,
  en_une BOOLEAN NOT NULL DEFAULT FALSE,
  temps_lecture SMALLINT, -- Minutes
  nombre_mots INTEGER,
  note_moyenne DECIMAL(3, 2),
  metadonnees JSON CHECK (json_valid(metadonnees)), -- Balises pour les réseaux sociaux
  CONSTRAINT uniq_article_slug UNIQUE (slug),
  CONSTRAINT fk_article_auteur FOREIGN KEY (auteur_id) REFERENCES auteur (id),
  CONSTRAINT fk_article_categorie FOREIGN KEY (categorie_id) REFERENCES categorie (id),
  CONSTRAINT fk_article_dossier FOREIGN KEY (dossier_id) REFERENCES dossier (id),
  CONSTRAINT fk_article_media_une FOREIGN KEY (media_une_id) REFERENCES media (id)
);
CREATE INDEX idx_article_auteur ON article (auteur_id);
CREATE INDEX idx_article_publication ON article (statut, publie_le);

-- MySQL's ON UPDATE CURRENT_TIMESTAMP, which keeps a value the UPDATE writes itself
CREATE TRIGGER article_touch_modifie_le AFTER UPDATE ON article
FOR EACH ROW WHEN NEW.modifie_le IS OLD.modifie_le
BEGIN
  UPDATE article SET modifie_le = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TABLE tag (
  id INTEGER PRIMARY KEY,
  nom VARCHAR(60) NOT NULL,
  slug VARCHAR(60) NOT NULL,
  usages INTEGER NOT NULL DEFAULT 0, -- Dénormalisé, recalculé chaque nuit
  CONSTRAINT uniq_tag_slug UNIQUE (slug)
);

CREATE TABLE article_tag (
  article_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  pose_le DATETIME NOT NULL,
  PRIMARY KEY (article_id, tag_id),
  CONSTRAINT fk_article_tag_article FOREIGN KEY (article_id) REFERENCES article (id) ON DELETE CASCADE,
  CONSTRAINT fk_article_tag_tag FOREIGN KEY (tag_id) REFERENCES tag (id) ON DELETE CASCADE
);
CREATE INDEX idx_article_tag_tag ON article_tag (tag_id);

CREATE TABLE article_media (
  article_id INTEGER NOT NULL,
  media_id INTEGER NOT NULL,
  position SMALLINT NOT NULL DEFAULT 1,
  legende_specifique VARCHAR(255),
  PRIMARY KEY (article_id, media_id),
  CONSTRAINT fk_article_media_article FOREIGN KEY (article_id) REFERENCES article (id) ON DELETE CASCADE,
  CONSTRAINT fk_article_media_media FOREIGN KEY (media_id) REFERENCES media (id)
);
CREATE INDEX idx_article_media_media ON article_media (media_id);

CREATE TABLE article_revision (
  id INTEGER PRIMARY KEY,
  article_id INTEGER NOT NULL,
  numero INTEGER NOT NULL,
  auteur_id INTEGER,
  titre VARCHAR(120) NOT NULL,
  contenu TEXT,
  resume_modification VARCHAR(255),
  enregistre_le DATETIME NOT NULL,
  CONSTRAINT uniq_revision UNIQUE (article_id, numero),
  CONSTRAINT fk_revision_article FOREIGN KEY (article_id) REFERENCES article (id) ON DELETE CASCADE,
  CONSTRAINT fk_revision_auteur FOREIGN KEY (auteur_id) REFERENCES auteur (id)
);

CREATE TABLE utilisateur (
  id INTEGER PRIMARY KEY,
  email VARCHAR(160) NOT NULL,
  prenom VARCHAR(60) NOT NULL,
  nom VARCHAR(80) NOT NULL,
  pseudo VARCHAR(40),
  ville VARCHAR(60),
  code_postal CHAR(5),
  pays CHAR(2) NOT NULL DEFAULT 'FR',
  inscrit_le DATETIME NOT NULL,
  derniere_connexion DATETIME,
  email_verifie BOOLEAN NOT NULL DEFAULT FALSE,
  accepte_prospection BOOLEAN NOT NULL DEFAULT FALSE,
  preferences JSON CHECK (json_valid(preferences)), -- Rubriques suivies, notifications
  statut TEXT NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'inactif', 'suspendu', 'supprime')),
  CONSTRAINT uniq_utilisateur_email UNIQUE (email)
);
CREATE INDEX idx_utilisateur_inscription ON utilisateur (inscrit_le);

CREATE TABLE formule_abonnement (
  id INTEGER PRIMARY KEY,
  nom VARCHAR(60) NOT NULL,
  code VARCHAR(30) NOT NULL,
  periodicite TEXT NOT NULL DEFAULT 'mensuel' CHECK (periodicite IN ('mensuel', 'annuel')),
  prix DECIMAL(6, 2) NOT NULL,
  devise CHAR(3) NOT NULL DEFAULT 'EUR',
  jours_essai SMALLINT NOT NULL DEFAULT 0,
  acces_archives BOOLEAN NOT NULL DEFAULT TRUE,
  nombre_comptes SMALLINT NOT NULL DEFAULT 1,
  description VARCHAR(255),
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT uniq_formule_code UNIQUE (code)
);

CREATE TABLE code_promo (
  id INTEGER PRIMARY KEY,
  code VARCHAR(24) NOT NULL,
  libelle VARCHAR(120),
  reduction_pourcent SMALLINT,
  reduction_montant DECIMAL(6, 2), -- Exclusif de reduction_pourcent
  valide_du DATE NOT NULL,
  valide_au DATE,
  utilisations_max INTEGER,
  utilisations INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT uniq_code_promo UNIQUE (code)
);

CREATE TABLE moyen_paiement (
  id INTEGER PRIMARY KEY,
  utilisateur_id INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'carte' CHECK (type IN ('carte', 'prelevement', 'paypal')),
  reseau TEXT CHECK (reseau IN ('visa', 'mastercard', 'amex', 'cb')),
  quatre_derniers CHAR(4),
  titulaire VARCHAR(100),
  expire_le DATE,
  iban_masque VARCHAR(34),
  par_defaut BOOLEAN NOT NULL DEFAULT FALSE,
  ajoute_le DATETIME NOT NULL,
  CONSTRAINT fk_moyen_paiement_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateur (id) ON DELETE CASCADE
);
CREATE INDEX idx_moyen_paiement_utilisateur ON moyen_paiement (utilisateur_id);

CREATE TABLE abonnement (
  id INTEGER PRIMARY KEY,
  utilisateur_id INTEGER NOT NULL,
  formule_id INTEGER NOT NULL,
  code_promo_id INTEGER,
  moyen_paiement_id INTEGER,
  statut TEXT NOT NULL DEFAULT 'actif' CHECK (statut IN ('essai', 'actif', 'impaye', 'suspendu', 'resilie')),
  debute_le DATE NOT NULL,
  prochaine_echeance DATE,
  resilie_le DATE,
  motif_resiliation VARCHAR(160),
  renouvellement_auto BOOLEAN NOT NULL DEFAULT TRUE,
  prix_paye DECIMAL(6, 2) NOT NULL, -- Prix réellement facturé, remise déduite
  CONSTRAINT fk_abonnement_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateur (id) ON DELETE CASCADE,
  CONSTRAINT fk_abonnement_formule FOREIGN KEY (formule_id) REFERENCES formule_abonnement (id),
  CONSTRAINT fk_abonnement_code_promo FOREIGN KEY (code_promo_id) REFERENCES code_promo (id),
  CONSTRAINT fk_abonnement_moyen_paiement FOREIGN KEY (moyen_paiement_id) REFERENCES moyen_paiement (id)
);
CREATE INDEX idx_abonnement_utilisateur ON abonnement (utilisateur_id);
CREATE INDEX idx_abonnement_statut ON abonnement (statut);

CREATE TABLE paiement (
  id INTEGER PRIMARY KEY,
  abonnement_id INTEGER NOT NULL,
  moyen_paiement_id INTEGER,
  reference VARCHAR(32) NOT NULL,
  numero_facture VARCHAR(20),
  montant DECIMAL(8, 2) NOT NULL,
  tva DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
  devise CHAR(3) NOT NULL DEFAULT 'EUR',
  statut TEXT NOT NULL DEFAULT 'reussi' CHECK (statut IN ('en_attente', 'reussi', 'refuse', 'rembourse')),
  motif_echec VARCHAR(120),
  paye_le DATETIME NOT NULL,
  periode_debut DATE,
  periode_fin DATE,
  CONSTRAINT uniq_paiement_reference UNIQUE (reference),
  CONSTRAINT fk_paiement_abonnement FOREIGN KEY (abonnement_id) REFERENCES abonnement (id) ON DELETE CASCADE,
  CONSTRAINT fk_paiement_moyen FOREIGN KEY (moyen_paiement_id) REFERENCES moyen_paiement (id)
);
CREATE INDEX idx_paiement_abonnement ON paiement (abonnement_id);

CREATE TABLE remboursement (
  id INTEGER PRIMARY KEY,
  paiement_id INTEGER NOT NULL,
  montant DECIMAL(8, 2) NOT NULL,
  motif TEXT NOT NULL CHECK (motif IN ('doublon', 'erreur_facturation', 'geste_commercial', 'retractation')),
  commentaire VARCHAR(255),
  rembourse_le DATETIME NOT NULL,
  traite_par VARCHAR(80),
  CONSTRAINT fk_remboursement_paiement FOREIGN KEY (paiement_id) REFERENCES paiement (id) ON DELETE CASCADE
);
CREATE INDEX idx_remboursement_paiement ON remboursement (paiement_id);

CREATE TABLE commentaire (
  id INTEGER PRIMARY KEY,
  article_id INTEGER NOT NULL,
  utilisateur_id INTEGER,
  parent_id INTEGER, -- Réponse à un autre commentaire
  contenu TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'publie' CHECK (statut IN ('en_attente', 'publie', 'masque', 'supprime')),
  votes_positifs SMALLINT NOT NULL DEFAULT 0,
  votes_negatifs SMALLINT NOT NULL DEFAULT 0,
  poste_le DATETIME NOT NULL,
  modere_le DATETIME,
  modere_par INTEGER,
  CONSTRAINT fk_commentaire_article FOREIGN KEY (article_id) REFERENCES article (id) ON DELETE CASCADE,
  CONSTRAINT fk_commentaire_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateur (id) ON DELETE SET NULL,
  CONSTRAINT fk_commentaire_parent FOREIGN KEY (parent_id) REFERENCES commentaire (id) ON DELETE CASCADE,
  CONSTRAINT fk_commentaire_moderateur FOREIGN KEY (modere_par) REFERENCES auteur (id)
);
CREATE INDEX idx_commentaire_article ON commentaire (article_id);
CREATE INDEX idx_commentaire_utilisateur ON commentaire (utilisateur_id);

CREATE TABLE signalement_commentaire (
  id INTEGER PRIMARY KEY,
  commentaire_id INTEGER NOT NULL,
  utilisateur_id INTEGER,
  motif TEXT NOT NULL CHECK (motif IN ('injure', 'hors_sujet', 'spam', 'desinformation', 'harcelement')),
  precision_texte VARCHAR(255),
  signale_le DATETIME NOT NULL,
  traite BOOLEAN NOT NULL DEFAULT FALSE,
  decision TEXT CHECK (decision IN ('conserve', 'masque', 'supprime')),
  CONSTRAINT fk_signalement_commentaire FOREIGN KEY (commentaire_id) REFERENCES commentaire (id) ON DELETE CASCADE,
  CONSTRAINT fk_signalement_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateur (id) ON DELETE SET NULL
);
CREATE INDEX idx_signalement_commentaire ON signalement_commentaire (commentaire_id);

CREATE TABLE favori (
  utilisateur_id INTEGER NOT NULL,
  article_id INTEGER NOT NULL,
  ajoute_le DATETIME NOT NULL,
  lu BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (utilisateur_id, article_id),
  CONSTRAINT fk_favori_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateur (id) ON DELETE CASCADE,
  CONSTRAINT fk_favori_article FOREIGN KEY (article_id) REFERENCES article (id) ON DELETE CASCADE
);
CREATE INDEX idx_favori_article ON favori (article_id);

CREATE TABLE lecture (
  id INTEGER PRIMARY KEY,
  article_id INTEGER NOT NULL,
  utilisateur_id INTEGER, -- NULL pour un visiteur non connecté
  lu_le DATETIME NOT NULL,
  duree_secondes INTEGER,
  pourcentage_lu SMALLINT,
  source TEXT NOT NULL DEFAULT 'accueil'
    CHECK (source IN ('accueil', 'rubrique', 'recherche', 'newsletter', 'reseaux', 'moteur', 'notification')),
  appareil TEXT NOT NULL DEFAULT 'mobile' CHECK (appareil IN ('ordinateur', 'mobile', 'tablette')),
  paywall_affiche BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_lecture_article FOREIGN KEY (article_id) REFERENCES article (id) ON DELETE CASCADE,
  CONSTRAINT fk_lecture_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateur (id) ON DELETE SET NULL
);
CREATE INDEX idx_lecture_article ON lecture (article_id);
CREATE INDEX idx_lecture_date ON lecture (lu_le);

CREATE TABLE newsletter (
  id INTEGER PRIMARY KEY,
  nom VARCHAR(80) NOT NULL,
  slug VARCHAR(80) NOT NULL,
  description VARCHAR(255),
  periodicite TEXT NOT NULL DEFAULT 'hebdomadaire'
    CHECK (periodicite IN ('quotidienne', 'hebdomadaire', 'mensuelle')),
  heure_envoi TIME NOT NULL DEFAULT '07:00:00',
  reservee_abonnes BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uniq_newsletter_slug UNIQUE (slug)
);

CREATE TABLE inscription_newsletter (
  utilisateur_id INTEGER NOT NULL,
  newsletter_id INTEGER NOT NULL,
  inscrit_le DATETIME NOT NULL,
  desinscrit_le DATETIME,
  origine TEXT NOT NULL DEFAULT 'inscription' CHECK (origine IN ('inscription', 'popup', 'pied_de_page', 'offre')),
  PRIMARY KEY (utilisateur_id, newsletter_id),
  CONSTRAINT fk_inscription_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateur (id) ON DELETE CASCADE,
  CONSTRAINT fk_inscription_newsletter FOREIGN KEY (newsletter_id) REFERENCES newsletter (id) ON DELETE CASCADE
);
CREATE INDEX idx_inscription_newsletter ON inscription_newsletter (newsletter_id);

CREATE TABLE envoi_newsletter (
  id INTEGER PRIMARY KEY,
  newsletter_id INTEGER NOT NULL,
  objet VARCHAR(160) NOT NULL,
  article_une_id INTEGER,
  media_une_id INTEGER, -- Une image de l'article à la une
  envoye_le DATETIME NOT NULL,
  destinataires INTEGER NOT NULL DEFAULT 0,
  ouvertures INTEGER NOT NULL DEFAULT 0,
  clics INTEGER NOT NULL DEFAULT 0,
  desinscriptions INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT fk_envoi_newsletter FOREIGN KEY (newsletter_id) REFERENCES newsletter (id) ON DELETE CASCADE,
  CONSTRAINT fk_envoi_article FOREIGN KEY (article_une_id) REFERENCES article (id) ON DELETE SET NULL,
  CONSTRAINT fk_envoi_media_une FOREIGN KEY (article_une_id, media_une_id) REFERENCES article_media (article_id, media_id)
);
CREATE INDEX idx_envoi_newsletter ON envoi_newsletter (newsletter_id);

-- `||` rather than `concat`, which SQLite has only since 3.44
CREATE VIEW vue_article_publie AS
SELECT a.id, a.titre, a.slug, a.publie_le, a.acces, a.vues,
       coalesce(au.prenom, '') || ' ' || au.nom AS auteur, c.nom AS rubrique,
       (SELECT count(*) FROM commentaire cm WHERE cm.article_id = a.id AND cm.statut = 'publie') AS commentaires
FROM article a
LEFT JOIN auteur au ON au.id = a.auteur_id
LEFT JOIN categorie c ON c.id = a.categorie_id
WHERE a.statut = 'publie';

CREATE VIEW vue_audience_mensuelle AS
SELECT strftime('%Y-%m', l.lu_le) AS mois, c.nom AS rubrique,
       count(*) AS lectures, count(DISTINCT l.utilisateur_id) AS lecteurs_identifies,
       round(avg(l.duree_secondes)) AS duree_moyenne
FROM lecture l
JOIN article a ON a.id = l.article_id
LEFT JOIN categorie c ON c.id = a.categorie_id
GROUP BY mois, rubrique;
