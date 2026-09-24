// Generates the rows of the "Le Fil" development dataset (a French news site), as the INSERTs of
// one dialect: `node generate.mjs mysql` or `node generate.mjs postgres`. Seeded: the same command
// always produces the same file, and both dialects hold the same rows.
const dialect = process.argv[2];
if (dialect !== 'mysql' && dialect !== 'postgres') {
  console.error('usage: node generate.mjs mysql|postgres');
  process.exit(1);
}

// ------------------------------------------------------------------ randomness
// mulberry32: small, seedable, and good enough for fixtures
let seed = 20260922;
const random = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
/** An integer in [a, b), or in [0, a) when b is left out. */
const randrange = (a, b) =>
  b === undefined
    ? Math.floor(random() * a)
    : a + Math.floor(random() * (b - a));
const choice = (xs) => xs[randrange(xs.length)];
const weighted = (xs, weights) => {
  let r = random() * weights.reduce((sum, w) => sum + w, 0);
  for (let i = 0; i < xs.length; i++) {
    r -= weights[i];
    if (r < 0) return xs[i];
  }
  return xs[xs.length - 1];
};
/** k distinct elements of xs, in random order. */
const sample = (xs, k) => {
  const pool = [...xs];
  for (let i = 0; i < k; i++) {
    const j = i + randrange(pool.length - i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, k);
};
const gauss = (mu, sigma) =>
  mu +
  sigma *
    Math.sqrt(-2 * Math.log(1 - random())) *
    Math.cos(2 * Math.PI * random());
const uniform = (a, b) => a + (b - a) * random();
const range = (a, b) => Array.from({ length: b - a }, (_, i) => a + i);

// ----------------------------------------------------------------------- time
// Every instant is a UTC Date; a Day is a Date written as a DATE rather than a DATETIME.
class Day extends Date {}
const DAY = 86_400_000;
const at = (y, m, d, h = 0, mi = 0, s = 0) =>
  new Date(Date.UTC(y, m - 1, d, h, mi, s));
const day = (y, m, d) => new Day(Date.UTC(y, m - 1, d));
const isoDay = (s) => new Day(`${s}T00:00:00Z`);
const plus = (t, { days = 0, hours = 0, minutes = 0, seconds = 0 }) =>
  new t.constructor(
    t.getTime() + (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000
  );
const toDay = (t) => new Day(Math.floor(t.getTime() / DAY) * DAY);
const daysBetween = (later, earlier) => Math.floor((later - earlier) / DAY);
const earliest = (a, b) => (a < b ? a : b);
const sameDay = (a, b) => a.getTime() === b.getTime();
const NOW = at(2026, 9, 22, 6); // the server runs in UTC, two hours behind Paris
const TODAY = toDay(NOW);
const between = (a, b) =>
  new Date(
    a.getTime() + randrange(Math.max(Math.floor((b - a) / 1000), 1)) * 1000
  );

// ------------------------------------------------------------------------ text
const pad = (n, width) => String(n).padStart(width, '0');
const round2 = (x) => Math.round(x * 100) / 100;
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const fill = (template, vars) =>
  template.replace(/\{(\w+)\}/g, (_, key) => vars[key]);
const wordCount = (s) => s.split(/\s+/).filter(Boolean).length;
function slugify(s, seen) {
  let slug = s
    .normalize('NFKD')
    .replace(/[^ -~]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 140);
  if (seen) {
    const base = slug;
    for (let n = 2; seen.has(slug); n++) slug = `${base}-${n}`;
    seen.add(slug);
  }
  return slug;
}

// ------------------------------------------------------------------------- SQL
const OUT = [];
const nextIds = []; // [table, first free id], for PostgreSQL's identity columns
function quote(v) {
  if (v === undefined) throw new Error('undefined value');
  if (v === null) return 'NULL';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') return String(v);
  if (v instanceof Day) return `'${v.toISOString().slice(0, 10)}'`;
  if (v instanceof Date)
    return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
  // MySQL reads a backslash as an escape, PostgreSQL as itself
  const s =
    dialect === 'mysql' ? String(v).replaceAll('\\', '\\\\') : String(v);
  return `'${s.replaceAll("'", "''")}'`;
}
function insert(table, cols, rows, chunk = 200) {
  for (let i = 0; i < rows.length; i += chunk) {
    const values = rows
      .slice(i, i + chunk)
      .map((row) => `(${row.map(quote).join(', ')})`);
    OUT.push(
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES\n${values.join(',\n')};`
    );
  }
  if (cols[0] === 'id' && rows.length > 0)
    nextIds.push([table, Math.max(...rows.map((r) => r[0])) + 1]);
}

// ---------------------------------------------------------------- people pools
const NOMS =
  `Martin Bernard Dubois Thomas Robert Richard Petit Durand Leroy Moreau Simon Laurent
Lefebvre Michel Garcia David Bertrand Roux Vincent Fournier Morel Girard Andre Lefevre Mercier
Dupont Lambert Bonnet Francois Martinez Legrand Garnier Faure Rousseau Blanc Guerin Muller Henry
Roussel Nicolas Perrin Morin Mathieu Clement Gauthier Dumont Lopez Fontaine Chevalier Robin
Masson Sanchez Gerard Nguyen Boyer Denis Lemaire Duval Joly Gautier Roger Roche Roy Noel Meyer
Lucas Meunier Jean Perez Marchand Dufour Blanchard Marie Barbier Brun Dumas Brunet Schmitt Leroux
Colin Fernandez Pierre Renard Arnaud Rolland Caron Aubert Giraud Leclerc Vidal Bourgeois Renaud
Lemoine Picard Gaillard Philippe Leclercq Lacroix Fabre Dupuis Olivier Rodriguez Benoit`
    .split(/\s+/)
    .concat(['Da Silva']);
const PRENOMS_F =
  `Camille Sophie Marie Julie Claire Lucie Emma Ines Sarah Chloe Manon Alice Laura Anais
Elodie Pauline Amelie Celine Nathalie Isabelle Valerie Sandrine Aurelie Delphine Fanny Margaux
Oceane Justine Charlotte Helene Agnes Beatrice Myriam Leila Fatoumata Awa Nour Mathilde Solene
Estelle Clemence Adele Louise Juliette Alix Maud Elsa Roxane Sabine Karine`.split(
    /\s+/
  );
const PRENOMS_M =
  `Pierre Julien Nicolas Thomas Antoine Maxime Lucas Hugo Paul Alexandre Guillaume
Sebastien Vincent Romain Mathieu Benjamin Clement Florian Adrien Damien Fabien Gregory Olivier
Stephane Laurent Franck Christophe Gilles Bruno Patrick Karim Mehdi Youssef Amadou Samuel Victor
Etienne Arthur Raphael Theo Basile Gaspard Marin Simon Cedric Yann Loic Tristan Marc Xavier`.split(
    /\s+/
  );
const VILLES = [
  'Paris',
  'Lyon',
  'Marseille',
  'Bordeaux',
  'Lille',
  'Nantes',
  'Toulouse',
  'Strasbourg',
  'Rennes',
  'Montpellier',
  'Grenoble',
  'Nancy',
  'Rouen',
  'Brest',
  'Dijon',
  'Clermont-Ferrand',
  'Le Havre',
  'Angers',
  'Tours',
  'Reims',
  'Saint-Étienne',
  'Caen',
  'Limoges',
  'Besançon',
  'Perpignan',
  'Bruxelles',
  'Genève',
  'Montréal',
  'Dakar',
  'Casablanca',
];

// ------------------------------------------------------------------ categories
const ARBRE = [
  [
    'Actualité',
    '#b45f4d',
    [
      [
        'Politique',
        'La vie des institutions, du Parlement aux conseils municipaux',
      ],
      ['Société', 'Éducation, justice, services publics et faits de société'],
      ['International', 'Ce qui bouge hors de nos frontières'],
    ],
  ],
  [
    'Économie',
    '#3b6ea5',
    [
      ['Entreprises', 'Stratégies, résultats et restructurations'],
      ['Emploi', 'Marché du travail, salaires et conditions de travail'],
    ],
  ],
  [
    'Culture',
    '#8a5fa8',
    [
      ['Cinéma', 'Sorties, festivals et industrie du film'],
      ['Musique', 'Albums, concerts et économie du streaming'],
      ['Livres', 'Rentrée littéraire, essais et édition'],
    ],
  ],
  [
    'Sport',
    '#4f8a5b',
    [
      ['Football', "Ligue 1, coupes d'Europe et sélections"],
      ['Rugby', 'Top 14, Coupe du monde et formation'],
    ],
  ],
  [
    'Sciences',
    '#c08a2e',
    [
      ['Environnement', 'Climat, biodiversité et transition énergétique'],
      ['Santé', 'Hôpital, recherche médicale et prévention'],
      ['Numérique', 'Technologies, données personnelles et régulation'],
    ],
  ],
];
const categories = {};
const catRows = [];
let cid = 0;
ARBRE.forEach(([racine, couleur, enfants], r) => {
  const racineId = ++cid;
  catRows.push([racineId, null, racine, slugify(racine), null, couleur, r + 1]);
  enfants.forEach(([nom, desc], e) => {
    catRows.push([++cid, racineId, nom, slugify(nom), desc, couleur, e + 1]);
    categories[nom] = cid;
  });
});
insert(
  'categorie',
  ['id', 'parent_id', 'nom', 'slug', 'description', 'couleur', 'ordre'],
  catRows
);

// --------------------------------------------------------------------- authors
const SERVICES = {
  Politique: 'Politique',
  Société: 'Société',
  International: 'International',
  Entreprises: 'Économie',
  Emploi: 'Économie',
  Cinéma: 'Culture',
  Musique: 'Culture',
  Livres: 'Culture',
  Football: 'Sports',
  Rugby: 'Sports',
  Environnement: 'Sciences',
  Santé: 'Sciences',
  Numérique: 'Sciences',
};
const SERVICE_LIST = [...new Set(Object.values(SERVICES))].sort();
const BIO =
  '{prenom} {nom} couvre {domaine} pour Le Fil depuis {annee}. {pron} a précédemment travaillé {passe}.';
const PASSES = [
  'en presse quotidienne régionale',
  'pour une agence de presse',
  "à la rédaction web d'une radio publique",
  'comme pigiste à Bruxelles',
  'dans un hebdomadaire économique',
  'pour un média en ligne indépendant',
  'au service documentation du journal',
  "comme correspondant à l'étranger",
];
const DOMAINES = {
  Politique: 'les institutions et la vie parlementaire',
  Société: "l'école, la justice et les services publics",
  International: "l'Europe centrale et les Balkans",
  Économie: 'les entreprises et le marché du travail',
  Culture: "le cinéma, la musique et l'édition",
  Sports: 'le football et le rugby professionnels',
  Sciences: 'le climat, la santé et le numérique',
};
const ROLES = [
  ...Array(16).fill('redacteur'),
  ...Array(10).fill('pigiste'),
  ...Array(5).fill('correspondant'),
  ...Array(4).fill('redacteur_chef'),
  ...Array(4).fill('photographe'),
  ...Array(3).fill('stagiaire'),
];
const auteurs = [];
const emailsAuteurs = new Set();
for (let i = 1; i <= 42; i++) {
  const femme = random() < 0.48;
  const prenom = choice(femme ? PRENOMS_F : PRENOMS_M);
  const nom = choice(NOMS);
  const genre = femme ? 'female' : random() < 0.96 ? 'male' : 'other';
  const role = ROLES[(i - 1) % ROLES.length];
  const service = choice(SERVICE_LIST);
  const base = slugify(`${prenom}.${nom}`);
  let email = `${base}@lefil.fr`;
  for (let n = 2; emailsAuteurs.has(email); n++) email = `${base}${n}@lefil.fr`;
  emailsAuteurs.add(email);
  const arrive = plus(day(2026, 1, 1), { days: -randrange(120, 6200) });
  const actif = random() > 0.12;
  let parti = actif ? null : plus(arrive, { days: randrange(400, 2500) });
  if (parti && parti > day(2026, 9, 1)) parti = day(2026, 9, 1);
  const bio =
    random() < 0.12
      ? null
      : fill(BIO, {
          prenom,
          nom,
          domaine: DOMAINES[service],
          annee: arrive.getUTCFullYear(),
          pron: femme ? 'Elle' : 'Il',
          passe: choice(PASSES),
        });
  auteurs.push([
    i,
    nom,
    prenom,
    genre,
    email,
    role,
    service,
    bio,
    random() > 0.1 ? choice(VILLES) : null,
    arrive,
    parti,
    actif,
    random() > 0.45 ? `@${slugify(prenom + nom)}_lefil` : null,
  ]);
}
insert(
  'auteur',
  [
    'id',
    'nom',
    'prenom',
    'genre',
    'email',
    'role',
    'service',
    'biographie',
    'ville',
    'arrive_le',
    'parti_le',
    'actif',
    'compte_x',
  ],
  auteurs
);
const auteursParService = {};
for (const a of auteurs) if (a[11]) (auteursParService[a[6]] ??= []).push(a[0]);
const photographes = auteurs
  .filter((a) => a[5] === 'photographe')
  .map((a) => a[0]);
if (photographes.length === 0) photographes.push(1);
const moderateurs = auteurs
  .filter((a) => a[5] === 'redacteur_chef' || a[5] === 'redacteur')
  .map((a) => a[0])
  .slice(0, 8);

// ------------------------------------------------------------- special reports
const DOSSIERS = [
  [
    'Retraites : la réforme de trop ?',
    'Tous nos articles sur le parcours parlementaire de la réforme et ses effets.',
    '2024-02-11',
    '2024-11-30',
    false,
  ],
  [
    'Municipales 2026',
    "Enquêtes, portraits et résultats dans les villes où le scrutin s'est joué à peu de voix.",
    '2025-09-01',
    null,
    true,
  ],
  [
    "Le prix de l'énergie",
    'Factures, tarifs réglementés et choix industriels : notre suivi au long cours.',
    '2024-01-15',
    null,
    false,
  ],
  [
    "Hôpital public : l'état des lieux",
    "Six mois d'enquête dans douze établissements, des urgences aux blocs.",
    '2024-06-03',
    '2025-03-20',
    false,
  ],
  [
    "Jeux olympiques : l'après",
    'Ce que les installations et les budgets deviennent une fois la flamme éteinte.',
    '2024-09-10',
    '2025-07-15',
    false,
  ],
  [
    'Intelligence artificielle au travail',
    "Ce que l'automatisation change vraiment dans les métiers du tertiaire.",
    '2025-01-20',
    null,
    true,
  ],
  [
    "Sécheresse : la carte de l'eau",
    "Restrictions, nappes phréatiques et conflits d'usage, département par département.",
    '2025-04-02',
    null,
    false,
  ],
  [
    'Rentrée littéraire',
    'Nos lectures et nos entretiens parmi les cinq cents romans de la rentrée.',
    '2025-08-18',
    '2025-11-05',
    false,
  ],
  [
    'Coupe du monde de rugby',
    "Les Bleus, les adversaires et l'économie du tournoi.",
    '2024-08-01',
    '2024-10-30',
    false,
  ],
  [
    'Données personnelles : qui sait quoi ?',
    'Notre série sur le pistage publicitaire et les recours possibles.',
    '2025-11-12',
    null,
    false,
  ],
  [
    'Logement : la crise silencieuse',
    'Construction en panne, loyers en hausse, parc social saturé.',
    '2026-01-08',
    null,
    true,
  ],
  [
    'Élections européennes',
    'Programmes, campagnes et résultats scrutin par scrutin.',
    '2024-03-04',
    '2024-07-01',
    false,
  ],
];
const dossierSlugs = new Set();
const dossiers = DOSSIERS.map(([titre, desc, ouvert, clos, une], i) => [
  i + 1,
  titre,
  slugify(titre, dossierSlugs),
  desc,
  isoDay(ouvert),
  clos ? isoDay(clos) : null,
  une,
]);
insert(
  'dossier',
  ['id', 'titre', 'slug', 'description', 'ouvert_le', 'clos_le', 'en_une'],
  dossiers
);

// ----------------------------------------------------------------------- media
const SUJETS_PHOTO = [
  'une manifestation place de la République',
  "la façade de l'Assemblée nationale",
  'un chantier de logements sociaux',
  "une salle de classe en début d'année",
  "un service d'urgences la nuit",
  'un champ de colza asséché',
  'une ligne de production automobile',
  'un guichet de La Poste',
  "un quai de gare à l'heure de pointe",
  'un parc éolien en mer',
  'une salle de cinéma vide',
  'un concert dans une salle de taille moyenne',
  'une librairie de quartier',
  'un entraînement de Ligue 1',
  'une mêlée du Top 14',
  'un centre de données',
  'un laboratoire de recherche',
  'une cantine scolaire',
  'un marché de plein air',
  'un tribunal judiciaire',
];
const AGENCES = [
  'AFP',
  'Reuters',
  'Hans Lucas',
  'Divergence',
  'Le Fil',
  'MYOP',
  'Getty Images',
];
const medias = [];
for (let i = 1; i <= 250; i++) {
  const sujet = choice(SUJETS_PHOTO);
  const type = weighted(
    ['photo', 'illustration', 'infographie', 'video'],
    [70, 12, 13, 5]
  );
  const importe = between(at(2024, 1, 1), NOW);
  const licence = weighted(
    ['maison', 'agence', 'creative_commons', 'droits_reserves'],
    [45, 35, 12, 8]
  );
  const credit = licence === 'maison' ? 'Le Fil' : choice(AGENCES);
  const largeur = choice([1200, 1600, 2000, 2400, 3000]);
  const hauteur = Math.trunc(largeur / choice([1.5, 1.33, 1.77]));
  medias.push([
    i,
    `${pad(i, 4)}-${slugify(sujet)}.${type === 'video' ? 'mp4' : 'jpg'}`,
    type,
    cap(sujet) + (random() > 0.3 ? '.' : ', en septembre 2026.'),
    random() > 0.15 ? cap(sujet) : null,
    credit,
    licence,
    largeur,
    hauteur,
    randrange(180_000, 4_800_000),
    random() > 0.25 ? choice(photographes) : null,
    importe,
  ]);
}
insert(
  'media',
  [
    'id',
    'nom_fichier',
    'type',
    'legende',
    'texte_alternatif',
    'credit',
    'licence',
    'largeur',
    'hauteur',
    'poids_octets',
    'auteur_id',
    'importe_le',
  ],
  medias
);

// -------------------------------------------------------------------- articles
const SUJETS = {
  Politique: [
    'la réforme des retraites',
    'le budget 2027',
    'la loi sur le logement',
    'le projet de loi immigration',
    "la réforme de l'audiovisuel public",
    'la fusion des intercommunalités',
    'la loi de programmation militaire',
    "le statut de l'élu local",
    'la réforme du mode de scrutin',
    'la décentralisation de la santé',
  ],
  Société: [
    'la réforme du lycée professionnel',
    "l'accueil des mineurs isolés",
    "la pénurie d'enseignants",
    "la réforme de l'aide juridictionnelle",
    'le plan contre les violences conjugales',
    'la fermeture des petites gares',
    "l'accès aux services publics en zone rurale",
    'le recrutement des surveillants pénitentiaires',
    'la réforme du permis de conduire',
    "la lutte contre l'habitat indigne",
  ],
  International: [
    "l'élargissement de l'Union européenne",
    "la crise de l'énergie en Allemagne",
    'les négociations climatiques de la COP',
    'le retrait des troupes au Sahel',
    'la réforme agricole espagnole',
    'les élections législatives italiennes',
    'le traité commercial avec le Mercosur',
    'la frontière gréco-turque',
    "la reconstruction de l'Ukraine",
    'la politique monétaire de la Banque centrale européenne',
  ],
  Entreprises: [
    'le plan social chez un équipementier automobile',
    'la fusion de deux groupes de distribution',
    "l'introduction en Bourse d'une biotech lyonnaise",
    "la reprise d'une usine de papier par ses salariés",
    "la stratégie d'un géant du luxe en Asie",
    "la restructuration d'un opérateur télécom",
    "l'ouverture d'une gigafactory dans le Nord",
    "la fermeture d'un site de raffinage",
    "le rachat d'une chaîne de librairies",
    "la relocalisation d'une production de médicaments",
  ],
  Emploi: [
    "la réforme de l'assurance chômage",
    'la pénurie de soudeurs',
    "les salaires dans l'hôtellerie",
    'le télétravail dans les grandes entreprises',
    "l'apprentissage dans le bâtiment",
    'la semaine de quatre jours',
    "l'emploi des seniors",
    "la reconversion des salariés de l'automobile",
    "l'index de l'égalité professionnelle",
    'le compte personnel de formation',
  ],
  Cinéma: [
    'la sélection du Festival de Cannes',
    "le financement du cinéma d'auteur",
    'la fréquentation des salles en région',
    "la production d'un film d'animation français",
    'la place des femmes derrière la caméra',
    "les tournages délocalisés en Europe de l'Est",
    'le sort des salles indépendantes',
    "l'accord entre les plateformes et le CNC",
    'la restauration des films muets',
    'le documentaire en salle',
  ],
  Musique: [
    'la rémunération du streaming',
    'le retour des festivals de taille moyenne',
    'la scène rap marseillaise',
    'le financement des salles de concert',
    'la formation des musiciens classiques',
    'les tournées et leur empreinte carbone',
    'la billetterie et la revente',
    'le vinyle et sa fabrication',
    'la musique dans les écoles',
    'les quotas de chanson francophone',
  ],
  Livres: [
    'la rentrée littéraire',
    'le prix du papier',
    'les librairies indépendantes',
    'la traduction littéraire',
    "l'édition jeunesse",
    "les droits d'auteur à l'ère numérique",
    'le livre audio',
    'les bibliothèques municipales',
    "la concentration dans l'édition",
    'le roman policier français',
  ],
  Football: [
    'les droits télé de la Ligue 1',
    'la formation des jeunes joueurs',
    "l'arbitrage vidéo",
    "le mercato d'hiver",
    "les finances d'un club de deuxième division",
    'le football féminin professionnel',
    "la rénovation d'un stade municipal",
    'le calendrier international',
    'le supportérisme et les interdictions de stade',
    'la lutte contre les paris truqués',
  ],
  Rugby: [
    'le salary cap du Top 14',
    'les commotions cérébrales',
    'la formation dans les centres régionaux',
    "l'élargissement de la Coupe du monde",
    'les finances de la fédération',
    'le rugby féminin',
    'le calendrier des joueurs internationaux',
    "l'arbitrage des plaquages hauts",
    'la reconversion des joueurs',
    "l'implantation du rugby en Afrique",
  ],
  Environnement: [
    'la sécheresse dans le Sud-Ouest',
    'le plan de sobriété énergétique',
    'la rénovation thermique',
    'la protection des zones humides',
    "les pesticides dans l'eau potable",
    'le parc éolien en mer',
    'le recyclage des batteries',
    'la forêt landaise après les incendies',
    'la pêche en Atlantique',
    "l'artificialisation des sols",
  ],
  Santé: [
    'les déserts médicaux',
    "le budget de l'hôpital public",
    'la pénurie de médicaments',
    'la santé mentale des adolescents',
    'la vaccination contre la grippe',
    'les urgences pédiatriques',
    'la recherche sur Alzheimer',
    "les dépassements d'honoraires",
    'la prévention du cancer du côlon',
    'les soins palliatifs',
  ],
  Numérique: [
    'la régulation des plateformes',
    'le pistage publicitaire',
    "l'intelligence artificielle générative",
    'la souveraineté des données de santé',
    'la fibre optique en zone rurale',
    'les câbles sous-marins',
    'la cybersécurité des hôpitaux',
    "l'empreinte carbone des centres de données",
    "la reconnaissance faciale dans l'espace public",
    "le logiciel libre dans l'administration",
  ],
};
const ANGLES = [
  "le compte n'y est pas",
  'une bataille de chiffres',
  "les coulisses d'un renoncement",
  'ce que disent les documents que nous avons consultés',
  'un calendrier intenable',
  "des promesses à l'épreuve du terrain",
  'la facture pour les collectivités',
  'un équilibre fragile',
  'trois questions avant la décision',
  "pourquoi rien n'avance",
];
const TEMPLATES = [
  '{Sujet} : {angle}',
  'Ce que change {sujet} pour le quotidien',
  'Enquête sur {sujet}',
  '{Sujet}, un an après',
  'Trois questions sur {sujet}',
  'Pourquoi {sujet} divise',
  '{Sujet} : notre décryptage en cinq points',
  'Reportage à {lieu} : ce que dit le terrain',
  '{Sujet} : le rapport que nous avons lu',
  '{Sujet} face aux chiffres',
  'Comment {sujet} a changé de visage',
];
const PARAGRAPHES = [
  "Le dossier n'est pas neuf : il revient dans le débat public depuis {annee}, sans qu'une décision claire ait jamais été tranchée.",
  'Dans le détail, {chiffre} % des structures concernées déclarent avoir déjà engagé les changements demandés, selon les données que nous avons obtenues.',
  "« Nous avons besoin de visibilité, pas d'annonces », résume {personne}, {fonction} à {lieu}.",
  "Les services de l'État avancent un coût de {millions} millions d'euros sur trois ans ; les collectivités, elles, en annoncent le double.",
  'Sur le terrain, la mise en œuvre bute sur un obstacle prosaïque : le manque de personnel formé, que personne ne conteste plus.',
  "Un rapport remis au printemps pointait déjà ce risque, sans être suivi d'effet.",
  "À {lieu}, l'expérimentation menée depuis dix-huit mois donne des résultats contrastés, que les deux camps citent à l'appui de leur thèse.",
  "Les organisations professionnelles demandent un délai supplémentaire ; l'administration répond que le calendrier ne bougera pas.",
  'Reste une question, rarement posée publiquement : qui paiera la différence une fois les aides éteintes ?',
  "Interrogé, le cabinet concerné n'a pas donné suite à nos sollicitations.",
  'Les chiffres publiés cet été confirment la tendance : {chiffre} % en un an, un mouvement continu depuis {annee}.',
  '« On nous demande de faire mieux avec moins, et cela fait dix ans que ça dure », souffle {personne}, {fonction}.',
  "Une décision est attendue avant la fin de l'année ; d'ici là, chacun affine ses arguments.",
  "Dans les couloirs, on reconnaît que l'arbitrage a été rendu sans que les services techniques aient été consultés.",
  'Les syndicats ont quitté la dernière réunion de concertation, jugeant les garanties insuffisantes.',
  "L'étude d'impact, que nous avons pu consulter, retient une hypothèse de croissance que peu d'économistes défendent aujourd'hui.",
  "Deux régions ont choisi d'avancer seules, quitte à assumer un surcoût temporaire.",
  "« Le texte est bon sur le papier ; c'est son application qui pose problème », tempère {personne}, {fonction}.",
  'En Allemagne comme en Espagne, des dispositifs comparables ont été abandonnés au bout de trois ans.',
  "Le calendrier, lui, n'a pas bougé : l'entrée en vigueur reste fixée au 1er janvier {annee_futur}.",
  'Les premières évaluations indépendantes ne sont pas attendues avant deux ans.',
  "Le budget consacré à la mesure a été relevé de {chiffre} % en cours d'exercice, sans débat public.",
  "Les élus de la majorité comme de l'opposition reconnaissent, en privé, que le dispositif sera revu.",
];
// Each job title in both forms: the quoted person's first name decides which one.
const FONCTIONS = [
  ["directeur d'établissement", "directrice d'établissement"],
  ['responsable syndical', 'responsable syndicale'],
  ['élu local', 'élue locale'],
  ['économiste', 'économiste'],
  ['chercheur au CNRS', 'chercheuse au CNRS'],
  ['chef de service', 'cheffe de service'],
  ['cadre associatif', 'cadre associative'],
  ["responsable d'exploitation", "responsable d'exploitation"],
  ['avocat spécialisé', 'avocate spécialisée'],
  ['adjoint au maire', 'adjointe au maire'],
  [
    'infirmier en poste depuis vingt ans',
    'infirmière en poste depuis vingt ans',
  ],
  ["gérant d'une PME du secteur", "gérante d'une PME du secteur"],
];
function personneEtFonction() {
  const femme = random() < 0.5;
  const prenom = choice(femme ? PRENOMS_F : PRENOMS_M);
  return [`${prenom} ${choice(NOMS)}`, choice(FONCTIONS)[femme ? 1 : 0]];
}
/** « le budget » -> « du budget »: the de + le/les contraction. */
function de(sujet) {
  if (sujet.startsWith('le ')) return `du ${sujet.slice(3)}`;
  if (sujet.startsWith('les ')) return `des ${sujet.slice(4)}`;
  return `de ${sujet}`;
}
const CHAPOS = [
  '{Sujet} revient au premier plan. Nous avons repris les documents, les chiffres et les témoignages pour comprendre ce qui se joue vraiment.',
  'Derrière les annonces, {sujet} soulève des questions de moyens que personne ne tranche. Notre enquête.',
  'Un an de reportages, quarante entretiens et des données inédites : voici ce que nous avons appris sur {sujet}.',
  "Les positions se durcissent autour {de_sujet}. État des lieux, arguments et zones d'ombre.",
  "Ce que l'on sait, ce que l'on ignore et ce qui sera décidé dans les prochaines semaines sur {sujet}.",
  "Trois mois d'enquête sur les effets {de_sujet}, loin des communiqués et des éléments de langage.",
];
const STATUTS = [
  ...Array(74).fill('publie'),
  ...Array(10).fill('archive'),
  ...Array(7).fill('brouillon'),
  ...Array(5).fill('relecture'),
  ...Array(4).fill('programme'),
];
const INTROS = [
  'Nous avons voulu savoir ce que les chiffres disent réellement.',
  'Sur le terrain, la réalité est plus nuancée que les communiqués.',
  'Le sujet est technique ; ses effets, très concrets.',
];

const articles = [];
const articleSlugs = new Set();
const combos = {};
const articlesPublies = [];
for (let i = 1; i <= 420; i++) {
  const catNom = choice(Object.keys(SUJETS));
  const used = (combos[catNom] ??= new Set());
  let sujet, tpl;
  for (let k = 0; k < 60; k++) {
    sujet = choice(SUJETS[catNom]);
    tpl = choice(TEMPLATES);
    if (!used.has(`${sujet}|${tpl}`)) break;
  }
  used.add(`${sujet}|${tpl}`);
  const vars = { Sujet: cap(sujet), sujet, de_sujet: de(sujet) };
  const titre = fill(tpl, {
    ...vars,
    angle: choice(ANGLES),
    lieu: choice(VILLES),
  }).slice(0, 120);
  const statut = choice(STATUTS);
  const auteurId = choice(
    auteursParService[SERVICES[catNom]] ?? auteurs.map((a) => a[0])
  );
  let publieLe = null;
  if (statut === 'publie' || statut === 'archive')
    publieLe = between(at(2024, 1, 2), plus(NOW, { days: -1 }));
  else if (statut === 'programme')
    publieLe = plus(NOW, { days: randrange(1, 12), hours: randrange(0, 12) });
  const corps = sample(
    PARAGRAPHES,
    randrange(7, Math.min(13, PARAGRAPHES.length + 1))
  );
  const texte = [
    `${cap(sujet)} occupe le débat depuis plusieurs semaines. ${choice(INTROS)}`,
  ];
  for (const p of corps) {
    const [personne, fonction] = personneEtFonction();
    texte.push(
      fill(p, {
        annee: randrange(2016, 2025),
        annee_futur: randrange(2027, 2030),
        chiffre: randrange(3, 87),
        millions: randrange(12, 900),
        personne,
        fonction,
        lieu: choice(VILLES),
      })
    );
  }
  const contenu = texte.join('\n\n');
  const mots = wordCount(contenu);
  const acces = weighted(['libre', 'inscrit', 'abonne'], [52, 14, 34]);
  const modifie = earliest(
    plus(publieLe ?? NOW, { hours: randrange(1, 800) }),
    NOW
  );
  const publie = statut === 'publie' || statut === 'archive';
  const vues = publie
    ? Math.trunc(Math.abs(gauss(4200, 5200))) + randrange(30, 900)
    : 0;
  const meta = {
    og_titre: titre,
    og_type: 'article',
    robots: statut === 'publie' ? 'index,follow' : 'noindex',
    mots_cles: [slugify(sujet)],
    amp: random() > 0.7,
  };
  articles.push([
    i,
    titre,
    slugify(titre, articleSlugs),
    random() > 0.08 ? fill(choice(CHAPOS), vars) : null,
    contenu,
    statut,
    acces,
    vues,
    publieLe,
    modifie,
    auteurId,
    categories[catNom],
    random() < 0.28 ? choice(dossiers)[0] : null,
    random() > 0.15 ? randrange(1, 251) : null,
    statut === 'publie' && random() < 0.06,
    Math.max(1, Math.round(mots / 220)),
    mots,
    random() > 0.45 ? round2(uniform(2.4, 4.9)) : null,
    JSON.stringify(meta),
  ]);
  if (publie) articlesPublies.push([i, publieLe, acces]);
}
insert(
  'article',
  [
    'id',
    'titre',
    'slug',
    'chapo',
    'contenu',
    'statut',
    'acces',
    'vues',
    'publie_le',
    'modifie_le',
    'auteur_id',
    'categorie_id',
    'dossier_id',
    'media_une_id',
    'en_une',
    'temps_lecture',
    'nombre_mots',
    'note_moyenne',
    'metadonnees',
  ],
  articles,
  50
);

// ------------------------------------------------------------- tags, taggings
const TAGS =
  "retraites|budget|logement|immigration|éducation|justice|santé publique|hôpital|climat|sécheresse|énergie|nucléaire|éolien|transports|SNCF|automobile|industrie|emploi|chômage|salaires|télétravail|inflation|pouvoir d'achat|impôts|collectivités|municipales|élections|Parlement|Sénat|Union européenne|Allemagne|Italie|Espagne|Ukraine|Sahel|Chine|États-Unis|commerce|agriculture|pêche|biodiversité|pesticides|eau|recyclage|numérique|données personnelles|intelligence artificielle|cybersécurité|fibre|plateformes|cinéma|festival de Cannes|musique|streaming|festivals|édition|livres|bibliothèques|football|Ligue 1|rugby|Top 14|dopage|arbitrage|jeux olympiques|médias|presse|enquête|reportage|portrait".split(
    '|'
  );
const tagSlugs = new Set();
const tags = TAGS.map((nom, i) => [i + 1, nom, slugify(nom, tagSlugs), 0]);
const atRows = [];
for (const a of articles) {
  const poseBase = a[8] ?? a[9];
  for (const tagId of sample(range(1, TAGS.length + 1), randrange(1, 6))) {
    atRows.push([
      a[0],
      tagId,
      plus(poseBase, { minutes: -randrange(5, 4000) }),
    ]);
    tags[tagId - 1][3]++;
  }
}
insert('tag', ['id', 'nom', 'slug', 'usages'], tags);
insert('article_tag', ['article_id', 'tag_id', 'pose_le'], atRows);

// --------------------------------------------------------------- article_media
const LEGENDES = [
  'Vue générale, le jour de notre reportage.',
  "Détail de l'installation mise en cause.",
  "L'un des sites visités par notre journaliste.",
  'Archives, avant les travaux.',
  'La réunion publique du mois dernier.',
  "Sur place, quelques minutes avant l'annonce.",
];
const amRows = [];
for (const a of articles) {
  if (random() < 0.55) continue;
  sample(range(1, 251), randrange(1, 4)).forEach((mediaId, k) =>
    amRows.push([
      a[0],
      mediaId,
      k + 1,
      random() > 0.4 ? choice(LEGENDES) : null,
    ])
  );
}
insert(
  'article_media',
  ['article_id', 'media_id', 'position', 'legende_specifique'],
  amRows
);

// ---------------------------------------------------------- article revisions
const RESUMES = [
  'Relecture orthographique',
  'Ajout du chapô',
  "Correction d'un chiffre erroné",
  'Ajout de la réaction du ministère',
  'Titre raccourci pour la une',
  'Mise à jour après la conférence de presse',
  'Précision apportée sur la méthodologie',
  "Suppression d'un paragraphe redondant",
  "Ajout d'un lien vers le rapport cité",
  "Correction du nom d'une personne citée",
];
const revRows = [];
for (const a of articles) {
  const n = weighted([0, 1, 2, 3, 4], [22, 30, 25, 15, 8]);
  // A revision is written before publication, and never after now.
  const base = earliest(a[8] ?? a[9], NOW);
  for (let numero = 1; numero <= n; numero++) {
    const moment = plus(base, { hours: numero - randrange(1, 240) });
    revRows.push([
      revRows.length + 1,
      a[0],
      numero,
      random() > 0.3 ? a[10] : choice(auteurs)[0],
      a[1],
      random() > 0.2 ? a[4].slice(0, randrange(200, a[4].length + 1)) : null,
      choice(RESUMES),
      moment,
    ]);
  }
}
insert(
  'article_revision',
  [
    'id',
    'article_id',
    'numero',
    'auteur_id',
    'titre',
    'contenu',
    'resume_modification',
    'enregistre_le',
  ],
  revRows,
  60
);

// ----------------------------------------------------------------------- users
const FOURNISSEURS = [
  'gmail.com',
  'free.fr',
  'orange.fr',
  'outlook.fr',
  'laposte.net',
  'yahoo.fr',
  'protonmail.com',
  'wanadoo.fr',
];
const rubriques = catRows.filter((c) => c[1] !== null).map((c) => c[2]);
const utilisateurs = [];
const emailsUtilisateurs = new Set();
for (let i = 1; i <= 600; i++) {
  const femme = random() < 0.5;
  const prenom = choice(femme ? PRENOMS_F : PRENOMS_M);
  const nom = choice(NOMS);
  const base = slugify(`${prenom}.${nom}`);
  let email = `${base}@${choice(FOURNISSEURS)}`;
  for (let n = 2; emailsUtilisateurs.has(email); n++)
    email = `${base}${n}@${choice(FOURNISSEURS)}`;
  emailsUtilisateurs.add(email);
  const inscrit = between(at(2023, 6, 1), plus(NOW, { days: -2 }));
  const statut = weighted(
    ['actif', 'inactif', 'suspendu', 'supprime'],
    [82, 13, 3, 2]
  );
  const derniere =
    statut === 'supprime' || random() < 0.08 ? null : between(inscrit, NOW);
  const prefs = {
    rubriques: sample(rubriques, randrange(1, 5)),
    notifications: { alertes: random() > 0.5, hebdo: random() > 0.3 },
    theme: choice(['clair', 'sombre', 'auto']),
  };
  utilisateurs.push([
    i,
    email,
    prenom,
    nom,
    random() > 0.35 ? slugify(prenom) + randrange(10, 99) : null,
    random() > 0.12 ? choice(VILLES) : null,
    random() > 0.2 ? pad(randrange(1000, 98000), 5) : null,
    weighted(['FR', 'BE', 'CH', 'CA', 'LU', 'SN'], [88, 4, 3, 3, 1, 1]),
    inscrit,
    derniere,
    random() > 0.11,
    random() > 0.6,
    random() > 0.1 ? JSON.stringify(prefs) : null,
    statut,
  ]);
}
insert(
  'utilisateur',
  [
    'id',
    'email',
    'prenom',
    'nom',
    'pseudo',
    'ville',
    'code_postal',
    'pays',
    'inscrit_le',
    'derniere_connexion',
    'email_verifie',
    'accepte_prospection',
    'preferences',
    'statut',
  ],
  utilisateurs,
  100
);

// ---------------------------------------------------- plans and promo codes
const FORMULES = [
  [
    1,
    'Découverte',
    'decouverte',
    'mensuel',
    1.0,
    0,
    false,
    1,
    'Le premier mois à 1 €, puis 9,90 € par mois, sans engagement.',
    true,
  ],
  [
    2,
    'Numérique mensuel',
    'num-mensuel',
    'mensuel',
    9.9,
    7,
    true,
    1,
    'Tous les articles, la newsletter du matin, sans engagement.',
    true,
  ],
  [
    3,
    'Numérique annuel',
    'num-annuel',
    'annuel',
    99.0,
    7,
    true,
    1,
    'Deux mois offerts par rapport au mensuel.',
    true,
  ],
  [
    4,
    'Intégral',
    'integral',
    'mensuel',
    19.9,
    0,
    true,
    2,
    "Le numérique, les hors-séries et l'accès aux archives depuis 1998.",
    true,
  ],
  [
    5,
    'Étudiant',
    'etudiant',
    'mensuel',
    4.9,
    30,
    true,
    1,
    'Sur justificatif de scolarité, renouvelable chaque année.',
    true,
  ],
  [
    6,
    'Duo',
    'duo',
    'annuel',
    149.0,
    0,
    true,
    2,
    'Deux comptes sur la même adresse. Offre retirée de la vente en 2025.',
    false,
  ],
];
insert(
  'formule_abonnement',
  [
    'id',
    'nom',
    'code',
    'periodicite',
    'prix',
    'jours_essai',
    'acces_archives',
    'nombre_comptes',
    'description',
    'actif',
  ],
  FORMULES
);
const PROMOS = [
  [
    'RENTREE2024',
    'Offre de rentrée, deux mois à moitié prix',
    50,
    null,
    '2024-09-01',
    '2024-10-15',
    2000,
  ],
  [
    'NOEL2024',
    'Abonnement offert pour Noël',
    30,
    null,
    '2024-12-01',
    '2024-12-31',
    1500,
  ],
  [
    'ETUDIANT25',
    "Remise supplémentaire sur l'offre étudiante",
    25,
    null,
    '2025-01-10',
    null,
    null,
  ],
  ['PRESSE10', 'Tarif confrères', null, 10.0, '2024-03-01', null, 300],
  [
    'PARRAIN20',
    'Parrainage : 20 % pour le filleul',
    20,
    null,
    '2024-01-01',
    null,
    null,
  ],
  [
    'SALONLIVRE',
    'Opération Salon du livre',
    40,
    null,
    '2025-03-12',
    '2025-03-25',
    500,
  ],
  [
    'RETOUR15',
    'Offre de reconquête après résiliation',
    15,
    null,
    '2025-06-01',
    '2026-06-01',
    800,
  ],
  [
    'BLACKFRIDAY',
    'Vendredi noir : 60 % pendant trois mois',
    60,
    null,
    '2024-11-25',
    '2024-12-02',
    3000,
  ],
  [
    'JO2024',
    'Opération Jeux olympiques',
    20,
    null,
    '2024-07-20',
    '2024-08-15',
    1000,
  ],
  [
    'LECTEUR5',
    'Cinq euros de remise immédiate',
    null,
    5.0,
    '2025-09-01',
    '2025-12-31',
    1200,
  ],
  [
    'PRINTEMPS26',
    'Offre de printemps',
    35,
    null,
    '2026-03-20',
    '2026-05-31',
    1500,
  ],
  ['ANNIV', 'Vingt ans du journal', 45, null, '2026-01-15', '2026-02-15', 2500],
  [
    'COLLECTIF',
    'Tarif collectivités et bibliothèques',
    null,
    25.0,
    '2024-02-01',
    null,
    null,
  ],
  [
    'TESTINTERNE',
    'Code de test, ne pas diffuser',
    100,
    null,
    '2024-01-01',
    null,
    50,
  ],
  [
    'MOBILITE',
    'Offre nouveaux arrivants',
    10,
    null,
    '2025-10-01',
    '2026-10-01',
    600,
  ],
];
const promos = PROMOS.map(([code, libelle, pct, montant, du, au, maxi], i) => [
  i + 1,
  code,
  libelle,
  pct,
  montant,
  isoDay(du),
  au ? isoDay(au) : null,
  maxi,
  0,
]);

// ---------------------------------------------- payment methods, subscriptions
const mpRows = [];
const mpParUtilisateur = {};
const abonnesIds = sample(range(1, 601), 430).sort((a, b) => a - b);
for (const uid of abonnesIds) {
  const u = utilisateurs[uid - 1];
  const nb = weighted([1, 2], [88, 12]);
  for (let k = 0; k < nb; k++) {
    const id = mpRows.length + 1;
    const type = weighted(['carte', 'prelevement', 'paypal'], [78, 15, 7]);
    const carte = type === 'carte';
    mpRows.push([
      id,
      uid,
      type,
      carte
        ? weighted(['visa', 'mastercard', 'cb', 'amex'], [45, 35, 15, 5])
        : null,
      carte ? pad(randrange(0, 10000), 4) : null,
      random() > 0.1 ? `${u[2]} ${u[3]}`.toUpperCase() : null,
      carte ? day(randrange(2026, 2031), randrange(1, 13), 1) : null,
      type === 'prelevement'
        ? `FR76 **** **** **** **** ${pad(randrange(0, 10000), 4)}`
        : null,
      k === 0,
      between(u[8], NOW),
    ]);
    (mpParUtilisateur[uid] ??= []).push(id);
  }
}
insert(
  'moyen_paiement',
  [
    'id',
    'utilisateur_id',
    'type',
    'reseau',
    'quatre_derniers',
    'titulaire',
    'expire_le',
    'iban_masque',
    'par_defaut',
    'ajoute_le',
  ],
  mpRows,
  120
);

const MOTIFS_RESIL = [
  'Trop cher',
  'Ne lit plus assez souvent',
  'Passage à une offre papier',
  'Doublon avec un abonnement pro',
  'Insatisfait de la couverture politique',
  "Déménagement à l'étranger",
  'Difficultés financières',
  'Problème technique non résolu',
  null,
];
const abonnements = [];
const abMeta = [];
for (const uid of abonnesIds) {
  const id = abonnements.length + 1;
  let formuleId = weighted([1, 2, 3, 4, 5, 6], [8, 38, 22, 14, 13, 5]);
  let debute = toDay(
    plus(utilisateurs[uid - 1][8], { days: randrange(0, 200) })
  );
  if (debute > TODAY) debute = plus(TODAY, { days: -randrange(1, 40) });
  if (formuleId === 6 && debute > day(2025, 6, 30)) formuleId = 2; // the Duo offer left the catalogue in mid-2025
  let statut = weighted(
    ['actif', 'resilie', 'impaye', 'essai', 'suspendu'],
    [58, 28, 6, 5, 3]
  );
  // A trial only makes sense on a subscription that has just started.
  if (statut === 'essai' && daysBetween(TODAY, debute) > 30) statut = 'actif';
  const promoId = random() < 0.3 ? choice(promos)[0] : null;
  // "Découverte" is an entry price: the recurring amount is the monthly digital one.
  let prix = FORMULES[formuleId === 1 ? 1 : formuleId - 1][4];
  if (promoId) {
    const p = promos[promoId - 1];
    prix = p[3]
      ? round2(prix * (1 - p[3] / 100))
      : Math.max(1, round2(prix - p[4]));
    p[8]++;
  }
  const pas = FORMULES[formuleId - 1][3] === 'mensuel' ? 30 : 365;
  let resilie = null;
  if (statut === 'resilie') {
    resilie = plus(debute, { days: randrange(pas, pas * 12) });
    if (resilie > TODAY) {
      const recent = plus(TODAY, { days: -randrange(1, 60) });
      resilie = recent > debute ? recent : debute;
    }
  }
  let prochaine = null;
  if (statut === 'actif' || statut === 'essai' || statut === 'impaye') {
    // Next due date, on the cycle started at debute_le.
    const cycles = Math.floor(daysBetween(TODAY, debute) / pas) + 1;
    prochaine = plus(debute, { days: pas * cycles });
  }
  const moyen = choice(mpParUtilisateur[uid]);
  abonnements.push([
    id,
    uid,
    formuleId,
    promoId,
    moyen,
    statut,
    debute,
    prochaine,
    resilie,
    statut === 'resilie' ? choice(MOTIFS_RESIL) : null,
    statut === 'actif' || statut === 'essai' ? true : random() < 0.2,
    prix,
  ]);
  abMeta.push({
    id,
    debute,
    fin: resilie ?? TODAY,
    pas,
    prix,
    statut,
    moyen,
    formuleId,
  });
}
insert(
  'code_promo',
  [
    'id',
    'code',
    'libelle',
    'reduction_pourcent',
    'reduction_montant',
    'valide_du',
    'valide_au',
    'utilisations_max',
    'utilisations',
  ],
  promos
);
insert(
  'abonnement',
  [
    'id',
    'utilisateur_id',
    'formule_id',
    'code_promo_id',
    'moyen_paiement_id',
    'statut',
    'debute_le',
    'prochaine_echeance',
    'resilie_le',
    'motif_resiliation',
    'renouvellement_auto',
    'prix_paye',
  ],
  abonnements,
  120
);

// ------------------------------------------------------- payments and refunds
const ECHECS = [
  'Provision insuffisante',
  'Carte expirée',
  'Opposition bancaire',
  'Authentification 3-D Secure abandonnée',
  'Plafond de paiement atteint',
];
const paiements = [];
const rembRows = [];
for (const ab of abMeta) {
  for (
    let d = ab.debute, numero = 1;
    d <= ab.fin && numero <= 40;
    d = plus(d, { days: ab.pas }), numero++
  ) {
    const pid = paiements.length + 1;
    const montant = ab.formuleId === 1 && numero === 1 ? 1 : ab.prix;
    let st = weighted(
      ['reussi', 'refuse', 'rembourse', 'en_attente'],
      [92, 4, 3, 1]
    );
    if (ab.statut === 'impaye' && sameDay(d, ab.fin)) st = 'refuse';
    let paye = plus(new Date(d), {
      hours: randrange(0, 24),
      minutes: randrange(0, 60),
      seconds: randrange(0, 60),
    });
    if (paye > NOW) paye = plus(NOW, { minutes: -randrange(5, 300) });
    const mois = pad(paye.getUTCMonth() + 1, 2);
    paiements.push([
      pid,
      ab.id,
      ab.moyen,
      `PAY-${paye.getUTCFullYear()}${mois}-${pad(pid, 6)}`,
      st === 'reussi' || st === 'rembourse'
        ? `F${paye.getUTCFullYear()}${mois}-${pad(pid, 5)}`
        : null,
      round2(montant),
      round2(montant - montant / 1.021),
      'EUR',
      st,
      st === 'refuse' ? choice(ECHECS) : null,
      paye,
      d,
      plus(d, { days: ab.pas - 1 }),
    ]);
    if (st === 'rembourse') {
      rembRows.push([
        rembRows.length + 1,
        pid,
        round2(montant),
        weighted(
          ['doublon', 'erreur_facturation', 'geste_commercial', 'retractation'],
          [20, 30, 35, 15]
        ),
        choice([
          'Demande du lecteur par courriel.',
          'Suite à une réclamation au service abonnements.',
          'Double prélèvement constaté par la banque.',
          null,
        ]),
        plus(paye, { days: randrange(1, 30) }),
        choice(['service.abonnements', 'comptabilite', 'support.n2']),
      ]);
    }
  }
}
insert(
  'paiement',
  [
    'id',
    'abonnement_id',
    'moyen_paiement_id',
    'reference',
    'numero_facture',
    'montant',
    'tva',
    'devise',
    'statut',
    'motif_echec',
    'paye_le',
    'periode_debut',
    'periode_fin',
  ],
  paiements
);
insert(
  'remboursement',
  [
    'id',
    'paiement_id',
    'montant',
    'motif',
    'commentaire',
    'rembourse_le',
    'traite_par',
  ],
  rembRows
);

// -------------------------------------------------------------------- comments
const COMMENTAIRES = [
  'Merci pour cet article, le sujet méritait vraiment ce travail de terrain.',
  "Article intéressant, mais j'aurais aimé voir les chiffres de 2019 pour comparer.",
  'Vous citez le rapport sans donner le lien, dommage.',
  'Je travaille dans le secteur et je confirme ce que décrit le reportage.',
  'Le titre est un peu racoleur par rapport au contenu, qui est nuancé.',
  'Enfin un papier qui ne se contente pas de reprendre le communiqué officiel.',
  "Il manque le point de vue des usagers, on n'entend que les institutions.",
  "Excellente enquête. C'est pour ça que je suis abonné depuis trois ans. 👏",
  "Vous oubliez de préciser que la mesure a déjà été testée ailleurs, avec les résultats que l'on sait.",
  'Un peu court sur la partie financement, mais bonne synthèse par ailleurs.',
  "Je ne suis pas d'accord avec la conclusion, les données disent l'inverse sur le long terme.",
  "Merci d'avoir donné la parole aux agents de terrain, ça change.",
  "Est-ce qu'un suivi est prévu dans six mois ? Ce serait utile.",
  'Article à faire lire à tous ceux qui pensent que le sujet est simple.',
  'La comparaison européenne est bancale : les systèmes ne sont pas comparables.',
  "Bravo pour l'infographie, très claire.",
  'On sent le travail de documentation derrière, merci.',
  'Toujours les mêmes arguments, rien de neuf dans ce papier.',
  'Petite coquille dans le quatrième paragraphe : « des » au lieu de « les ».',
  "J'aurais aimé plus de contexte historique, le sujet ne date pas d'hier.",
];
const REPONSES = [
  "Tout à fait d'accord avec vous.",
  "Le lien vers le rapport est dans l'encadré en bas de l'article.",
  "Je ne partage pas votre lecture : l'article précise bien la méthodologie.",
  'Même expérience de mon côté, dans une autre région.',
  'Vous confondez deux dispositifs différents.',
  "Merci pour la précision, je n'avais pas vu cet aspect.",
];
const utilisateursActifs = utilisateurs
  .filter((u) => u[13] === 'actif' || u[13] === 'inactif')
  .map((u) => u[0]);
const commentaires = [];
const racinesParArticle = new Map();
for (const [aid, publieLe] of articlesPublies) {
  const n = weighted([0, 1, 2, 3, 4, 5, 8], [30, 20, 16, 12, 9, 8, 5]);
  for (let k = 0; k < n; k++) {
    const id = commentaires.length + 1;
    const uid = choice(utilisateursActifs);
    const poste = between(
      publieLe,
      earliest(plus(publieLe, { days: 20 }), NOW)
    );
    const statut = weighted(
      ['publie', 'en_attente', 'masque', 'supprime'],
      [86, 7, 5, 2]
    );
    const modere =
      statut === 'masque' || statut === 'supprime'
        ? plus(poste, { hours: randrange(1, 60) })
        : null;
    commentaires.push([
      id,
      aid,
      random() > 0.03 ? uid : null,
      null,
      choice(COMMENTAIRES),
      statut,
      randrange(0, 180),
      randrange(0, 25),
      poste,
      modere,
      modere ? choice(moderateurs) : null,
    ]);
    if (!racinesParArticle.has(aid)) racinesParArticle.set(aid, []);
    racinesParArticle.get(aid).push([id, poste]);
  }
}
// replies
for (const [aid, racines] of racinesParArticle) {
  for (const [parentId, poste] of racines) {
    if (random() >= 0.22) continue;
    const reponse = between(poste, earliest(plus(poste, { days: 5 }), NOW));
    commentaires.push([
      commentaires.length + 1,
      aid,
      choice(utilisateursActifs),
      parentId,
      choice(REPONSES),
      weighted(['publie', 'en_attente', 'masque'], [90, 6, 4]),
      randrange(0, 60),
      randrange(0, 10),
      reponse,
      null,
      null,
    ]);
  }
}
insert(
  'commentaire',
  [
    'id',
    'article_id',
    'utilisateur_id',
    'parent_id',
    'contenu',
    'statut',
    'votes_positifs',
    'votes_negatifs',
    'poste_le',
    'modere_le',
    'modere_par',
  ],
  commentaires,
  150
);

const signRows = sample(commentaires, 95).map((c, i) => {
  const traite = random() > 0.35;
  return [
    i + 1,
    c[0],
    random() > 0.1 ? choice(utilisateursActifs) : null,
    weighted(
      ['injure', 'hors_sujet', 'spam', 'desinformation', 'harcelement'],
      [25, 30, 20, 20, 5]
    ),
    choice([
      'Propos déplacés envers un autre lecteur.',
      "Hors sujet par rapport à l'article.",
      'Lien commercial répété.',
      "Affirmation contredite par l'article lui-même.",
      null,
    ]),
    plus(c[8], { hours: randrange(1, 72) }),
    traite,
    traite ? weighted(['conserve', 'masque', 'supprime'], [60, 28, 12]) : null,
  ];
});
insert(
  'signalement_commentaire',
  [
    'id',
    'commentaire_id',
    'utilisateur_id',
    'motif',
    'precision_texte',
    'signale_le',
    'traite',
    'decision',
  ],
  signRows
);

// ------------------------------------------------------------------- bookmarks
const abonnesActifs = new Set(
  abonnements
    .filter((a) => a[5] === 'actif' || a[5] === 'essai')
    .map((a) => a[1])
);
const favoris = [];
const favorisVus = new Set();
for (let k = 0; k < 1000; k++) {
  const uid = choice(utilisateursActifs);
  const [aid, publieLe] = choice(articlesPublies);
  if (favorisVus.has(`${uid}:${aid}`)) continue;
  favorisVus.add(`${uid}:${aid}`);
  favoris.push([uid, aid, between(publieLe, NOW), random() > 0.4]);
}
insert('favori', ['utilisateur_id', 'article_id', 'ajoute_le', 'lu'], favoris);

// ------------------------------------------------------------------ page reads
const lectures = [];
for (let i = 1; i <= 3200; i++) {
  const [aid, publieLe, acces] = choice(articlesPublies);
  const uid = random() < 0.55 ? choice(utilisateursActifs) : null;
  const abonne = uid !== null && abonnesActifs.has(uid);
  let duree = Math.max(5, Math.trunc(Math.abs(gauss(150, 130))));
  let pct = Math.min(
    100,
    Math.max(2, Math.trunc(duree / 3.2) + randrange(-10, 15))
  );
  const paywall = acces === 'abonne' && !abonne;
  if (paywall) {
    duree = Math.min(duree, 60);
    pct = Math.min(pct, 22);
  }
  lectures.push([
    i,
    aid,
    uid,
    between(publieLe, NOW),
    duree,
    pct,
    weighted(
      [
        'accueil',
        'rubrique',
        'recherche',
        'newsletter',
        'reseaux',
        'moteur',
        'notification',
      ],
      [30, 14, 8, 12, 18, 14, 4]
    ),
    weighted(['mobile', 'ordinateur', 'tablette'], [58, 34, 8]),
    paywall,
  ]);
}
insert(
  'lecture',
  [
    'id',
    'article_id',
    'utilisateur_id',
    'lu_le',
    'duree_secondes',
    'pourcentage_lu',
    'source',
    'appareil',
    'paywall_affiche',
  ],
  lectures,
  250
);

// ----------------------------------------------------------------- newsletters
const NEWSLETTERS = [
  [
    1,
    'Le Fil du matin',
    'La sélection de la rédaction, tous les matins à 7 h.',
    'quotidienne',
    '07:00:00',
    false,
  ],
  [
    2,
    "L'hebdo culture",
    'Nos critiques cinéma, musique et livres du samedi.',
    'hebdomadaire',
    '10:00:00',
    false,
  ],
  [
    3,
    'Économie & emploi',
    "Chaque mercredi, ce qu'il faut retenir côté entreprises.",
    'hebdomadaire',
    '08:30:00',
    false,
  ],
  [
    4,
    'Le club des abonnés',
    'Les coulisses de la rédaction, réservées aux abonnés.',
    'mensuelle',
    '18:00:00',
    true,
  ],
  [
    5,
    'Alerte info',
    "Les informations majeures, dès qu'elles tombent.",
    'quotidienne',
    '12:00:00',
    false,
  ],
];
insert(
  'newsletter',
  [
    'id',
    'nom',
    'slug',
    'description',
    'periodicite',
    'heure_envoi',
    'reservee_abonnes',
  ],
  NEWSLETTERS.map(([id, nom, ...rest]) => [id, nom, slugify(nom), ...rest])
);
const inscriptions = [];
const inscriptionsVues = new Set();
for (let k = 0; k < 1100; k++) {
  const uid = choice(utilisateurs)[0];
  const nid = weighted([1, 2, 3, 4, 5], [35, 18, 16, 14, 17]);
  if (inscriptionsVues.has(`${uid}:${nid}`)) continue;
  if (nid === 4 && !abonnesActifs.has(uid)) continue;
  inscriptionsVues.add(`${uid}:${nid}`);
  const inscrit = between(utilisateurs[uid - 1][8], NOW);
  inscriptions.push([
    uid,
    nid,
    inscrit,
    random() < 0.18 ? between(inscrit, NOW) : null,
    weighted(
      ['inscription', 'popup', 'pied_de_page', 'offre'],
      [50, 20, 20, 10]
    ),
  ]);
}
insert(
  'inscription_newsletter',
  ['utilisateur_id', 'newsletter_id', 'inscrit_le', 'desinscrit_le', 'origine'],
  inscriptions
);

const envois = [];
const ENVOIS_PAR_PERIODICITE = {
  quotidienne: 45,
  hebdomadaire: 30,
  mensuelle: 18,
};
for (const [nid, nom, , periodicite] of NEWSLETTERS) {
  for (let k = 0; k < ENVOIS_PAR_PERIODICITE[periodicite]; k++) {
    const [aid, publieLe] = choice(articlesPublies);
    let envoye = plus(publieLe, { hours: randrange(2, 30) });
    if (envoye > NOW) envoye = plus(NOW, { days: -randrange(1, 300) });
    const destinataires = randrange(4200, 38000);
    const ouvertures = Math.trunc(destinataires * uniform(0.28, 0.61));
    envois.push([
      envois.length + 1,
      nid,
      `${nom} — ${articles[aid - 1][1]}`.slice(0, 160),
      aid,
      envoye,
      destinataires,
      ouvertures,
      Math.trunc(ouvertures * uniform(0.06, 0.28)),
      randrange(0, 90),
    ]);
  }
}
insert(
  'envoi_newsletter',
  [
    'id',
    'newsletter_id',
    'objet',
    'article_une_id',
    'envoye_le',
    'destinataires',
    'ouvertures',
    'clics',
    'desinscriptions',
  ],
  envois,
  100
);

// ---------------------------------------------------------------------- output
if (dialect === 'mysql') {
  OUT.unshift('SET NAMES utf8mb4;', 'SET FOREIGN_KEY_CHECKS = 1;');
} else {
  // the rows carry their ids: move each identity past them
  for (const [table, next] of nextIds)
    OUT.push(`ALTER TABLE ${table} ALTER COLUMN id RESTART WITH ${next};`);
  OUT.unshift("SET client_encoding = 'UTF8';", 'BEGIN;');
  OUT.push('COMMIT;');
}
process.stdout.write(`${OUT.join('\n')}\n`);
