# Linux auto-update — état des lieux, décisions et options

> Note de travail vivante. Contrairement à la première version, une partie des
> décisions est maintenant actée. Ce document sert à reprendre le sujet sans
> refaire le raisonnement.

## État au 2026-08-28

| Chantier                       | Décision                                           | Statut                                                                 |
| ------------------------------ | -------------------------------------------------- | ---------------------------------------------------------------------- |
| Garde `safeStorage`            | ✅ à faire, indépendant du packaging               | **fait** — PR [#158](https://github.com/jdeniau/tiana-tables/pull/158) |
| Option 3 — notification in-app | ✅ **on commence par là**                          | en cours, branche `update-notification`                                |
| Option 1 — dépôt APT/YUM       | ⏸️ **pas maintenant**, mais reste la suite logique | non commencé                                                           |
| Option 4 — Flathub             | ⏸️ plus tard, sans rien casser du reste            | non commencé                                                           |
| Option 2 — electron-builder    | ❌ écartée                                         | —                                                                      |

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

## Option 3 — Notification in-app — EN COURS

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

## Option 4 — Flathub

### Ce qu'on gagne

- **MAJ automatique gratuite** : GNOME Software / KDE Discover / `flatpak update`
  gèrent détection + download **delta** (OSTree ne transfère que les blocs
  modifiés, quelques Mo au lieu de 100) + install. Zéro code, zéro clé GPG, zéro
  bande passante à notre charge. Nettement plus économe que le dépôt apt, où
  chaque MAJ retélécharge les 100 Mo.
- On peut laisser `update-electron-app` tel quel (il sort en avance sur Linux).
- Découvrabilité réelle + page vitrine.
- **Sécurité** : c'est l'argument le plus fort pour cette app en particulier.
  Aujourd'hui, les centaines de paquets npm du process main tournent avec **tous
  les droits utilisateur** — ils peuvent lire `~/.ssh`, `~/.aws`, les profils
  navigateur. En sandbox ils ne voient que ce que le manifeste accorde. C'est la
  meilleure réponse au risque supply-chain npm, et elle est gratuite.

### Piège à éviter : NE PAS construire depuis les sources

`flatpak-builder` build dans un sandbox **sans réseau**. La voie « from source »
Node impose de vendorer les deps via `flatpak-node-generator` → point faible
historique sur **Yarn 4** + rebuild natif d'Electron. C'est là que les gens
abandonnent.

**Chemin court : repackager le binaire déjà construit.** Le manifeste déclare
comme source l'asset de la release GitHub (avec son sha256) et le décompresse
dans `/app`. Les sources sont téléchargées _hors_ sandbox, checksums vérifiés →
règle du build hors-ligne respectée. Pratique courante pour Electron sur Flathub.

Manifeste minimal : `base: org.electronjs.Electron2.BaseApp`, une source
`type: archive`, un bloc `x-checker-data` (`github-releases`).

Bonus : `flatpak-external-data-checker` ouvre une PR à chaque release avec la
nouvelle URL + sha256. On merge, ça build, c'est publié.

### Le coût de la sandbox, pour un client SQL

La sandbox est un **gain net de sécurité** et une **taxe** sur exactement les
fonctionnalités qu'un client SQL veut. La question n'est pas « la sandbox est-elle
bien ? » mais **« la roadmap va-t-elle vers les tunnels SSH, les sockets Unix,
les certificats clients et l'import/export ? »**

1. **Système de fichiers** — rien hors du dossier de données. Ouvrir/enregistrer
   un `.sql` passe par les **portails XDG** : l'utilisateur choisit, l'app reçoit
   l'accès à _ce fichier_. Bien pour ouvrir/enregistrer ; pénible pour « rouvrir
   le dernier fichier au démarrage » — il faut persister le handle du document
   portal, pas un chemin. `src/main-process/sqlFileStorage.ts` est concerné.
   `--filesystem=home` est questionné par les reviewers, à raison.
2. **Sockets Unix MySQL** — `/var/run/mysqld/mysqld.sock` inaccessible. Vérifié :
   aucun `socketPath` dans `src/sql/`, on ne fait que du TCP (OK avec
   `--share=network`). Neutre aujourd'hui, porte fermée demain.
3. **Tunnels SSH** — la fonctionnalité que tout client SQL finit par ajouter. Pas
   de `~/.ssh`, et `$SSH_AUTH_SOCK` pointe vers l'hôte. Faisable
   (`--socket=ssh-auth`, `--filesystem=~/.ssh:ro`) mais à concevoir dès le départ.
4. **Certificats clients TLS** — même problème de chemins arbitraires.
5. **`safeStorage`** — nécessite `--talk-name=org.freedesktop.secrets`, sinon
   repli silencieux sur `basic_text`. ✅ **Couvert** : le garde de la PR #158 rend
   ce cas visible au lieu de silencieux.
6. **Outils de l'hôte** — pas de `mysqldump` système. Y accéder demanderait
   `--talk-name=org.freedesktop.Flatpak`, une évasion de sandbox que les
   reviewers refusent, à raison.
7. **Contrainte permanente** — chaque nouvelle fonctionnalité doit être pensée
   sandbox, et élargir les permissions repasse en review.
8. **Ne couvre pas les utilisateurs `.deb`/`.rpm` actuels.**
9. **App ID définitif** : `io.github.jdeniau.TianaTables` (tirets tolérés
   seulement dans le dernier segment). Doit matcher le `.desktop` et le MetaInfo,
   **non renommable** après publication.

### Coût d'entrée

- Un **MetaInfo AppStream** valide : résumé, description, licence,
  `content_rating`, **captures d'écran**, `<releases>` à jour. One-shot, mais pas
  10 min.
- Une **PR sur `flathub/flathub`** avec review humaine : plusieurs semaines +
  allers-retours sur les permissions (points 1 et 3 surtout).
- Ensuite, avec le bot, c'est quasi de la lecture.

### Comment lever le doute sans s'engager

Écrire le manifeste, `flatpak-builder` en local, `flatpak install` du bundle. On
voit immédiatement ce qui casse (secrets, dialogues de fichiers) et on peut
distribuer un `.flatpak` pour valider. La review Flathub ne vient qu'après.

---

## Comparatif

| Option                     | Effort initial            | Maintenance                | Couvre                           |
| -------------------------- | ------------------------- | -------------------------- | -------------------------------- |
| **1. Dépôt apt/yum**       | Moyen (CI + GPG)          | Faible, mais clé GPG à vie | Debian/Ubuntu + Fedora, en natif |
| **2. electron-builder**    | Élevé (rebuild 3 OS)      | Moyen                      | Linux, MAIS casse MAJ Windows    |
| **3. Notification in-app** | Faible (~1-2 h)           | Nulle                      | Tout le monde, MAJ manuelle      |
| **4. Flathub**             | Moyen (metainfo + review) | ~nulle (bot)               | Utilisateurs Flatpak             |

## Ordre retenu

1. **Notification in-app** — valeur indépendante de tout le reste, et c'est elle
   qui rend le dépôt atteignable pour les utilisateurs existants. ← _en cours_
2. **Dépôt apt/yum** — banc d'essai local d'abord, CI ensuite.
3. **Flathub** — plus tard, sans rien casser de ce qui précède.

Chaque étape rend la suivante plus utile, et aucune ne dépend de la suivante.

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
