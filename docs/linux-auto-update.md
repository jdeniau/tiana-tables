# Linux auto-update — état des lieux et options

> Note de travail issue d'une discussion. Aucune décision n'est encore actée ni
> implémentée. Ce document sert à ne rien perdre du raisonnement.

## Problème

Les paquets `.rpm` et `.deb` produits par le build **ne se mettent pas à jour**
aujourd'hui.

- `src/main.ts:106` appelle `updateElectronApp()` (lib `update-electron-app`),
  qui s'appuie sur l'`autoUpdater` d'Electron → Squirrel.Windows / Squirrel.Mac
  uniquement.
- La lib sort explicitement en avance sur Linux :
  `const supportedPlatforms = ['darwin', 'win32'];` puis
  `// exit early on unsupported platforms, e.g. 'linux'`.
- Les paquets produits par `MakerRpm`/`MakerDeb` (electron-forge) sont « nus » :
  rien ne pointe vers un dépôt, donc `apt upgrade` / `dnf upgrade` ne les voient
  pas non plus.

Résultat : les utilisateurs Linux restent figés sur leur version installée, sans
le savoir.

---

## Option 1 — Dépôt APT/YUM (voie native, zéro code dans l'app)

Deux dossiers de fichiers statiques servis en HTTPS + une clé GPG. Aucune
dépendance ajoutée à l'app.

### Dépôt APT (format « flat repository », suffisant)

```
apt/
  tiana-tables_1.1.0_amd64.deb
  Packages / Packages.gz
  Release / InRelease / Release.gpg
```

Génération (dans le dossier contenant le `.deb`) :

```bash
apt-ftparchive packages . > Packages
gzip -9kf Packages
apt-ftparchive -o APT::FTPArchive::Release::Origin="Tiana Tables" \
  -o APT::FTPArchive::Release::Architectures="amd64" release . > Release
gpg --batch --yes --default-key "$GPG_KEY_ID" -abs -o Release.gpg Release
gpg --batch --yes --default-key "$GPG_KEY_ID" --clearsign -o InRelease Release
```

Côté utilisateur (format deb822, `apt-key` est mort) :

```bash
sudo curl -fsSL https://jdeniau.github.io/tiana-tables/tiana-tables.gpg \
  -o /usr/share/keyrings/tiana-tables.gpg
```

`/etc/apt/sources.list.d/tiana-tables.sources` :

```
Types: deb
URIs: https://jdeniau.github.io/tiana-tables/apt
Suites: ./
Signed-By: /usr/share/keyrings/tiana-tables.gpg
```

⚠️ Servir la clé **déjà dé-armorée** (binaire, pas ASCII), sinon `Signed-By`
échoue avec un message d'erreur incompréhensible.

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
que les métadonnées annoncent avec ce qui est installé. On peut donc régénérer
tout le dépôt from scratch à chaque release avec le seul dernier paquet : job CI
idempotent, pas d'état à maintenir, pas de branche `gh-pages` qui gonfle. On perd
juste la possibilité d'épingler une vieille version (non-enjeu pour un client SQL
desktop).

### CI

Un job en plus dans `.github/workflows/publish.yml` avec `needs: build` :
`gh release download` des `.deb`/`.rpm`, commandes ci-dessus, push sur
`gh-pages`. Deux secrets : `GPG_PRIVATE_KEY`, `GPG_PASSPHRASE`.

Gros avantage : **testable en local en 2 min** (`docker run -it debian`, ajout du
dépôt, `apt install`, bump, `apt upgrade`) sans passer par une release GitHub.

### Limites à connaître

- **amd64 seulement** en l'état (matrice = `ubuntu-latest`). arm64 → runner
  `ubuntu-24.04-arm`.
- **Clé GPG = dépendance à vie.** Si elle expire/se perd, tous les `apt update`
  tombent en erreur. Expiration longue + backup hors secrets GitHub.
- **Bande passante GitHub Pages.** Le champ `Filename:` de `Packages` est relatif
  à l'URL du dépôt → le `.deb` doit être servi *depuis* Pages (pas moyen de
  garder le binaire sur les releases et n'héberger que les métadonnées). ~100 Mo
  par paquet vs limite soft 100 Go/mois : tient un moment, pas infini.
- **MAJ non instantanée** : au prochain `apt update`. `unattended-upgrades` ne
  traite par défaut que les dépôts de sécurité → l'utilisateur voit la MAJ dans
  GNOME Software / au prochain `apt upgrade`. À écrire dans le README.
- Install initiale = « ajoute mon dépôt » au lieu de « double-clic sur le .deb ».

### Variante paresseuse

