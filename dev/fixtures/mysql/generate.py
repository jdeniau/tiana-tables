# -*- coding: utf-8 -*-
"""Generates the rows of the "Le Fil" development dataset (a French news site).

Deterministic: the same seed always produces the same file.
"""
import random, json, unicodedata, sys
from datetime import datetime, timedelta, date, time

R = random.Random(20260922)
OUT = []
def w(s): OUT.append(s)
def q(v):
    if v is None: return "NULL"
    if isinstance(v, bool): return "1" if v else "0"
    if isinstance(v, (int, float)): return str(v)
    if isinstance(v, datetime): return "'" + v.strftime("%Y-%m-%d %H:%M:%S") + "'"
    if isinstance(v, date): return "'" + v.strftime("%Y-%m-%d") + "'"
    return "'" + str(v).replace("\\", "\\\\").replace("'", "''") + "'"
def insert(table, cols, rows, chunk=200):
    for i in range(0, len(rows), chunk):
        part = rows[i:i+chunk]
        w("INSERT INTO %s (%s) VALUES\n%s;" % (
            table, ", ".join(cols),
            ",\n".join("(" + ", ".join(q(c) for c in r) + ")" for r in part)))
def slugify(s, seen=None):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = "".join(c if c.isalnum() else "-" for c in s.lower())
    while "--" in s: s = s.replace("--", "-")
    s = s.strip("-")[:140]
    if seen is not None:
        base, n = s, 2
        while s in seen:
            s = "%s-%d" % (base, n); n += 1
        seen.add(s)
    return s
def cap(s): return s[0].upper() + s[1:]
NOW = datetime(2026, 9, 22, 6, 0, 0)  # the server runs in UTC, two hours behind Paris
def dt_between(a, b):
    delta = int((b - a).total_seconds())
    return a + timedelta(seconds=R.randrange(max(delta, 1)))

# ---------------------------------------------------------------- people pools
NOMS = """Martin Bernard Dubois Thomas Robert Richard Petit Durand Leroy Moreau Simon Laurent
Lefebvre Michel Garcia David Bertrand Roux Vincent Fournier Morel Girard Andre Lefevre Mercier
Dupont Lambert Bonnet Francois Martinez Legrand Garnier Faure Rousseau Blanc Guerin Muller Henry
Roussel Nicolas Perrin Morin Mathieu Clement Gauthier Dumont Lopez Fontaine Chevalier Robin
Masson Sanchez Gerard Nguyen Boyer Denis Lemaire Duval Joly Gautier Roger Roche Roy Noel Meyer
Lucas Meunier Jean Perez Marchand Dufour Blanchard Marie Barbier Brun Dumas Brunet Schmitt Leroux
Colin Fernandez Pierre Renard Arnaud Rolland Caron Aubert Giraud Leclerc Vidal Bourgeois Renaud
Lemoine Picard Gaillard Philippe Leclercq Lacroix Fabre Dupuis Olivier Rodriguez Benoit""".split() + ["Da Silva"]
PRENOMS_F = """Camille Sophie Marie Julie Claire Lucie Emma Ines Sarah Chloe Manon Alice Laura Anais
Elodie Pauline Amelie Celine Nathalie Isabelle Valerie Sandrine Aurelie Delphine Fanny Margaux
Oceane Justine Charlotte Helene Agnes Beatrice Myriam Leila Fatoumata Awa Nour Mathilde Solene
Estelle Clemence Adele Louise Juliette Alix Maud Elsa Roxane Sabine Karine""".split()
PRENOMS_M = """Pierre Julien Nicolas Thomas Antoine Maxime Lucas Hugo Paul Alexandre Guillaume
Sebastien Vincent Romain Mathieu Benjamin Clement Florian Adrien Damien Fabien Gregory Olivier
Stephane Laurent Franck Christophe Gilles Bruno Patrick Karim Mehdi Youssef Amadou Samuel Victor
Etienne Arthur Raphael Theo Basile Gaspard Marin Simon Cedric Yann Loic Tristan Marc Xavier""".split()
VILLES = ["Paris","Lyon","Marseille","Bordeaux","Lille","Nantes","Toulouse","Strasbourg","Rennes",
"Montpellier","Grenoble","Nancy","Rouen","Brest","Dijon","Clermont-Ferrand","Le Havre","Angers",
"Tours","Reims","Saint-Étienne","Caen","Limoges","Besançon","Perpignan","Bruxelles","Genève",
"Montréal","Dakar","Casablanca"]

# ------------------------------------------------------------------- categories
ARBRE = [
    ("Actualité", "#b45f4d", [
        ("Politique", "La vie des institutions, du Parlement aux conseils municipaux"),
        ("Société", "Éducation, justice, services publics et faits de société"),
        ("International", "Ce qui bouge hors de nos frontières"),
    ]),
    ("Économie", "#3b6ea5", [
        ("Entreprises", "Stratégies, résultats et restructurations"),
        ("Emploi", "Marché du travail, salaires et conditions de travail"),
    ]),
    ("Culture", "#8a5fa8", [
        ("Cinéma", "Sorties, festivals et industrie du film"),
        ("Musique", "Albums, concerts et économie du streaming"),
        ("Livres", "Rentrée littéraire, essais et édition"),
    ]),
    ("Sport", "#4f8a5b", [
        ("Football", "Ligue 1, coupes d'Europe et sélections"),
        ("Rugby", "Top 14, Coupe du monde et formation"),
    ]),
    ("Sciences", "#c08a2e", [
        ("Environnement", "Climat, biodiversité et transition énergétique"),
        ("Santé", "Hôpital, recherche médicale et prévention"),
        ("Numérique", "Technologies, données personnelles et régulation"),
    ]),
]
categories, cat_rows, leaf_ids = {}, [], []
cid = 0
for ordre, (racine, couleur, enfants) in enumerate(ARBRE, start=1):
    cid += 1
    racine_id = cid
    cat_rows.append((cid, None, racine, slugify(racine), None, couleur, ordre))
    for o2, (nom, desc) in enumerate(enfants, start=1):
        cid += 1
        cat_rows.append((cid, racine_id, nom, slugify(nom), desc, couleur, o2))
        categories[nom] = cid
        leaf_ids.append(cid)
insert("categorie", ["id","parent_id","nom","slug","description","couleur","ordre"], cat_rows)

# ---------------------------------------------------------------------- authors
SERVICES = {"Politique":"Politique","Société":"Société","International":"International",
"Entreprises":"Économie","Emploi":"Économie","Cinéma":"Culture","Musique":"Culture",
"Livres":"Culture","Football":"Sports","Rugby":"Sports","Environnement":"Sciences",
"Santé":"Sciences","Numérique":"Sciences"}
SERVICE_LIST = sorted(set(SERVICES.values()))
BIO = ("{prenom} {nom} couvre {domaine} pour Le Fil depuis {annee}. "
       "{pron} a précédemment travaillé {passe}.")
