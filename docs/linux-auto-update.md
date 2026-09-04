# Linux auto-update — état des lieux, décisions et options

> Note de travail vivante. Contrairement à la première version, une partie des
> décisions est maintenant actée. Ce document sert à reprendre le sujet sans
> refaire le raisonnement.

## État au 2026-09-03

| Chantier                       | Décision                                   | Statut                                                                 |
| ------------------------------ | ------------------------------------------ | ---------------------------------------------------------------------- |
| Garde `safeStorage`            | ✅ indépendant du packaging                | **fait** — PR [#158](https://github.com/jdeniau/tiana-tables/pull/158) |
| Option 3 — notification in-app | ✅                                         | **fait** — PR [#159](https://github.com/jdeniau/tiana-tables/pull/159) |
| Option 4 — Flathub             | ❌ **impossible**, politique IA générative | abandonnée, voir plus bas                                              |
| Option 5 — dépôt Flatpak perso | étudiée, mise de côté                      | non commencée                                                          |
| Option 1 — dépôt APT/YUM       | ✅ **la suite retenue**                    | non commencée                                                          |
| Option 2 — electron-builder    | ❌ écartée                                 | —                                                                      |

**Le contexte a changé et il change la conclusion : l'audience, aujourd'hui,
c'est une personne, sur Fedora.** La découvrabilité ne vaut rien, et le budget
tient en une soirée, pas en plusieurs jours. Voir « Ordre retenu » en bas.

---

## Problème

Les paquets `.rpm` et `.deb` produits par le build **ne se mettent pas à jour**.

- `src/main.ts` appelle `updateElectronApp()` (lib `update-electron-app`), qui
  s'appuie sur l'`autoUpdater` d'Electron → Squirrel.Windows / Squirrel.Mac
  uniquement.
- La lib sort explicitement en avance sur Linux :
  `const supportedPlatforms = ['darwin', 'win32'];`
- Les paquets produits par `MakerRpm`/`MakerDeb` (electron-forge) sont « nus » :
  rien ne pointe vers un dépôt, donc `apt upgrade` / `dnf upgrade` ne les voient
  pas non plus.

Résultat : les utilisateurs Linux restent figés sur leur version installée, sans
le savoir.

---

## Rappel : pourquoi les MAJ Linux sont un problème différent

Sur Windows et macOS, **l'app se met à jour elle-même** (Squirrel, Sparkle) :
c'est un bundle autonome installé dans un dossier qu'elle peut réécrire. Sur
Linux, historiquement, **c'est le système qui met à jour les apps** : le paquet
est installé en root dans `/usr`, l'app tourne en utilisateur, elle ne peut ni
ne doit se réécrire — ça désynchroniserait la base du gestionnaire de paquets.

D'où trois familles de solutions :

1. **paquet distro** (deb/rpm) → il faut un dépôt → option 1 ;
2. **format auto-géré** (AppImage) → l'app se met à jour seule, zéro intégration ;
3. **formats magasin** (Flatpak, Snap) → installation par utilisateur, sans root,
   le magasin gère les MAJ → option 4.

---

## Flatpak vs Snap vs AppImage

Question posée : « ce ne sont pas des concurrents, dont certains mieux intégrés
sur Debian ? » Oui, ce sont des concurrents. Mais la prémisse « Snap est mieux
intégré sur Debian » est fausse : **Snap est intégré sur Ubuntu, pas sur Debian.**

- **Debian** (la vraie) : ni `flatpak` ni `snapd` par défaut. Les deux sont dans
  les dépôts, avec des plugins GNOME Software séparés. Debian ne pousse ni l'un
  ni l'autre.
- **Ubuntu** : `snapd` préinstallé et poussé (Firefox est un snap). Et depuis
  2023, les saveurs officielles n'installent **plus** Flatpak par défaut.
- **Fedora, Linux Mint, Pop!\_OS, elementary, SteamOS, Endless** : Flatpak
  préinstallé. Mint **bloque activement** l'installation de snapd.
- **AppImage** : intégré nulle part, et c'est volontaire.

|                    | Flatpak                             | Snap                                    | AppImage                 |
| ------------------ | ----------------------------------- | --------------------------------------- | ------------------------ |
| MAJ auto           | ✅ delta OSTree                     | ✅ delta, **forcée**                    | ❌ aucune                |
| Sandbox            | ✅ + portails                       | ✅ mais mode `classic` qui la désactive | ❌                       |
| Magasin            | Flathub, plusieurs dépôts possibles | Snap Store **unique et propriétaire**   | on héberge soi-même      |
| Intégration bureau | ✅                                  | ✅                                      | ❌ sauf AppImageLauncher |

**Conclusions :** AppImage ne résout pas le problème (c'est le problème). Snap le
résout mais enferme dans un magasin propriétaire unique, avec une portée qui
s'arrête aux frontières d'Ubuntu. Flatpak est le seul candidat sérieux — mais il
est faible précisément sur Ubuntu, ce qui **nuance la conclusion initiale** :
Flathub ne remplace pas un dépôt apt, les deux ne visent pas le même public.

---

## Option 1 — Dépôt APT/YUM

Deux dossiers de fichiers statiques servis en HTTPS + une clé GPG. Aucune
dépendance ajoutée à l'app.

### Dépôt APT (format « flat repository », suffisant)

```
apt/
  tiana-tables_1.1.0_amd64.deb
  Packages / Packages.gz
  Release / InRelease / Release.gpg
```

```bash
apt-ftparchive packages . > Packages
gzip -9kf Packages
apt-ftparchive -o APT::FTPArchive::Release::Origin="Tiana Tables" \
  -o APT::FTPArchive::Release::Architectures="amd64" release . > Release
gpg --batch --yes --default-key "$GPG_KEY_ID" -abs -o Release.gpg Release
gpg --batch --yes --default-key "$GPG_KEY_ID" --clearsign -o InRelease Release
```

`/etc/apt/sources.list.d/tiana-tables.sources` (format deb822, `apt-key` est mort) :

```
Types: deb
URIs: https://jdeniau.github.io/tiana-tables/apt
Suites: ./
Signed-By: /usr/share/keyrings/tiana-tables.gpg
```

⚠️ Servir la clé **dé-armorée** (binaire) pour APT, sinon `Signed-By` échoue avec
un message incompréhensible.

### Dépôt RPM

```bash
rpm --define "_gpg_name $GPG_KEY_ID" --addsign rpm/*.rpm
createrepo_c rpm/
gpg --batch --yes --detach-sign --armor rpm/repodata/repomd.xml
```

⚠️ **L'ordre compte** : signer les `.rpm` d'abord, `createrepo_c` ensuite. La
signature modifie le fichier ; dans l'autre sens les checksums de `repodata/`
seraient faux (erreur chez l'utilisateur, pas chez toi).

### Ce qui simplifie énormément

Le dépôt **n'a pas besoin de l'historique**. `apt`/`dnf` comparent seulement ce
que les métadonnées annoncent avec ce qui est installé. On régénère donc tout le
dépôt from scratch à chaque release avec le seul dernier paquet : job CI
idempotent, pas d'état à maintenir. On perd juste l'épinglage d'une vieille
version (non-enjeu pour un client SQL desktop).

### Où héberger

|                   | Coût                | Bande passante                         | Autonomie perdue            |
| ----------------- | ------------------- | -------------------------------------- | --------------------------- |
| **GitHub Pages**  | gratuit             | 100 Go/mois (soft), site < 1 Go (soft) | rien                        |
| **Cloudflare R2** | gratuit < 10 Go     | **egress gratuit**                     | un compte Cloudflare        |
| **Cloudsmith**    | gratuit open source | à leur charge                          | GPG + distribution délégués |
| **OBS**           | gratuit             | à leur charge                          | conçu pour ça, mais lourd   |

**Choix proposé : GitHub Pages pour démarrer**, migration vers R2 si la bande
passante devient un problème (c'est juste une URL à changer).

⚠️ **Précaution non négociable** : republier `gh-pages` en **orphan** à chaque
release (`force_orphan: true` avec `peaceiris/actions-gh-pages`), sinon
l'historique git accumule ~100 Mo par version et la limite explose en un an. Ça
tombe bien, le dépôt n'a pas besoin d'historique.

### Le piège qui décide de l'hébergement

Le champ `Filename:` du `Packages` d'APT est **obligatoirement relatif** à l'URL
du dépôt : pas d'URL absolue, et GitHub Pages ne fait pas de redirection 302.
Donc **le `.deb` doit être servi depuis Pages**, en plus de la copie sur la
Release.

Côté RPM il y a une asymétrie : `createrepo_c --location-base <URL>` écrit un
`xml:base` dans les métadonnées, ce qui permettrait de **laisser le `.rpm` sur la
GitHub Release** et de n'héberger que les métadonnées. ⚠️ **À vérifier au test
local** — si ça marche, ça divise par deux ce qui transite par Pages.

### Le vrai levier : le `postinst`

C'est le point qui manquait à la première version du doc.

Ajouter un dépôt demande normalement une étape manuelle à l'utilisateur. Sauf que
**c'est le paquet lui-même qui peut le faire** : Chrome et VS Code s'installent
d'un double-clic, et leur `postinst` installe le keyring et la source APT.
Vérifié sur la machine de dev : `/etc/yum.repos.d/1password.repo` commence par
_« This file is automatically added and configured by the 1Password package »_.

```ts
new MakerDeb({
  options: {
    icon: 'images/icons/icon.png',
    scripts: { postinst: 'build/deb/postinst' },
  },
}),
```

⚠️ Côté RPM, `electron-installer-redhat` n'expose pas les scriptlets `%post` aussi
proprement — **à vérifier**, il faudra peut-être un template de spec, ou
instruire l'utilisateur Fedora manuellement.

Conséquences :

- ceux qui installeront le `.deb` **à partir de la prochaine release** seront
  auto-updatés pour toujours, sans rien faire ;
- les utilisateurs **actuels** doivent installer un dernier `.deb` à la main —
  c'est précisément ce que la notification in-app sert à leur dire.

Le meilleur emplacement pour la clé publique est **dans le `.deb` lui-même**
(fichier de données que le `postinst` copie dans `/usr/share/keyrings/`) : pas de
`curl` à l'installation, donc pas de confiance-au-premier-téléchargement sur un
canal séparé. La confiance vient du `.deb` récupéré en HTTPS depuis la Release.

### La clé GPG — cycle de vie complet

**Ce qu'elle signe, deux choses distinctes :**

- **les métadonnées** (`Release` → `InRelease`/`Release.gpg` ; `repomd.xml` →
  `repomd.xml.asc`) : prouve que la liste des paquets et leurs checksums viennent
  de toi. APT ne repose que là-dessus (`debsigs` n'est utilisé par personne) ;
- **les `.rpm` eux-mêmes** (`rpm --addsign`), vérifiés via `gpgcheck=1`.

**La créer**, une fois, sur ta machine — une clé **dédiée**, pas celle des commits :

```bash
gpg --full-generate-key
# RSA 4096 (plus compatible que ed25519 avec les vieux rpm)
# Expiration : 5 ans — pas "jamais"
# Nom : Tiana Tables Repository Signing Key
```

**Le point important — une sous-clé pour la CI.** On n'envoie jamais la clé
maîtresse sur GitHub :

```bash
gpg --edit-key <KEYID>
gpg> addkey        # RSA, sign only, 4096
gpg> save

# le "!" final est essentiel : "exactement cette sous-clé"
gpg --export-secret-subkeys --armor <SUBKEY_ID>! | base64 -w0
```

En cas de fuite des secrets GitHub, on révoque la sous-clé et on en émet une
autre : **les utilisateurs gardent leur keyring intact**, parce que leur
confiance porte sur la clé maîtresse. Sans sous-clé, une fuite oblige tout le
monde à réinstaller une clé à la main.

|                        | Où                                               | Rôle                          |
| ---------------------- | ------------------------------------------------ | ----------------------------- |
| Clé maîtresse (privée) | machine + sauvegarde **hors GitHub**             | créer/révoquer des sous-clés  |
| Sous-clé de signature  | secrets `GPG_PRIVATE_KEY` + `GPG_PASSPHRASE`     | signer en CI                  |
| Clé publique           | servie sur Pages **et** embarquée dans le `.deb` | vérification côté utilisateur |

**En CI** — `crazy-max/ghaction-import-gpg@v6` gère les deux pièges qui font
perdre une soirée : `allow-loopback-pinentry` et `GPG_TTY`. En manuel, penser à
`--batch --pinentry-mode loopback --passphrase` sur **chaque** appel signant.

**Deux formats de clé publique, non interchangeables :**

```bash
gpg --export <KEYID>          > tiana-tables.gpg   # binaire → APT (Signed-By)
gpg --export --armor <KEYID>  > tiana-tables.asc   # armuré  → RPM (gpgkey=)
```

**Si elle expire ou se perd** : tous les `apt update` de tous les utilisateurs
tombent en erreur, et la sortie de secours (pousser un nouveau keyring via un
nouveau paquet) suppose qu'ils puissent encore mettre à jour — serpent qui se
mord la queue. D'où : expiration longue mais finie, sauvegarde offline de la
maîtresse, sous-clé pour la CI, et **un rappel calendrier six mois avant
l'échéance** (prolonger est trivial, mais uniquement si on y pense à temps).

### La forme du job CI

```yaml
repo:
  needs: build # attendre les 4 OS de la matrice
  runs-on: ubuntu-latest
  permissions:
    contents: write
  steps:
    - gh release download <tag> -p '*.deb' -p '*.rpm'
    - crazy-max/ghaction-import-gpg
    - rpm --addsign  →  createrepo_c  →  sign repomd.xml # l'ordre compte
    - apt-ftparchive packages/release  →  gpg InRelease
    - peaceiris/actions-gh-pages avec force_orphan: true
```

### Tester en local AVANT de toucher à la CI

C'est l'ordre qui évite de débugger une signature GPG à travers des logs GitHub
Actions : générer les métadonnées sur son poste à partir d'un `.deb` existant,
servir le dossier avec `python3 -m http.server`, et monter un
`docker run -it debian` qui ajoute le dépôt et installe. Puis bumper la version,
régénérer, `apt upgrade`. Idem avec `fedora` pour le RPM. Une soirée, et surtout
ça valide les deux inconnues : le `postinst` et le `--location-base`.

### Limites à connaître

- **amd64 seulement** en l'état (matrice = `ubuntu-latest`). arm64 → runner
  `ubuntu-24.04-arm`.
- **MAJ non instantanée** : au prochain `apt update`. `unattended-upgrades` ne
  traite par défaut que les dépôts de sécurité.
- Install initiale = « ajoute mon dépôt »… sauf si le `postinst` le fait, d'où
  son importance.

---

## Option 2 — Migrer vers electron-builder — ÉCARTÉE

electron-updater supporte bien deb/rpm/pacman depuis
[electron-builder#7060](https://github.com/electron-userland/electron-builder/pull/7060),
mais impose le layout electron-builder → migrer TOUT le build.

- **macOS** : à peine moins pénible ; l'essentiel de la douleur vient d'Apple.
  NB : le workflow actuel installe un provisioning profile qui n'est **pas
  nécessaire** pour du Developer ID hors App Store — bruit hérité, retirable
  _sans_ changer d'outil.
- **AppImage** : le problème historique disparaît, donc plus un argument.
- **Windows = le point qui décide.** electron-builder = NSIS, pas Squirrel. Les
  installations existantes via `MakerSquirrel` interrogent un feed Squirrel
  (`RELEASES` + `.nupkg`) ; en passant à NSIS ce feed cesse d'être alimenté →
  **ces installs ne se mettent plus jamais à jour, silencieusement**.

**Conclusion :** reconstruit le packaging des 3 plateformes + casse le chemin de
MAJ Windows, pour résoudre un problème Linux. Mauvais ratio.

---

## Option 3 — Notification in-app — FAITE

### Pourquoi c'est le premier chantier, et pas un pansement

La première version du doc la présentait comme un dépannage. C'est en fait **le
seul des quatre chantiers dont la valeur ne disparaît jamais**, parce qu'il
couvre trois populations qu'aucun dépôt ne rattrapera :

1. **les utilisateurs actuels** — sans dépôt, et sans moyen de savoir qu'ils
   doivent installer un dernier paquet à la main. C'est la notification qui rend
   le futur dépôt atteignable ; sans elle, le dépôt ne touche que les nouveaux ;
2. **les distros hors couverture** — Arch, openSUSE, NixOS, et les utilisateurs
   `.rpm` si le scriptlet `%post` s'avère infaisable ;
3. **les auto-updates cassées sur Windows et macOS** — Squirrel échoue
   silencieusement plus souvent qu'on ne croit (permissions, signature, app
   déplacée). Aujourd'hui personne ne le sait, ni l'utilisateur ni nous. C'est un
   filet de sécurité pour les trois plateformes, pas une fonctionnalité Linux.

### On ne peut RIEN réutiliser de `update-electron-app` — vérifié

`makeUserNotifier` est **uniquement un présentateur de dialogue** : il reçoit un
`info` déjà construit, affiche une modale « Restart / Later » et appelle
`autoUpdater.quitAndInstall()`. Aucune requête, aucune comparaison. Et c'est
l'inverse de ce qu'on veut : `quitAndInstall()` n'a aucun sens sur Linux.

La récupération est faite par l'`autoUpdater` **natif** d'Electron
(Squirrel.Mac / Squirrel.Windows), et la comparaison est faite **côté serveur**
par `update.electronjs.org` : on envoie sa version dans l'URL, il répond 204
(à jour) ou 200. Mesuré le 2026-08-28 :

```
https://update.electronjs.org/jdeniau/tiana-tables/linux-x64/1.0.0  → HTTP 404
https://update.electronjs.org/jdeniau/tiana-tables/darwin-x64/1.0.0 → HTTP 200
```

**Le service lui-même ne sert pas Linux.** Même en court-circuitant la lib, il
n'y a rien à récupérer. → API GitHub `/releases/latest` en direct.

### UI retenue

Une **pastille colorée sur le numéro de version** dans le header
(`src/renderer/routes/root.tsx`, `<span>v{packageJson.version}</span>`), avec le
message au survol. `Tooltip` + `Badge dot` antd — on est dans le header, pas dans
les cellules du grid, donc la mise en garde perf du `CLAUDE.md` ne s'applique
pas. Couleur issue du thème base16, pas en dur.

Bénéfice de cette forme : une pastille est assez discrète pour qu'on **n'ait pas
besoin de mémoriser « version déjà ignorée »** — pas de champ de config, pas de
persistance. Ça retire la moitié de la complexité d'une bannière.

Pas de modale au démarrage.

### Détection de la source d'installation

Le but n'est pas de détecter parfaitement, c'est que **se tromper ne fasse aucun
dégât**. Dire « télécharge le .deb » à quelqu'un dont le magasin le met déjà à
jour est pire que de ne rien dire. Union discriminée, signaux du plus fiable au
moins fiable, et un cas `unknown` dont le message reste vrai quoi qu'il arrive.

| Installation         | Détection                          | Message                                               |
| -------------------- | ---------------------------------- | ----------------------------------------------------- |
| Flatpak              | `process.env.FLATPAK_ID`           | rien — le magasin gère                                |
| Snap                 | `process.env.SNAP`                 | rien                                                  |
| AppImage             | `process.env.APPIMAGE`             | « télécharge la nouvelle version »                    |
| paquet système Linux | `execPath` sous `/usr/` ou `/opt/` | voir ci-dessous                                       |
| Windows / macOS      | `process.platform`                 | « une nouvelle version existe » (= Squirrel a échoué) |
| reste                | —                                  | `unknown` : message vrai dans tous les cas            |

L'ordre compte : un Flatpak a aussi un `/usr` (celui du runtime), donc les
variables d'environnement doivent être testées **avant** le préfixe système.

**Branche « dépôt configuré » reportée.** Tant qu'il n'y a pas de `postinst`, le
fichier `.sources`/`.repo` ne peut pas exister : ce serait du code mort. L'union
est conçue pour l'accueillir, ce sera cinq lignes le jour venu.

**Sur la lecture de `/etc` — fausse alerte, vérifié :** `/etc/yum.repos.d` est
`drwxr-xr-x root root`, les fichiers `-rw-r--r--`. World-readable par convention,
sur Debian comme sur Fedora ; seule l'écriture demande root, et c'est le
`postinst` qui écrit. Vérifier le fichier reflète en plus l'état **actuel** — si
l'utilisateur retire le dépôt, on le voit ; un marqueur écrit une fois
deviendrait faux.

**Et l'info « d'où ça vient » du magasin Fedora ?** C'est PackageKit qui lit le
champ `from_repo` de l'historique dnf (`dnf repoquery --installed --qf
'%{from_repo}'`). Écarté : ça lance dnf (Python, ~1 s) au démarrage, et **il n'y
a pas d'équivalent dpkg** — dpkg ne mémorise pas le dépôt d'origine. Deux
mécanismes en sous-processus pour une info qu'un `readFile` donne.

### Décisions d'implémentation

- **`net.fetch` d'Electron**, pas celui de Node : il passe par la pile réseau de
  Chromium et respecte donc le proxy système. Sur un poste d'entreprise, c'est la
  différence entre « ça marche » et « ça ne marche jamais sans qu'on sache
  pourquoi ».
- **`/releases/latest`** exclut déjà drafts et prereleases. Reste à retirer le
  `v` de `tag_name`.
- **`compare-versions` plutôt qu'un comparateur maison.** Un premier jet écrit à
  la main lisait `1.0.5` comme plus récent que `1.2.0`, et ne savait pas ordonner
  deux prereleases — deux bugs pour une trentaine de lignes. La lib est sans
  dépendance, ~60 kB, et uniquement dans le main process : elle ne coûte rien et
  supprime toute une classe d'erreurs. `validate()` est appelé **avant**
  `compareVersions()`, qui lève sur ce qu'il ne sait pas lire : un tag illisible
  doit valoir « pas de MAJ », jamais un crash au démarrage.
  Les prereleases comptent : `/releases/latest` n'en renvoie jamais, mais la
  version **installée** peut en être une, et quelqu'un sur `1.2.3-beta.1` doit
  bien être prévenu de la sortie de `1.2.3`.
- **Échec absolument silencieux** : pas de réseau, API indisponible, ou rate
  limit anonyme (60 req/h par IP — un NAT d'entreprise peut le toucher). `log.info`,
  pas `log.error`.
- **Un seul appel réseau par session**, mis en cache : une app desktop laissée
  ouverte des jours n'a aucune raison de poller.
- **Rien en dev** (`app.isPackaged`) : une pastille permanente serait du bruit.

### Fichiers

- `src/main-process/installSource.ts` (+ test) — détection pure, testable sans
  toucher au vrai `process` : `detectInstallSource({platform, execPath, env})`.
- `src/main-process/updateCheck.ts` — `isNewerVersion`, fetch, cache,
  `bindIpcMainUpdate`. Pas de test : `isNewerVersion` n'est qu'un garde
  `validate()` autour de `compare-versions`, tester la lib n'est pas le rôle
  de ce dépôt.
- `src/preload/updateChannel.ts` — `UPDATE_CHANNEL.CHECK`.
- reste à faire : `src/preload/update.ts`, exposition dans `src/preload.ts`,
  binding dans `src/main.ts`, hook renderer + pastille dans `root.tsx`, clés de
  traduction EN/FR (une par cas), story Storybook.

### Non fait volontairement

La pastille n'est pas cliquable : ouvrir la page de release demanderait un canal
`OPEN_EXTERNAL` (il n'existe pas — `shell.openExternal` n'est utilisé que dans
`src/main-process/menu.ts`). Candidat naturel pour un suivi.

---

## Option 4 — Flathub — IMPOSSIBLE

**À lire avant toute autre chose sur ce sujet.** Flathub interdit les
applications assistées par IA, et la règle couvre aussi la soumission :

> Applications containing AI-generated or AI-assisted code, documentation, or
> any other content are not allowed.
>
> Submission pull requests must not be generated, opened, or automated using AI
> tools or agents.
>
> [La politique] applies broadly to both the application being submitted to
> Flathub and the Flathub submission itself, including the manifest, metadata,
> patches, build scripts, and pull request.

— <https://docs.flathub.org/docs/for-app-authors/requirements#generative-ai-policy>

Trois choses tombent donc d'un coup : le manifeste et le metainfo, la PR de
soumission, et **l'application elle-même** — le dépôt porte `CLAUDE.md` et
`.ai/lessons.md`, l'assistance IA y est explicite et ancienne. Le rejet est
prévu « without any further review », avec bannissement en cas de récidive.

Il existe une exception étroite — « Exceptions may be granted for mature,
well-maintained projects » — à demander en exposant la situation. C'est la seule
voie légitime, et il ne faut pas miser dessus.

**Leçon de méthode** : cette page était en référence dans ce document depuis la
première version, et n'a jamais été ouverte. Lire la politique d'acceptation
d'une plateforme **avant** de concevoir pour elle.

### Ce qui a quand même été appris, et reste utile

Le travail technique est valide ; c'est le canal de distribution qui tombe.

**La sandbox fonctionne pour cette app.** Vérifié sur un build réel installé :
`safeStorage status: { available: true, backend: 'gnome_libsecret', isSecure: true }`.
C'était l'inconnue n°1. Il faut pour ça `--talk-name=org.freedesktop.secrets`,
sinon Electron retombe silencieusement sur son backend `basic_text`, qui chiffre
avec une clé en dur.

**Aucun accès au système de fichiers n'est nécessaire.** Contrairement à ce
qu'affirmait la première version de ce document, `sqlFileStorage` n'ouvre aucun
fichier arbitraire : il lit et écrit un seul `latest.sql` sous
`app.getPath('userData')`, que la sandbox possède déjà. `shell.openPath` et
`shell.openExternal` passent par le portail OpenURI, sans permission. Donc pas
de `--filesystem=home`, et pas de portails XDG à écrire.

**`@electron-forge/maker-flatpak` est à éviter.** Il fonctionne, mais au prix de
six surcharges, et chaque échec se présente comme un `status code 1` opaque. Cinq
blocages traversés, dans l'ordre :

| Symptôme                               | Cause réelle                                                                                                                                                                                              |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `runtime 19.08 : No remote refs found` | `--targets @electron-forge/maker-flatpak` ne correspond pas au `name` du maker, qui est **`flatpak`**. Forge reconstruit alors le maker **sans configuration** et applique tous ses défauts, sans un mot. |
| `Sdk 25.08 : No remote refs found`     | flathub était un remote **système**, le bundler installe en `--user`, qui ne voit que les remotes utilisateur.                                                                                            |
| `make: clang++: No such file`          | le maker compile zypak depuis un tag de 2021 dont le Makefile force `clang++`, absent du SDK. Inutile de toute façon : le BaseApp Electron fournit déjà `zypak-wrapper`. `modules: []`.                   |
| `E: icon-not-found`                    | icône passée en chaîne → `share/pixmaps/`, que `appstreamcli` ne consulte pas. La passer en objet indexé par résolution la met dans hicolor.                                                              |
| `E: icon-not-found` (bis)              | `1024x1024` n'est pas une taille du thème hicolor. Il faut 128/256/512.                                                                                                                                   |

Le premier est le plus vicieux, et la règle générale vaut pour **tous** les
makers (`deb`, `rpm`, `squirrel`, `zip`) : une cible mal orthographiée ne
prévient pas, elle applique silencieusement les défauts. Seul
`DEBUG='*flatpak*'` et la lecture du manifeste généré permettent de le voir.

État documenté en amont : [electron/forge#4240](https://github.com/electron/forge/issues/4240)
et [malept/electron-installer-flatpak#132](https://github.com/malept/electron-installer-flatpak/issues/132)
— le paquet n'a rien publié depuis 2021.

**Blocage local non résolu, et il touche les deux chemins.** Sur cette Fedora,
`flatpak build-init --base=…` échoue avec
`lsetxattr(security.selinux): Operation not supported` en copiant les fichiers
du BaseApp — que la commande vienne d'un manifeste écrit à la main **ou** du
maker. Le maker a produit un bundle avec succès le 2026-09-02 à 22:29, puis a
échoué à l'identique le lendemain à 08:43, après un redémarrage à 08:34. Rien
dans le dépôt n'avait changé entre les deux.

Ce qui a été écarté par mesure, sans trouver la cause :

- ce n'est pas un système de fichiers sans support SELinux : `/tmp` (tmpfs) et
  `/home` (btrfs) sont tous deux montés avec `seclabel` ;
- ce n'est pas une interdiction générale d'écrire `security.selinux` : `chcon`
  fonctionne pour l'utilisateur ;
- ce n'est pas un bac à sable d'outillage : l'échec persiste en le désactivant ;
- ce n'est pas `--allow-missing-runtimes` qui protégeait le maker — le log
  montre qu'il passe ce drapeau et échoue quand même à « Initializing build
  dir » ;
- `--disable-rofiles-fuse` ne change rien.

Conséquence pratique : **aucun build Flatpak n'est reproductible en local sur
cette machine**, ni par le maker ni par un manifeste. Ça n'empêcherait pas une
CI Ubuntu de builder, mais ça retire au maker sa seule justification — on l'a
gardé en croyant qu'il offrait un chemin local qui marchait. À reprendre à zéro
si le sujet revient, en cherchant d'abord du côté de Fedora 44 / flatpak 1.18.

---

## Option 5 — Dépôt Flatpak auto-hébergé

L'issue de secours quand Flathub est fermé : garder Flatpak comme technologie et
publier soi-même. Étudiée en détail, **mise de côté** au profit de l'option 1.

### Le principe

Un dépôt Flatpak est un dépôt **OSTree** : des fichiers statiques servis en
HTTPS, aucune logique serveur — même modèle que le dépôt APT. Sa particularité
est d'être **adressé par contenu** : le client ne télécharge que les objets
qu'il n'a pas.

Mesuré sur l'app packagée :

| Élément                                                     | Taille     | Change entre deux versions ? |
| ----------------------------------------------------------- | ---------- | ---------------------------- |
| Total packagé                                               | **315 Mo** | —                            |
| Binaires Electron (`.so`, `.pak`, `icudtl.dat`, exécutable) | **229 Mo** | non, sauf montée d'Electron  |
| `resources/` (notre code)                                   | **19 Mo**  | oui                          |

D'où le gain réel : une release qui ne change que notre code fait transférer
**~19 Mo au lieu de 315**, contre ~100 Mo à chaque fois avec APT.

### La chaîne

```sh
flatpak-builder --repo=repo --gpg-sign=$KEYID --force-clean \
  build-dir flatpak/io.github.jdeniau.TianaTables.yml

flatpak build-update-repo --generate-static-deltas \
  --title="Tiana Tables" --gpg-sign=$KEYID repo

ostree prune --repo=repo --refs-only --depth=1
```

La purge est **obligatoire**, pas une optimisation : sans elle le dépôt grossit
indéfiniment. Elle est sans danger, la déduplication étant faite objet par objet
côté client. `build-update-repo` alimente aussi la branche AppStream, ce qui fait
apparaître l'app correctement dans GNOME Software — le metainfo reste utile.

### Installation en un clic

Un `.flatpakref` d'une dizaine de lignes, avec la clé publique **en base64
dedans** — l'utilisateur n'a aucune clé à installer à la main, ce qui évite le
piège de la clé dé-armorée d'APT :

```ini
[Flatpak Ref]
Title=Tiana Tables
Name=io.github.jdeniau.TianaTables
Branch=stable
Url=https://<hébergement>/flatpak
RuntimeRepo=https://dl.flathub.org/repo/flathub.flatpakrepo
GPGKey=<clé publique en base64>
```

⚠️ `RuntimeRepo` : notre dépôt ne contient **pas** `org.freedesktop.Platform`,
ce serait plus d'un Go. Les utilisateurs dépendent donc toujours de Flathub pour
le runtime. Rien à voir avec la politique de soumission — récupérer un runtime
public est libre — mais c'est une dépendance réelle.

### Hébergement : R2, pas Pages

|                                    | GitHub Pages                           | Cloudflare R2                                        |
| ---------------------------------- | -------------------------------------- | ---------------------------------------------------- |
| Dépôt initial (~150 Mo compressés) | sous la limite de 1 Go                 | dans les 10 Go gratuits                              |
| Publication d'une release          | pousser ~150 Mo dans git à chaque fois | `rclone sync` : **seuls les objets changés**, ~19 Mo |
| Bande passante                     | 100 Go/mois (limite douce)             | egress gratuit                                       |

Un dépôt OSTree se marie mal avec git et très bien avec du stockage objet,
précisément parce qu'il est adressé par contenu.

### Ce que ça simplifie, et ce que ça coûte

Simplification : plus besoin d'URL de release avec `sha256`, ni du bot
`flatpak-external-data-checker`. La CI vient de packager l'app, le manifeste
consomme directement sa sortie.

Coûts : une clé GPG à vie ; un dépôt qui, s'il casse, casse la mise à jour de
tous les utilisateurs d'un coup ; une compétence peu courante (beaucoup savent
déboguer un dépôt APT, peu un OSTree) ; ~1,5 Go de SDK à mettre en cache en CI ;
et le blocage SELinux local qui empêche de tester sur Fedora.

### Ce qu'il reste dans le dépôt

Le manifeste, le `.desktop` et le lanceur `zypak-wrapper` ont été **retirés** en
mettant le sujet de côté : le manifeste portait un `sha256` factice et un bloc
`x-checker-data` qui n'a de sens que pour le bot de Flathub, et le `.desktop`
comme le lanceur étaient générés par le maker de toute façon.

Ne restent que ce dont `maker-flatpak` a besoin :
`flatpak/io.github.jdeniau.TianaTables.metainfo.xml` et les trois icônes
`images/icons/icon-{128,256,512}.png`. Le contenu de ce document suffit à
réécrire le reste — la chaîne de commandes et les pièges y sont.

---

## Comparatif

| Option                     | Effort initial            | Maintenance                | Couvre                           |
| -------------------------- | ------------------------- | -------------------------- | -------------------------------- |
| **1. Dépôt apt/yum**       | Moyen (CI + GPG)          | Faible, mais clé GPG à vie | Debian/Ubuntu + Fedora, en natif |
| **2. electron-builder**    | Élevé (rebuild 3 OS)      | Moyen                      | Linux, MAIS casse MAJ Windows    |
| **3. Notification in-app** | Faible (~1-2 h)           | Nulle                      | Tout le monde, MAJ manuelle      |
| **4. Flathub**             | —                         | —                          | **interdit** (politique IA)      |
| **5. Dépôt Flatpak perso** | Moyen (OSTree + GPG + R2) | Moyenne                    | Utilisateurs Flatpak volontaires |

## Ordre retenu

L'audience actuelle est **une personne, sur Fedora**, avec des releases
fréquentes. Ça réduit fortement le périmètre utile :

1. **Notification in-app** — faite (PR #159). Couvre déjà le besoin réel :
   savoir qu'une version existe.
2. **Dépôt YUM seulement** — pas apt/yum. Un seul format, un seul
   `createrepo_c`, et la question du scriptlet `%post` côté RPM se pose une
   fois. Les 100 Mo par mise à jour sont sans importance pour un utilisateur.
   Le dépôt APT s'ajoutera si quelqu'un d'autre en a besoin.
3. **Signature GPG : optionnelle au départ.** Pour un dépôt personnel servi en
   HTTPS, démarrer avec `gpgcheck=0` supprime toute la charge de la clé à vie.
   Ça n'est défendable que tant que l'audience est soi-même — à reprendre dès
   qu'on distribue à d'autres, et à noter comme tel dans le `.repo`.

Ainsi cadré, ce n'est pas plusieurs jours : c'est un job CI d'une trentaine de
lignes, testable en local dans un conteneur Fedora avant de toucher à la CI.

## Ce qui reste ouvert

- Le blocage SELinux de `flatpak build-init --base` sur Fedora.
- Le scriptlet `%post` côté RPM : `electron-installer-redhat` n'expose pas les
  scriptlets aussi proprement que `electron-installer-debian`. À vérifier — sans
  lui, l'ajout du dépôt reste une étape manuelle (sans importance pour une
  audience de un).
- `MakerZIP` avait été activé pour linux afin qu'un manifeste Flatpak dispose
  d'une archive propre. **Revenu à `['darwin']`** : sans consommateur, c'était
  un asset de 117 Mo ajouté à chaque release pour rien. Une ligne à rechanger si
  le sujet reprend — en notant que l'artefact s'appelle alors
  `Tiana Tables-linux-x64-<version>.zip`, **avec des espaces** (dérivé de
  `productName`), ce qui casse tout script naïf.

## Bug latent corrigé en passant

Le chiffrement de la config appelait `safeStorage.encryptString()` **sans
vérifier `isEncryptionAvailable()`** ni `getSelectedStorageBackend()`, et
`decryptString()` sans gestion d'erreur — faiblesse déjà présente sur Linux
natif, indépendante du packaging. Corrigé dans la PR
[#158](https://github.com/jdeniau/tiana-tables/pull/158).

## Références

- electron-builder#7060 — deb/rpm auto-updates :
  https://github.com/electron-userland/electron-builder/pull/7060
- Auto Update | electron-builder : https://www.electron.build/docs/features/auto-update/
- Electron safeStorage : https://www.electronjs.org/docs/latest/api/safe-storage
- Flathub Requirements : https://docs.flathub.org/docs/for-app-authors/requirements
- Flatpak conventions : https://docs.flatpak.org/en/latest/conventions.html
- GitHub Pages limites : https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages#usage-limits
- Flathub — politique IA générative :
  https://docs.flathub.org/docs/for-app-authors/requirements#generative-ai-policy
- electron/forge#4240 — état du maker flatpak :
  https://github.com/electron/forge/issues/4240
- malept/electron-installer-flatpak#132 — la source du problème zypak :
  https://github.com/malept/electron-installer-flatpak/issues/132