**Cloudsmith** (gratuit open source) gère GPG + métadonnées + CDN. Devient une
ligne de CI, la bande passante n'est plus notre problème. On perd l'autonomie et
on ajoute un tiers dans la chaîne de distribution.

---

## Option 2 — Migrer vers electron-builder (electron-updater)

electron-updater **supporte bien** deb/rpm/pacman depuis
[electron-builder#7060](https://github.com/electron-userland/electron-builder/pull/7060)
(`DebUpdater`, `RpmUpdater`) : téléchargement + install via élévation de
privilèges, avec un fichier `package-type` embarqué et un `latest-linux.yml`.

**MAIS** cela impose le layout electron-builder → migrer TOUT le build
(Windows + macOS compris), pas seulement Linux.

Verdict point par point :

- **macOS** : un peu moins pénible (`notarytool` natif, défauts corrects), mais
  l'essentiel de la douleur vient d'Apple, pas du build system. Ne pas migrer en
  espérant que ça guérisse ça. NB : le workflow actuel installe un provisioning
  profile qui n'est **pas nécessaire** pour du Developer ID hors App Store —
  bruit hérité potentiellement retirable *sans* changer d'outil.
- **AppImage** : le problème historique disparaît, car deb/rpm sont désormais
  auto-updatables → plus besoin de produire d'AppImage du tout. Donc « AppImage
  ingérable » n'est plus un argument dans un sens ni dans l'autre.
- **Windows = le point qui décide.** electron-builder = NSIS, pas Squirrel. Les
  installations existantes via `MakerSquirrel` interrogent un feed Squirrel
  (`RELEASES` + `.nupkg`). En passant à NSIS ce feed cesse d'être alimenté →
  **ces installs ne se mettent plus jamais à jour, silencieusement** (pas
  d'erreur, pas de migration auto). Il faudrait publier du Squirrel en parallèle
  longtemps, ou abandonner ces utilisateurs.

**Conclusion :** reconstruit le packaging des 3 plateformes + casse le chemin de
MAJ Windows, pour résoudre un problème Linux. Mauvais ratio. À envisager
seulement si on migre pour une raison qui concerne Windows/macOS.

Rappel du contexte : la migration macOS sur electron-builder avait déjà été une
galère, et la gestion des AppImage impossible — d'où la question de savoir si ce
serait « moins la merde » maintenant. Réponse : à peine, et le coût Windows est
rédhibitoire.

---

## Option 3 — Notification in-app (pragmatique, ~1h de travail)

Sur Linux, au démarrage : interroger
`https://api.github.com/repos/jdeniau/tiana-tables/releases/latest`, comparer à
`app.getVersion()`, afficher « X.Y.Z disponible » + lien vers la release.

~40 lignes, aucune infra, aucune signature. Ce n'est pas de la MAJ auto, mais ça
couvre 90 % du besoin réel : débloquer les utilisateurs figés qui ne savent pas
qu'une version existe.

---

## Option 4 — Flathub (probablement le meilleur ratio bénéfice/effort)

### Ce qu'on gagne

- **MAJ automatique intégralement gratuite** : GNOME Software / KDE Discover /
  `flatpak update` gèrent détection + download **delta** (ostree ne transfère que
  les blocs modifiés, ~quelques Mo au lieu de 100) + install. Zéro code dans
  l'app, zéro clé GPG à vie, zéro bande passante à notre charge.
- On peut laisser `update-electron-app` tel quel (il sort en avance sur Linux).
- Découvrabilité réelle (magasin par défaut Fedora, Steam Deck, elementary,
  souvent présent sur Ubuntu/Debian desktop) + page vitrine avec captures.

### Piège à éviter : NE PAS construire depuis les sources

`flatpak-builder` build dans un sandbox **sans réseau**. La voie « from source »
Node impose de vendorer les deps via `flatpak-node-generator` → point faible
historique sur **Yarn 4** (`packageManager: yarn@4.5.0`) + rebuild natif
d'Electron dans le sandbox. C'est là que les gens abandonnent.

**Chemin court : repackager le binaire déjà construit.** Le manifeste déclare
comme source l'asset de la release GitHub (avec son sha256) et le décompresse
dans `/app`. Les sources sont téléchargées *hors* sandbox par flatpak-builder,
checksums vérifiés → règle du build hors-ligne respectée. Pratique courante pour
les apps Electron sur Flathub. On réutilise la CI existante.

Manifeste minimal :

- `base: org.electronjs.Electron2.BaseApp` (fournit les libs système d'Electron ;
  ne pas les lister à la main)
- une source `type: archive` → asset de la release
- un bloc `x-checker-data` (`github-releases`)

Bonus : Flathub fait tourner `flatpak-external-data-checker` → à chaque release,
un bot ouvre une PR sur le dépôt `flathub/…` avec la nouvelle URL + sha256. On
merge, ça build, c'est publié. Maintenance par release = ~un clic.

### Pièges spécifiques à Tiana Tables (un client SQL est plus intrusif que la moyenne)

1. **`safeStorage` casse sans permission explicite.**
   `src/configuration/index.ts:40` chiffre les mots de passe via
   `safeStorage.encryptString()`. Sur Linux ça passe par le secret service
   (gnome-libsecret / kwallet) via DBus. Dans le sandbox il faut
   `--talk-name=org.freedesktop.secrets`, sinon Electron retombe sur le backend
   `basic_text` (mot de passe codé en dur = obfuscation) → mots de passe stockés
   en clair-déguisé sans que personne le voie.
   - ⚠️ **Bug latent indépendant de Flatpak** : le code appelle `encryptString`
     **sans vérifier `isEncryptionAvailable()`** ni tester
     `getSelectedStorageBackend()`. Faiblesse déjà présente sur Linux natif
     aujourd'hui. À corriger quel que soit le choix de packaging.
2. **Connexions MySQL par socket Unix** : inaccessibles dans le sandbox. Vérifié :
   aucun `socketPath` dans `src/sql/` → on ne fait que du TCP, qui marche avec
   `--share=network`. Neutre aujourd'hui, mais porte fermée si on voulait ajouter
   les sockets un jour.
3. **Stockage des fichiers SQL** (`src/main-process/sqlFileStorage.ts`) : pour
   ouvrir/enregistrer des `.sql` partout, passer par les portails XDG (bon
   chemin) ou demander `--filesystem=home` (que les reviewers Flathub
   questionnent, à raison).
4. **App ID** : tirets tolérés seulement dans le dernier segment ; convention
   CamelCase → `io.github.jdeniau.TianaTables`. Doit matcher le `.desktop`, le
   MetaInfo, et est **définitif** (pas renommable après publication).

### Coût d'entrée (honnête)

- Un **MetaInfo AppStream** valide : résumé, description, licence,
  `content_rating`, **captures d'écran** (validées + affichées sur la page),
  `<releases>` tenu à jour. One-shot, mais pas 10 min.
- Une **PR sur `flathub/flathub`** avec review humaine : compter plusieurs
  semaines + allers-retours sur les permissions du sandbox (points 1 et 3
  ci-dessus surtout).
- Ensuite on maintient `flathub/io.github.jdeniau.TianaTables`, mais avec le bot
  c'est quasi de la lecture.

### Ce que ça ne résout PAS

Flathub **ne met pas à jour les utilisateurs `.deb`/`.rpm` actuels** : canal
*supplémentaire*, pas correctif. Sauf à décider que Flatpak devient *le* chemin
Linux officiel (mis en avant dans le README, `.deb`/`.rpm` laissés en
téléchargement manuel).

---

## Comparatif

| Option | Effort initial | Maintenance | Couvre |
|---|---|---|---|
| **1. Dépôt apt/yum** | Moyen (CI + GPG) | Faible, mais clé GPG à vie | Debian/Ubuntu + Fedora |
| **2. electron-builder** | Élevé (rebuild 3 OS) | Moyen | Linux, MAIS casse MAJ Windows |
| **3. Notification in-app** | Faible (~1h) | Nulle | Tout le monde, mais MAJ manuelle |
| **4. Flathub** (binaire repackagé) | Moyen (metainfo + review) | ~nulle (bot) | Utilisateurs Flatpak |

## Reco (proposée, non validée)

1. **Option 3 tout de suite** (~1h) : débloque immédiatement tous ceux qui sont
   figés sans le savoir.
2. **Option 4 (Flathub)** comme vrai canal auto-updaté — meilleur ratio, si on
   accepte que le sandbox devienne une contrainte de design permanente (enjeu réel
   pour un client SQL : sockets, tunnels SSH, certificats clients, import/export).
3. **Laisser tomber l'option 1** si Flathub passe (maintenir deux canaux pour la
   même plateforme n'a pas de sens).
4. **Indépendamment du packaging** : ajouter le garde
   `isEncryptionAvailable()` / `getSelectedStorageBackend()` autour du chiffrement
   de config — ce bug existe déjà.

## Références

- electron-builder#7060 — deb/rpm auto-updates :
  https://github.com/electron-userland/electron-builder/pull/7060
- Auto Update | electron-builder : https://www.electron.build/docs/features/auto-update/
- Electron safeStorage : https://www.electronjs.org/docs/latest/api/safe-storage
- Flathub Requirements : https://docs.flathub.org/docs/for-app-authors/requirements
- Flatpak conventions : https://docs.flatpak.org/en/latest/conventions.html