PASSES = ["en presse quotidienne régionale","pour une agence de presse","à la rédaction web d'une radio publique",
"comme pigiste à Bruxelles","dans un hebdomadaire économique","pour un média en ligne indépendant",
"au service documentation du journal","comme correspondant à l'étranger"]
DOMAINES = {"Politique":"les institutions et la vie parlementaire","Société":"l'école, la justice et les services publics",
"International":"l'Europe centrale et les Balkans","Économie":"les entreprises et le marché du travail",
"Culture":"le cinéma, la musique et l'édition","Sports":"le football et le rugby professionnels",
"Sciences":"le climat, la santé et le numérique"}
ROLES = ["redacteur"]*16 + ["pigiste"]*10 + ["correspondant"]*5 + ["redacteur_chef"]*4 + ["photographe"]*4 + ["stagiaire"]*3
auteurs, emails_vus = [], set()
for i in range(1, 43):
    femme = R.random() < 0.48
    prenom = R.choice(PRENOMS_F if femme else PRENOMS_M)
    nom = R.choice(NOMS)
    genre = "female" if femme else ("male" if R.random() < 0.96 else "other")
    role = ROLES[(i-1) % len(ROLES)]
    service = R.choice(SERVICE_LIST)
    base = slugify(prenom + "." + nom)
    email = base + "@lefil.fr"
    n = 2
    while email in emails_vus:
        email = "%s%d@lefil.fr" % (base, n); n += 1
    emails_vus.add(email)
    arrive = date(2026, 1, 1) - timedelta(days=R.randrange(120, 6200))
    actif = R.random() > 0.12
    parti = None if actif else arrive + timedelta(days=R.randrange(400, 2500))
    if parti and parti > date(2026, 9, 1): parti = date(2026, 9, 1)
    bio = None if R.random() < 0.12 else BIO.format(
        prenom=prenom, nom=nom, domaine=DOMAINES[service],
        annee=arrive.year, pron="Elle" if femme else "Il", passe=R.choice(PASSES))
    auteurs.append([i, nom, prenom, genre, email, role, service, bio,
                    R.choice(VILLES) if R.random() > 0.1 else None, arrive, parti, actif,
                    ("@%s_lefil" % slugify(prenom + nom)) if R.random() > 0.45 else None])
insert("auteur", ["id","nom","prenom","genre","email","role","service","biographie","ville",
                  "arrive_le","parti_le","actif","compte_x"], auteurs)
auteurs_par_service = {}
for a in auteurs:
    if a[11]:  # actif
        auteurs_par_service.setdefault(a[6], []).append(a[0])
photographes = [a[0] for a in auteurs if a[5] == "photographe"] or [1]
moderateurs = [a[0] for a in auteurs if a[5] in ("redacteur_chef", "redacteur")][:8]

# ---------------------------------------------------------------- special reports
DOSSIERS = [
 ("Retraites : la réforme de trop ?", "Tous nos articles sur le parcours parlementaire de la réforme et ses effets.", "2024-02-11", "2024-11-30", 0),
 ("Municipales 2026", "Enquêtes, portraits et résultats dans les villes où le scrutin s'est joué à peu de voix.", "2025-09-01", None, 1),
 ("Le prix de l'énergie", "Factures, tarifs réglementés et choix industriels : notre suivi au long cours.", "2024-01-15", None, 0),
 ("Hôpital public : l'état des lieux", "Six mois d'enquête dans douze établissements, des urgences aux blocs.", "2024-06-03", "2025-03-20", 0),
 ("Jeux olympiques : l'après", "Ce que les installations et les budgets deviennent une fois la flamme éteinte.", "2024-09-10", "2025-07-15", 0),
 ("Intelligence artificielle au travail", "Ce que l'automatisation change vraiment dans les métiers du tertiaire.", "2025-01-20", None, 1),
 ("Sécheresse : la carte de l'eau", "Restrictions, nappes phréatiques et conflits d'usage, département par département.", "2025-04-02", None, 0),
 ("Rentrée littéraire", "Nos lectures et nos entretiens parmi les cinq cents romans de la rentrée.", "2025-08-18", "2025-11-05", 0),
 ("Coupe du monde de rugby", "Les Bleus, les adversaires et l'économie du tournoi.", "2024-08-01", "2024-10-30", 0),
 ("Données personnelles : qui sait quoi ?", "Notre série sur le pistage publicitaire et les recours possibles.", "2025-11-12", None, 0),
 ("Logement : la crise silencieuse", "Construction en panne, loyers en hausse, parc social saturé.", "2026-01-08", None, 1),
 ("Élections européennes", "Programmes, campagnes et résultats scrutin par scrutin.", "2024-03-04", "2024-07-01", 0),
]
dossiers = []
seen_slugs = set()
for i, (titre, desc, ouvert, clos, une) in enumerate(DOSSIERS, start=1):
    dossiers.append([i, titre, slugify(titre, seen_slugs), desc,
                     date.fromisoformat(ouvert), date.fromisoformat(clos) if clos else None, une])
insert("dossier", ["id","titre","slug","description","ouvert_le","clos_le","en_une"], dossiers)

# ----------------------------------------------------------------------- media
SUJETS_PHOTO = ["une manifestation place de la République","la façade de l'Assemblée nationale",
"un chantier de logements sociaux","une salle de classe en début d'année","un service d'urgences la nuit",
"un champ de colza asséché","une ligne de production automobile","un guichet de La Poste",
"un quai de gare à l'heure de pointe","un parc éolien en mer","une salle de cinéma vide",
"un concert dans une salle de taille moyenne","une librairie de quartier","un entraînement de Ligue 1",
"une mêlée du Top 14","un centre de données","un laboratoire de recherche","une cantine scolaire",
"un marché de plein air","un tribunal judiciaire"]
AGENCES = ["AFP","Reuters","Hans Lucas","Divergence","Le Fil","MYOP","Getty Images"]
medias = []
for i in range(1, 251):
    sujet = R.choice(SUJETS_PHOTO)
    typ = R.choices(["photo","illustration","infographie","video"], [70, 12, 13, 5])[0]
    importe = dt_between(datetime(2024, 1, 1), NOW)
    licence = R.choices(["maison","agence","creative_commons","droits_reserves"], [45, 35, 12, 8])[0]
    credit = "Le Fil" if licence == "maison" else R.choice(AGENCES)
    largeur = R.choice([1200, 1600, 2000, 2400, 3000])
    hauteur = int(largeur / R.choice([1.5, 1.33, 1.77]))
    medias.append([i, "%04d-%s.%s" % (i, slugify(sujet), "mp4" if typ == "video" else "jpg"), typ,
                   cap(sujet) + ("." if R.random() > 0.3 else ", en septembre 2026."),
                   cap(sujet) if R.random() > 0.15 else None,
                   credit, licence, largeur, hauteur,
                   R.randrange(180_000, 4_800_000),
                   R.choice(photographes) if R.random() > 0.25 else None, importe])
insert("media", ["id","nom_fichier","type","legende","texte_alternatif","credit","licence",
                 "largeur","hauteur","poids_octets","auteur_id","importe_le"], medias)

# --------------------------------------------------------------------- articles
SUJETS = {
"Politique": ["la réforme des retraites","le budget 2027","la loi sur le logement","le projet de loi immigration",
  "la réforme de l'audiovisuel public","la fusion des intercommunalités","la loi de programmation militaire",
  "le statut de l'élu local","la réforme du mode de scrutin","la décentralisation de la santé"],
"Société": ["la réforme du lycée professionnel","l'accueil des mineurs isolés","la pénurie d'enseignants",
  "la réforme de l'aide juridictionnelle","le plan contre les violences conjugales","la fermeture des petites gares",
  "l'accès aux services publics en zone rurale","le recrutement des surveillants pénitentiaires",
  "la réforme du permis de conduire","la lutte contre l'habitat indigne"],
"International": ["l'élargissement de l'Union européenne","la crise de l'énergie en Allemagne",
  "les négociations climatiques de la COP","le retrait des troupes au Sahel","la réforme agricole espagnole",
  "les élections législatives italiennes","le traité commercial avec le Mercosur","la frontière gréco-turque",
  "la reconstruction de l'Ukraine","la politique monétaire de la Banque centrale européenne"],
"Entreprises": ["le plan social chez un équipementier automobile","la fusion de deux groupes de distribution",
  "l'introduction en Bourse d'une biotech lyonnaise","la reprise d'une usine de papier par ses salariés",
  "la stratégie d'un géant du luxe en Asie","la restructuration d'un opérateur télécom",
  "l'ouverture d'une gigafactory dans le Nord","la fermeture d'un site de raffinage",
  "le rachat d'une chaîne de librairies","la relocalisation d'une production de médicaments"],
"Emploi": ["la réforme de l'assurance chômage","la pénurie de soudeurs","les salaires dans l'hôtellerie",
  "le télétravail dans les grandes entreprises","l'apprentissage dans le bâtiment",
  "la semaine de quatre jours","l'emploi des seniors","la reconversion des salariés de l'automobile",
  "l'index de l'égalité professionnelle","le compte personnel de formation"],
"Cinéma": ["la sélection du Festival de Cannes","le financement du cinéma d'auteur",
  "la fréquentation des salles en région","la production d'un film d'animation français",
  "la place des femmes derrière la caméra","les tournages délocalisés en Europe de l'Est",
  "le sort des salles indépendantes","l'accord entre les plateformes et le CNC",
  "la restauration des films muets","le documentaire en salle"],
"Musique": ["la rémunération du streaming","le retour des festivals de taille moyenne",
  "la scène rap marseillaise","le financement des salles de concert","la formation des musiciens classiques",
  "les tournées et leur empreinte carbone","la billetterie et la revente","le vinyle et sa fabrication",
  "la musique dans les écoles","les quotas de chanson francophone"],
"Livres": ["la rentrée littéraire","le prix du papier","les librairies indépendantes",
  "la traduction littéraire","l'édition jeunesse","les droits d'auteur à l'ère numérique",
  "le livre audio","les bibliothèques municipales","la concentration dans l'édition","le roman policier français"],
"Football": ["les droits télé de la Ligue 1","la formation des jeunes joueurs","l'arbitrage vidéo",
  "le mercato d'hiver","les finances d'un club de deuxième division","le football féminin professionnel",
  "la rénovation d'un stade municipal","le calendrier international","le supportérisme et les interdictions de stade",
  "la lutte contre les paris truqués"],
"Rugby": ["le salary cap du Top 14","les commotions cérébrales","la formation dans les centres régionaux",
  "l'élargissement de la Coupe du monde","les finances de la fédération","le rugby féminin",
  "le calendrier des joueurs internationaux","l'arbitrage des plaquages hauts",
  "la reconversion des joueurs","l'implantation du rugby en Afrique"],
"Environnement": ["la sécheresse dans le Sud-Ouest","le plan de sobriété énergétique","la rénovation thermique",
  "la protection des zones humides","les pesticides dans l'eau potable","le parc éolien en mer",
  "le recyclage des batteries","la forêt landaise après les incendies","la pêche en Atlantique",
  "l'artificialisation des sols"],
"Santé": ["les déserts médicaux","le budget de l'hôpital public","la pénurie de médicaments",
  "la santé mentale des adolescents","la vaccination contre la grippe","les urgences pédiatriques",
  "la recherche sur Alzheimer","les dépassements d'honoraires","la prévention du cancer du côlon",
  "les soins palliatifs"],
"Numérique": ["la régulation des plateformes","le pistage publicitaire","l'intelligence artificielle générative",
  "la souveraineté des données de santé","la fibre optique en zone rurale","les câbles sous-marins",
  "la cybersécurité des hôpitaux","l'empreinte carbone des centres de données",
  "la reconnaissance faciale dans l'espace public","le logiciel libre dans l'administration"],
}
ANGLES = ["le compte n'y est pas","une bataille de chiffres","les coulisses d'un renoncement",
"ce que disent les documents que nous avons consultés","un calendrier intenable","des promesses à l'épreuve du terrain",
"la facture pour les collectivités","un équilibre fragile","trois questions avant la décision",
"pourquoi rien n'avance"]
TEMPLATES = [
 "{Sujet} : {angle}",
 "Ce que change {sujet} pour le quotidien",
 "Enquête sur {sujet}",
 "{Sujet}, un an après",
 "Trois questions sur {sujet}",
 "Pourquoi {sujet} divise",
 "{Sujet} : notre décryptage en cinq points",
 "Reportage à {lieu} : ce que dit le terrain",
 "{Sujet} : le rapport que nous avons lu",
 "{Sujet} face aux chiffres",
 "Comment {sujet} a changé de visage",
]
PARAGRAPHES = [
 "Le dossier n'est pas neuf : il revient dans le débat public depuis {annee}, sans qu'une décision claire ait jamais été tranchée.",
 "Dans le détail, {chiffre} % des structures concernées déclarent avoir déjà engagé les changements demandés, selon les données que nous avons obtenues.",
 "« Nous avons besoin de visibilité, pas d'annonces », résume {personne}, {fonction} à {lieu}.",
 "Les services de l'État avancent un coût de {millions} millions d'euros sur trois ans ; les collectivités, elles, en annoncent le double.",
 "Sur le terrain, la mise en œuvre bute sur un obstacle prosaïque : le manque de personnel formé, que personne ne conteste plus.",
 "Un rapport remis au printemps pointait déjà ce risque, sans être suivi d'effet.",
 "À {lieu}, l'expérimentation menée depuis dix-huit mois donne des résultats contrastés, que les deux camps citent à l'appui de leur thèse.",
 "Les organisations professionnelles demandent un délai supplémentaire ; l'administration répond que le calendrier ne bougera pas.",
 "Reste une question, rarement posée publiquement : qui paiera la différence une fois les aides éteintes ?",
 "Interrogé, le cabinet concerné n'a pas donné suite à nos sollicitations.",
 "Les chiffres publiés cet été confirment la tendance : {chiffre} % en un an, un mouvement continu depuis {annee}.",
 "« On nous demande de faire mieux avec moins, et cela fait dix ans que ça dure », souffle {personne}, {fonction}.",
 "Une décision est attendue avant la fin de l'année ; d'ici là, chacun affine ses arguments.",
 "Dans les couloirs, on reconnaît que l'arbitrage a été rendu sans que les services techniques aient été consultés.",
 "Les syndicats ont quitté la dernière réunion de concertation, jugeant les garanties insuffisantes.",
 "L'étude d'impact, que nous avons pu consulter, retient une hypothèse de croissance que peu d'économistes défendent aujourd'hui.",
 "Deux régions ont choisi d'avancer seules, quitte à assumer un surcoût temporaire.",
 "« Le texte est bon sur le papier ; c'est son application qui pose problème », tempère {personne}, {fonction}.",
 "En Allemagne comme en Espagne, des dispositifs comparables ont été abandonnés au bout de trois ans.",
 "Le calendrier, lui, n'a pas bougé : l'entrée en vigueur reste fixée au 1er janvier {annee_futur}.",
 "Les premières évaluations indépendantes ne sont pas attendues avant deux ans.",
 "Le budget consacré à la mesure a été relevé de {chiffre} % en cours d'exercice, sans débat public.",
 "Les élus de la majorité comme de l'opposition reconnaissent, en privé, que le dispositif sera revu.",
]
# Each job title in both forms: the quoted person's first name decides which one.
FONCTIONS = [("directeur d'établissement","directrice d'établissement"),
("responsable syndical","responsable syndicale"),("élu local","élue locale"),
("économiste","économiste"),("chercheur au CNRS","chercheuse au CNRS"),
("chef de service","cheffe de service"),("cadre associatif","cadre associative"),
("responsable d'exploitation","responsable d'exploitation"),
("avocat spécialisé","avocate spécialisée"),("adjoint au maire","adjointe au maire"),
("infirmier en poste depuis vingt ans","infirmière en poste depuis vingt ans"),
("gérant d'une PME du secteur","gérante d'une PME du secteur")]
def personne_et_fonction():
    femme = R.random() < 0.5
    prenom = R.choice(PRENOMS_F if femme else PRENOMS_M)
    return "%s %s" % (prenom, R.choice(NOMS)), R.choice(FONCTIONS)[1 if femme else 0]

def de(sujet):
    """« le budget » -> « du budget » : the de + le/les contraction."""
    if sujet.startswith("le "): return "du " + sujet[3:]
    if sujet.startswith("les "): return "des " + sujet[4:]
    return "de " + sujet
CHAPOS = [
 "{Sujet} revient au premier plan. Nous avons repris les documents, les chiffres et les témoignages pour comprendre ce qui se joue vraiment.",
 "Derrière les annonces, {sujet} soulève des questions de moyens que personne ne tranche. Notre enquête.",
 "Un an de reportages, quarante entretiens et des données inédites : voici ce que nous avons appris sur {sujet}.",
 "Les positions se durcissent autour {de_sujet}. État des lieux, arguments et zones d'ombre.",
 "Ce que l'on sait, ce que l'on ignore et ce qui sera décidé dans les prochaines semaines sur {sujet}.",
 "Trois mois d'enquête sur les effets {de_sujet}, loin des communiqués et des éléments de langage.",
]
STATUTS = ["publie"]*74 + ["archive"]*10 + ["brouillon"]*7 + ["relecture"]*5 + ["programme"]*4

articles, seen_article_slugs, combos = [], set(), {}
ART_N = 420
articles_publies = []
for i in range(1, ART_N + 1):
    cat_nom = R.choice(list(SUJETS.keys()))
    used = combos.setdefault(cat_nom, set())
    for _ in range(60):
        sujet = R.choice(SUJETS[cat_nom]); tpl = R.choice(TEMPLATES)
        if (sujet, tpl) not in used: break
    used.add((sujet, tpl))
    lieu = R.choice(VILLES)
    titre = tpl.format(Sujet=cap(sujet), sujet=sujet, de_sujet=de(sujet),
                       angle=R.choice(ANGLES), lieu=lieu)[:120]
    statut = R.choice(STATUTS)
    service = SERVICES[cat_nom]
    auteur_id = R.choice(auteurs_par_service.get(service) or [a[0] for a in auteurs])
    if statut in ("publie", "archive"):
        publie_le = dt_between(datetime(2024, 1, 2), NOW - timedelta(days=1))
    elif statut == "programme":
        publie_le = NOW + timedelta(days=R.randrange(1, 12), hours=R.randrange(0, 12))
    else:
        publie_le = None
    corps = R.sample(PARAGRAPHES, R.randrange(7, min(13, len(PARAGRAPHES) + 1)))
    texte = []
    texte.append("%s occupe le débat depuis plusieurs semaines. %s" % (
        cap(sujet), R.choice(["Nous avons voulu savoir ce que les chiffres disent réellement.",
        "Sur le terrain, la réalité est plus nuancée que les communiqués.",
        "Le sujet est technique ; ses effets, très concrets."])))
    for p in corps:
        nom_cite, fonction = personne_et_fonction()
        texte.append(p.format(annee=R.randrange(2016, 2025), annee_futur=R.randrange(2027, 2030),
                              chiffre=R.randrange(3, 87), millions=R.randrange(12, 900),
                              personne=nom_cite, fonction=fonction, lieu=R.choice(VILLES)))
    contenu = "\n\n".join(texte)
    mots = len(contenu.split())
    acces = R.choices(["libre","inscrit","abonne"], [52, 14, 34])[0]
    modifie = (publie_le or NOW) + timedelta(hours=R.randrange(1, 800))
    if modifie > NOW: modifie = NOW
    vues = 0 if statut not in ("publie","archive") else int(abs(R.gauss(4200, 5200))) + R.randrange(30, 900)
    meta = {"og_titre": titre, "og_type": "article", "robots": "index,follow" if statut == "publie" else "noindex",
            "mots_cles": [slugify(sujet)], "amp": bool(R.random() > 0.7)}
    articles.append([i, titre, slugify(titre, seen_article_slugs),
        R.choice(CHAPOS).format(Sujet=cap(sujet), sujet=sujet, de_sujet=de(sujet)) if R.random() > 0.08 else None,
        contenu, statut, acces, vues, publie_le, modifie, auteur_id, categories[cat_nom],
        R.choice([d[0] for d in dossiers]) if R.random() < 0.28 else None,
        R.randrange(1, 251) if R.random() > 0.15 else None,
        1 if (statut == "publie" and R.random() < 0.06) else 0,
        max(1, round(mots / 220)), mots,
        round(R.uniform(2.4, 4.9), 2) if R.random() > 0.45 else None,
        json.dumps(meta, ensure_ascii=False)])
    if statut in ("publie", "archive"):
        articles_publies.append((i, publie_le, acces))
insert("article", ["id","titre","slug","chapo","contenu","statut","acces","vues","publie_le","modifie_le",
                   "auteur_id","categorie_id","dossier_id","media_une_id","en_une","temps_lecture",
                   "nombre_mots","note_moyenne","metadonnees"], articles, chunk=50)

# ---------------------------------------------------------------- tags, taggings
TAGS = """retraites|budget|logement|immigration|éducation|justice|santé publique|hôpital|climat|sécheresse|énergie|nucléaire|éolien|transports|SNCF|automobile|industrie|emploi|chômage|salaires|télétravail|inflation|pouvoir d'achat|impôts|collectivités|municipales|élections|Parlement|Sénat|Union européenne|Allemagne|Italie|Espagne|Ukraine|Sahel|Chine|États-Unis|commerce|agriculture|pêche|biodiversité|pesticides|eau|recyclage|numérique|données personnelles|intelligence artificielle|cybersécurité|fibre|plateformes|cinéma|festival de Cannes|musique|streaming|festivals|édition|livres|bibliothèques|football|Ligue 1|rugby|Top 14|dopage|arbitrage|jeux olympiques|médias|presse|enquête|reportage|portrait""".split("|")
tags, seen_tag_slugs = [], set()
for i, nom in enumerate(TAGS, start=1):
    tags.append([i, nom, slugify(nom, seen_tag_slugs), 0])
# article_tag
at_rows, usages = [], {}
for a in articles:
    aid, publie_le = a[0], a[8]
    pose_base = publie_le or a[9]
    for tid in R.sample(range(1, len(TAGS) + 1), R.randrange(1, 6)):
        at_rows.append([aid, tid, pose_base - timedelta(minutes=R.randrange(5, 4000))])
        usages[tid] = usages.get(tid, 0) + 1
for t in tags: t[3] = usages.get(t[0], 0)
insert("tag", ["id","nom","slug","usages"], tags)
insert("article_tag", ["article_id","tag_id","pose_le"], at_rows)

# --------------------------------------------------------------- article_media
LEGENDES = ["Vue générale, le jour de notre reportage.","Détail de l'installation mise en cause.",
"L'un des sites visités par notre journaliste.","Archives, avant les travaux.",
"La réunion publique du mois dernier.","Sur place, quelques minutes avant l'annonce."]
am_rows = []
for a in articles:
    if R.random() < 0.55: continue
    for pos, mid in enumerate(R.sample(range(1, 251), R.randrange(1, 4)), start=1):
        am_rows.append([a[0], mid, pos, R.choice(LEGENDES) if R.random() > 0.4 else None])
insert("article_media", ["article_id","media_id","position","legende_specifique"], am_rows)

# ------------------------------------------------------------ article revisions
RESUMES = ["Relecture orthographique","Ajout du chapô","Correction d'un chiffre erroné",
"Ajout de la réaction du ministère","Titre raccourci pour la une","Mise à jour après la conférence de presse",
"Précision apportée sur la méthodologie","Suppression d'un paragraphe redondant",
"Ajout d'un lien vers le rapport cité","Correction du nom d'une personne citée"]
rev_rows, rev_id = [], 0
for a in articles:
    n = R.choices([0, 1, 2, 3, 4], [22, 30, 25, 15, 8])[0]
    # A revision is written before publication, and never after now.
    base = min(a[8] or a[9], NOW)
    for numero in range(1, n + 1):
        rev_id += 1
        moment = base - timedelta(hours=R.randrange(1, 240)) + timedelta(hours=numero)
        rev_rows.append([rev_id, a[0], numero,
                         a[10] if R.random() > 0.3 else R.choice(auteurs)[0],
                         a[1], a[4][:R.randrange(200, len(a[4]) + 1)] if R.random() > 0.2 else None,
                         R.choice(RESUMES), moment])
insert("article_revision", ["id","article_id","numero","auteur_id","titre","contenu",
                            "resume_modification","enregistre_le"], rev_rows, chunk=60)

# ------------------------------------------------------------------------ users
FOURNISSEURS = ["gmail.com","free.fr","orange.fr","outlook.fr","laposte.net","yahoo.fr","protonmail.com","wanadoo.fr"]
utilisateurs, mails_vus, u_meta = [], set(), {}
for i in range(1, 601):
    femme = R.random() < 0.5
    prenom = R.choice(PRENOMS_F if femme else PRENOMS_M)
    nom = R.choice(NOMS)
    base = slugify(prenom + "." + nom)
    email = "%s@%s" % (base, R.choice(FOURNISSEURS))
    n = 2
    while email in mails_vus:
        email = "%s%d@%s" % (base, n, R.choice(FOURNISSEURS)); n += 1
    mails_vus.add(email)
    inscrit = dt_between(datetime(2023, 6, 1), NOW - timedelta(days=2))
    statut = R.choices(["actif","inactif","suspendu","supprime"], [82, 13, 3, 2])[0]
    derniere = None if statut in ("supprime",) or R.random() < 0.08 else dt_between(inscrit, NOW)
    prefs = {"rubriques": R.sample([c[2] for c in cat_rows if c[1] is not None], R.randrange(1, 5)),
             "notifications": {"alertes": bool(R.random() > 0.5), "hebdo": bool(R.random() > 0.3)},
             "theme": R.choice(["clair","sombre","auto"])}
    utilisateurs.append([i, email, prenom, nom,
        (slugify(prenom) + str(R.randrange(10, 99))) if R.random() > 0.35 else None,
        R.choice(VILLES) if R.random() > 0.12 else None,
        "%05d" % R.randrange(1000, 98000) if R.random() > 0.2 else None,
        R.choices(["FR","BE","CH","CA","LU","SN"], [88, 4, 3, 3, 1, 1])[0],
        inscrit, derniere, R.random() > 0.11, R.random() > 0.6,
        json.dumps(prefs, ensure_ascii=False) if R.random() > 0.1 else None, statut])
    u_meta[i] = (inscrit, statut)
insert("utilisateur", ["id","email","prenom","nom","pseudo","ville","code_postal","pays","inscrit_le",
                       "derniere_connexion","email_verifie","accepte_prospection","preferences","statut"],
       utilisateurs, chunk=100)

# ------------------------------------------------------ plans and promo codes
FORMULES = [
 (1, "Découverte", "decouverte", "mensuel", 1.00, 0, 0, 1, "Le premier mois à 1 €, puis 9,90 € par mois, sans engagement.", 1),
 (2, "Numérique mensuel", "num-mensuel", "mensuel", 9.90, 7, 1, 1, "Tous les articles, la newsletter du matin, sans engagement.", 1),
 (3, "Numérique annuel", "num-annuel", "annuel", 99.00, 7, 1, 1, "Deux mois offerts par rapport au mensuel.", 1),
 (4, "Intégral", "integral", "mensuel", 19.90, 0, 1, 2, "Le numérique, les hors-séries et l'accès aux archives depuis 1998.", 1),
 (5, "Étudiant", "etudiant", "mensuel", 4.90, 30, 1, 1, "Sur justificatif de scolarité, renouvelable chaque année.", 1),
 (6, "Duo", "duo", "annuel", 149.00, 0, 1, 2, "Deux comptes sur la même adresse. Offre retirée de la vente en 2025.", 0),
]
insert("formule_abonnement", ["id","nom","code","periodicite","prix","jours_essai","acces_archives",
                              "nombre_comptes","description","actif"], [list(f) for f in FORMULES])
prix_formule = {f[0]: f[4] for f in FORMULES}
PROMOS = [
 ("RENTREE2024", "Offre de rentrée, deux mois à moitié prix", 50, None, "2024-09-01", "2024-10-15", 2000),
 ("NOEL2024", "Abonnement offert pour Noël", 30, None, "2024-12-01", "2024-12-31", 1500),
 ("ETUDIANT25", "Remise supplémentaire sur l'offre étudiante", 25, None, "2025-01-10", None, None),
 ("PRESSE10", "Tarif confrères", None, 10.00, "2024-03-01", None, 300),
 ("PARRAIN20", "Parrainage : 20 % pour le filleul", 20, None, "2024-01-01", None, None),
 ("SALONLIVRE", "Opération Salon du livre", 40, None, "2025-03-12", "2025-03-25", 500),
 ("RETOUR15", "Offre de reconquête après résiliation", 15, None, "2025-06-01", "2026-06-01", 800),
 ("BLACKFRIDAY", "Vendredi noir : 60 % pendant trois mois", 60, None, "2024-11-25", "2024-12-02", 3000),
 ("JO2024", "Opération Jeux olympiques", 20, None, "2024-07-20", "2024-08-15", 1000),
 ("LECTEUR5", "Cinq euros de remise immédiate", None, 5.00, "2025-09-01", "2025-12-31", 1200),
 ("PRINTEMPS26", "Offre de printemps", 35, None, "2026-03-20", "2026-05-31", 1500),
 ("ANNIV", "Vingt ans du journal", 45, None, "2026-01-15", "2026-02-15", 2500),
 ("COLLECTIF", "Tarif collectivités et bibliothèques", None, 25.00, "2024-02-01", None, None),
 ("TESTINTERNE", "Code de test, ne pas diffuser", 100, None, "2024-01-01", None, 50),
 ("MOBILITE", "Offre nouveaux arrivants", 10, None, "2025-10-01", "2026-10-01", 600),
]
promos = []
for i, (code, lib, pct, montant, du, au, maxi) in enumerate(PROMOS, start=1):
    promos.append([i, code, lib, pct, montant, date.fromisoformat(du),
                   date.fromisoformat(au) if au else None, maxi, 0])
promo_index = {p[1]: p[0] for p in promos}

# ------------------------------------------------- payment methods, subscriptions
TITULAIRE = lambda u: "%s %s" % (u[2].upper(), u[3].upper())
mp_rows, mp_id, mp_par_utilisateur = [], 0, {}
abonnes_ids = R.sample(range(1, 601), 430)
for uid in sorted(abonnes_ids):
    u = utilisateurs[uid - 1]
    nb = R.choices([1, 2], [88, 12])[0]
    for k in range(nb):
        mp_id += 1
        typ = R.choices(["carte","prelevement","paypal"], [78, 15, 7])[0]
        ajoute = dt_between(u_meta[uid][0], NOW)
        mp_rows.append([mp_id, uid, typ,
            R.choices(["visa","mastercard","cb","amex"], [45, 35, 15, 5])[0] if typ == "carte" else None,
            "%04d" % R.randrange(0, 10000) if typ == "carte" else None,
            TITULAIRE(u) if R.random() > 0.1 else None,
            date(R.randrange(2026, 2031), R.randrange(1, 13), 1) if typ == "carte" else None,
            ("FR76 **** **** **** **** %04d" % R.randrange(0, 10000)) if typ == "prelevement" else None,
            1 if k == 0 else 0, ajoute])
        mp_par_utilisateur.setdefault(uid, []).append(mp_id)
insert("moyen_paiement", ["id","utilisateur_id","type","reseau","quatre_derniers","titulaire",
                          "expire_le","iban_masque","par_defaut","ajoute_le"], mp_rows, chunk=120)

MOTIFS_RESIL = ["Trop cher","Ne lit plus assez souvent","Passage à une offre papier","Doublon avec un abonnement pro",
"Insatisfait de la couverture politique","Déménagement à l'étranger","Difficultés financières",
"Problème technique non résolu", None]
abonnements, ab_id = [], 0
ab_rows_meta = []
for uid in sorted(abonnes_ids):
    inscrit = u_meta[uid][0]
    ab_id += 1
    formule_id = R.choices([1, 2, 3, 4, 5, 6], [8, 38, 22, 14, 13, 5])[0]
    debute = (inscrit + timedelta(days=R.randrange(0, 200))).date()
    if debute > NOW.date(): debute = NOW.date() - timedelta(days=R.randrange(1, 40))
    if formule_id == 6 and debute > date(2025, 6, 30):
        formule_id = 2  # the Duo offer left the catalogue in mid-2025
    statut = R.choices(["actif","resilie","impaye","essai","suspendu"], [58, 28, 6, 5, 3])[0]
    # A trial only makes sense on a subscription that has just started.
    if statut == "essai" and (NOW.date() - debute).days > 30:
        statut = "actif"
    promo_id = R.choice([p[0] for p in promos]) if R.random() < 0.3 else None
    # "Découverte" is an entry price: the recurring amount is the monthly digital one.
    prix = prix_formule[2] if formule_id == 1 else prix_formule[formule_id]
    if promo_id:
        p = promos[promo_id - 1]
        prix = round(prix * (1 - p[3] / 100), 2) if p[3] else max(1.0, round(prix - float(p[4]), 2))
        p[8] += 1
    mensuel = FORMULES[formule_id - 1][3] == "mensuel"
    pas = 30 if mensuel else 365
    resilie = None
    if statut == "resilie":
        resilie = debute + timedelta(days=R.randrange(pas, pas * 12))
        if resilie > NOW.date():
            resilie = max(debute, NOW.date() - timedelta(days=R.randrange(1, 60)))
    fin_periodes = resilie or NOW.date()
    prochaine = None
    if statut in ("actif", "essai", "impaye"):
        # Next due date, on the cycle started at debute_le.
        cycles = (NOW.date() - debute).days // pas + 1
        prochaine = debute + timedelta(days=pas * cycles)
    moyen = R.choice(mp_par_utilisateur[uid])
    abonnements.append([ab_id, uid, formule_id, promo_id, moyen, statut, debute, prochaine, resilie,
        R.choice(MOTIFS_RESIL) if statut == "resilie" else None,
        1 if statut in ("actif", "essai") else (1 if R.random() < 0.2 else 0), prix])
    ab_rows_meta.append((ab_id, uid, debute, fin_periodes, pas, prix, statut, moyen, formule_id))
insert("code_promo", ["id","code","libelle","reduction_pourcent","reduction_montant","valide_du",
                      "valide_au","utilisations_max","utilisations"], promos)
insert("abonnement", ["id","utilisateur_id","formule_id","code_promo_id","moyen_paiement_id","statut",
                      "debute_le","prochaine_echeance","resilie_le","motif_resiliation",
                      "renouvellement_auto","prix_paye"], abonnements, chunk=120)

# --------------------------------------------------------- payments and refunds
ECHECS = ["Provision insuffisante","Carte expirée","Opposition bancaire","Authentification 3-D Secure abandonnée",
"Plafond de paiement atteint"]
paiements, pid, remb_rows, rid = [], 0, [], 0
for (ab, uid, debute, fin, pas, prix, statut_ab, moyen, formule_id) in ab_rows_meta:
    d = debute
    numero = 0
    while d <= fin and numero < 40:
        numero += 1
        pid += 1
        montant = 1.00 if (formule_id == 1 and numero == 1) else float(prix)
        st = R.choices(["reussi","refuse","rembourse","en_attente"], [92, 4, 3, 1])[0]
        if statut_ab == "impaye" and d == fin: st = "refuse"
        paye = datetime.combine(d, time(R.randrange(0, 24), R.randrange(0, 60), R.randrange(0, 60)))
        if paye > NOW: paye = NOW - timedelta(minutes=R.randrange(5, 300))
        fin_periode = d + timedelta(days=pas - 1)
        paiements.append([pid, ab, moyen, "PAY-%s-%06d" % (paye.strftime("%Y%m"), pid),
            "F%04d%02d-%05d" % (paye.year, paye.month, pid) if st in ("reussi", "rembourse") else None,
            round(montant, 2), round(montant - montant / 1.021, 2), "EUR", st,
            R.choice(ECHECS) if st == "refuse" else None, paye, d, fin_periode])
        if st == "rembourse":
            rid += 1
            remb_rows.append([rid, pid, round(montant, 2),
                R.choices(["doublon","erreur_facturation","geste_commercial","retractation"], [20, 30, 35, 15])[0],
                R.choice(["Demande du lecteur par courriel.","Suite à une réclamation au service abonnements.",
                          "Double prélèvement constaté par la banque.", None]),
                paye + timedelta(days=R.randrange(1, 30)),
                R.choice(["service.abonnements","comptabilite","support.n2"])])
        d = d + timedelta(days=pas)
insert("paiement", ["id","abonnement_id","moyen_paiement_id","reference","numero_facture","montant","tva",
                    "devise","statut","motif_echec","paye_le","periode_debut","periode_fin"], paiements, chunk=200)
insert("remboursement", ["id","paiement_id","montant","motif","commentaire","rembourse_le","traite_par"], remb_rows)

# --------------------------------------------------------------------- comments
COMMENTAIRES = [
 "Merci pour cet article, le sujet méritait vraiment ce travail de terrain.",
 "Article intéressant, mais j'aurais aimé voir les chiffres de 2019 pour comparer.",
 "Vous citez le rapport sans donner le lien, dommage.",
 "Je travaille dans le secteur et je confirme ce que décrit le reportage.",
 "Le titre est un peu racoleur par rapport au contenu, qui est nuancé.",
 "Enfin un papier qui ne se contente pas de reprendre le communiqué officiel.",
 "Il manque le point de vue des usagers, on n'entend que les institutions.",
 "Excellente enquête. C'est pour ça que je suis abonné depuis trois ans. 👏",
 "Vous oubliez de préciser que la mesure a déjà été testée ailleurs, avec les résultats que l'on sait.",
 "Un peu court sur la partie financement, mais bonne synthèse par ailleurs.",
 "Je ne suis pas d'accord avec la conclusion, les données disent l'inverse sur le long terme.",
 "Merci d'avoir donné la parole aux agents de terrain, ça change.",
 "Est-ce qu'un suivi est prévu dans six mois ? Ce serait utile.",
 "Article à faire lire à tous ceux qui pensent que le sujet est simple.",
 "La comparaison européenne est bancale : les systèmes ne sont pas comparables.",
 "Bravo pour l'infographie, très claire.",
 "On sent le travail de documentation derrière, merci.",
 "Toujours les mêmes arguments, rien de neuf dans ce papier.",
 "Petite coquille dans le quatrième paragraphe : « des » au lieu de « les ».",
 "J'aurais aimé plus de contexte historique, le sujet ne date pas d'hier.",
]
REPONSES = [
 "Tout à fait d'accord avec vous.",
 "Le lien vers le rapport est dans l'encadré en bas de l'article.",
 "Je ne partage pas votre lecture : l'article précise bien la méthodologie.",
 "Même expérience de mon côté, dans une autre région.",
 "Vous confondez deux dispositifs différents.",
 "Merci pour la précision, je n'avais pas vu cet aspect.",
]
utilisateurs_actifs = [u[0] for u in utilisateurs if u[13] in ("actif", "inactif")]
commentaires, cid2 = [], 0
racines_par_article = {}
for (aid, publie_le, _acces) in articles_publies:
    n = R.choices([0, 1, 2, 3, 4, 5, 8], [30, 20, 16, 12, 9, 8, 5])[0]
    for _ in range(n):
        cid2 += 1
        uid = R.choice(utilisateurs_actifs)
        poste = dt_between(publie_le, min(publie_le + timedelta(days=20), NOW))
        statut = R.choices(["publie","en_attente","masque","supprime"], [86, 7, 5, 2])[0]
        modere = (poste + timedelta(hours=R.randrange(1, 60))) if statut in ("masque","supprime") else None
        commentaires.append([cid2, aid, uid if R.random() > 0.03 else None, None,
            R.choice(COMMENTAIRES), statut, R.randrange(0, 180), R.randrange(0, 25), poste,
            modere, R.choice(moderateurs) if modere else None])
        racines_par_article.setdefault(aid, []).append((cid2, poste))
# replies
for aid, racines in list(racines_par_article.items()):
    for (parent_id, poste) in racines:
        if R.random() < 0.22:
            cid2 += 1
            rep = dt_between(poste, min(poste + timedelta(days=5), NOW))
            commentaires.append([cid2, aid, R.choice(utilisateurs_actifs), parent_id,
                R.choice(REPONSES), R.choices(["publie","en_attente","masque"], [90, 6, 4])[0],
                R.randrange(0, 60), R.randrange(0, 10), rep, None, None])
insert("commentaire", ["id","article_id","utilisateur_id","parent_id","contenu","statut","votes_positifs",
                       "votes_negatifs","poste_le","modere_le","modere_par"], commentaires, chunk=150)

sign_rows = []
for i, c in enumerate(R.sample(commentaires, 95), start=1):
    signale = c[8] + timedelta(hours=R.randrange(1, 72))
    traite = R.random() > 0.35
    sign_rows.append([i, c[0], R.choice(utilisateurs_actifs) if R.random() > 0.1 else None,
        R.choices(["injure","hors_sujet","spam","desinformation","harcelement"], [25, 30, 20, 20, 5])[0],
        R.choice(["Propos déplacés envers un autre lecteur.","Hors sujet par rapport à l'article.",
                  "Lien commercial répété.","Affirmation contredite par l'article lui-même.", None]),
        signale, traite,
        R.choices(["conserve","masque","supprime"], [60, 28, 12])[0] if traite else None])
insert("signalement_commentaire", ["id","commentaire_id","utilisateur_id","motif","precision_texte",
                                   "signale_le","traite","decision"], sign_rows)

# -------------------------------------------------------------------- bookmarks
abonnes_actifs = set(a[1] for a in abonnements if a[5] in ("actif", "essai"))
fav, vus = [], set()
for _ in range(1000):
    uid = R.choice(utilisateurs_actifs)
    aid, publie_le, _ = R.choice(articles_publies)
    if (uid, aid) in vus: continue
    vus.add((uid, aid))
    fav.append([uid, aid, dt_between(publie_le, NOW), R.random() > 0.4])
insert("favori", ["utilisateur_id","article_id","ajoute_le","lu"], fav, chunk=200)

# ------------------------------------------------------------------- page reads
lectures = []
for i in range(1, 3201):
    aid, publie_le, acces = R.choice(articles_publies)
    connecte = R.random() < 0.55
    uid = R.choice(utilisateurs_actifs) if connecte else None
    abonne = uid in abonnes_actifs if uid else False
    duree = max(5, int(abs(R.gauss(150, 130))))
    pct = min(100, max(2, int(duree / 3.2) + R.randrange(-10, 15)))
    paywall = acces == "abonne" and not abonne
    if paywall:
        duree = min(duree, 60); pct = min(pct, 22)
    lectures.append([i, aid, uid, dt_between(publie_le, NOW), duree, pct,
        R.choices(["accueil","rubrique","recherche","newsletter","reseaux","moteur","notification"],
                  [30, 14, 8, 12, 18, 14, 4])[0],
        R.choices(["mobile","ordinateur","tablette"], [58, 34, 8])[0], paywall])
insert("lecture", ["id","article_id","utilisateur_id","lu_le","duree_secondes","pourcentage_lu",
                   "source","appareil","paywall_affiche"], lectures, chunk=250)

# ------------------------------------------------------------------ newsletters
NEWSLETTERS = [
 (1, "Le Fil du matin", "La sélection de la rédaction, tous les matins à 7 h.", "quotidienne", "07:00:00", 0),
 (2, "L'hebdo culture", "Nos critiques cinéma, musique et livres du samedi.", "hebdomadaire", "10:00:00", 0),
 (3, "Économie & emploi", "Chaque mercredi, ce qu'il faut retenir côté entreprises.", "hebdomadaire", "08:30:00", 0),
 (4, "Le club des abonnés", "Les coulisses de la rédaction, réservées aux abonnés.", "mensuelle", "18:00:00", 1),
 (5, "Alerte info", "Les informations majeures, dès qu'elles tombent.", "quotidienne", "12:00:00", 0),
]
insert("newsletter", ["id","nom","slug","description","periodicite","heure_envoi","reservee_abonnes"],
       [[n[0], n[1], slugify(n[1]), n[2], n[3], n[4], n[5]] for n in NEWSLETTERS])
insc, vus2 = [], set()
for _ in range(1100):
    uid = R.choice([u[0] for u in utilisateurs])
    nid = R.choices([1, 2, 3, 4, 5], [35, 18, 16, 14, 17])[0]
    if (uid, nid) in vus2: continue
    if nid == 4 and uid not in abonnes_actifs: continue
    vus2.add((uid, nid))
    ins = dt_between(u_meta[uid][0], NOW)
    des = dt_between(ins, NOW) if R.random() < 0.18 else None
    insc.append([uid, nid, ins, des,
                 R.choices(["inscription","popup","pied_de_page","offre"], [50, 20, 20, 10])[0]])
insert("inscription_newsletter", ["utilisateur_id","newsletter_id","inscrit_le","desinscrit_le","origine"],
       insc, chunk=200)

envois, eid = [], 0
articles_une = [a for a in articles_publies]
for nid, nom, _desc, freq, _h, _res in [(n[0], n[1], n[2], n[3], n[4], n[5]) for n in NEWSLETTERS]:
    nb = {"quotidienne": 45, "hebdomadaire": 30, "mensuelle": 18}[freq]
    for k in range(nb):
        eid += 1
        aid, publie_le, _ = R.choice(articles_une)
        envoye = publie_le + timedelta(hours=R.randrange(2, 30))
        if envoye > NOW: envoye = NOW - timedelta(days=R.randrange(1, 300))
        dest = R.randrange(4200, 38000)
        ouv = int(dest * R.uniform(0.28, 0.61))
        envois.append([eid, nid, ("%s — %s" % (nom, articles[aid - 1][1]))[:160], aid, envoye,
                       dest, ouv, int(ouv * R.uniform(0.06, 0.28)), R.randrange(0, 90)])
insert("envoi_newsletter", ["id","newsletter_id","objet","article_une_id","envoye_le","destinataires",
                            "ouvertures","clics","desinscriptions"], envois, chunk=100)

# ----------------------------------------------------------------------- views
w("""CREATE OR REPLACE VIEW vue_article_publie AS
SELECT a.id, a.titre, a.slug, a.publie_le, a.acces, a.vues,
       CONCAT(au.prenom, ' ', au.nom) AS auteur, c.nom AS rubrique,
       (SELECT COUNT(*) FROM commentaire cm WHERE cm.article_id = a.id AND cm.statut = 'publie') AS commentaires
FROM article a
LEFT JOIN auteur au ON au.id = a.auteur_id
LEFT JOIN categorie c ON c.id = a.categorie_id
WHERE a.statut = 'publie';""")
w("""CREATE OR REPLACE VIEW vue_audience_mensuelle AS
SELECT DATE_FORMAT(l.lu_le, '%Y-%m') AS mois, c.nom AS rubrique,
       COUNT(*) AS lectures, COUNT(DISTINCT l.utilisateur_id) AS lecteurs_identifies,
       ROUND(AVG(l.duree_secondes)) AS duree_moyenne
FROM lecture l
JOIN article a ON a.id = l.article_id
LEFT JOIN categorie c ON c.id = a.categorie_id
GROUP BY mois, rubrique;""")

sys.stdout.write("SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS = 1;\n" + "\n".join(OUT) + "\n")
