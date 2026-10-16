# 365 Stamps — Spécification de design

**Date** : 2026-10-16
**Statut** : Validé par l'utilisateur

## Vision

Application web installable (PWA) de défi photo personnel façon flashcards : chaque jour, l'app propose un thème ; l'utilisateur prend une photo qui s'y lie, avec une note optionnelle. Les jours passés se revisitent dans une galerie — comme des cartes postales d'il y a longtemps.

**Progression sans pression** : le thème suivant n'est débloqué que lorsque la photo du thème en cours est validée. Il n'y a pas de jour « raté » : on peut s'arrêter deux semaines et reprendre exactement où on s'était arrêté.

**Principe fondamental** (même que mymap) : le projet (le code) est partageable — n'importe qui peut le récupérer et l'utiliser avec sa propre liste de thèmes. Les données (les photos) sont personnelles : elles restent dans le navigateur et ne sont jamais envoyées nulle part.

## Fonctionnalités

### 1. Thème du jour

- La liste des thèmes vit dans `public/themes.json` : un tableau JSON de chaînes non vides (ex. `["Rouge", "Eau", "Matin", …]`). L'utilisateur remplace le contenu placeholder par sa propre liste — **aucun code à changer**.
- Le nombre de thèmes dans la liste définit la durée du défi (365 attendus, mais toute liste valide d'au moins 1 thème fonctionne).
- **Thème courant** : `themes[max dayNumber existant]`, ou `themes[0]` si aucune entrée n'existe encore.
- **Fin du défi** : quand le nombre d'entrées atteint le nombre de thèmes de la liste, écran de félicitations avec accès à la galerie. Le défi peut être relancé en remplaçant `themes.json` par une nouvelle liste (les anciennes entrées, dont les thèmes sont figés, restent dans la galerie ; la progression reprend à `max dayNumber + 1`).
- **Thème figé** : chaque entrée stocke le thème tel qu'il était au moment de la validation. Modifier `themes.json` ne réécrit jamais l'histoire — seuls les thèmes pas encore photographiés changent.

### 2. Prise de photo (écran « Aujourd'hui »)

- Écran principal : numéro du jour (ex. « Jour 12 »), progression (12 / 365), thème du jour en grand, bouton photo.
- Prise de photo via `<input type="file" accept="image/*" capture="environment">` — ouvre l'appareil photo du téléphone (ou la galerie sur desktop).
- Après sélection : **aperçu** de la photo compressée, champ **note** optionnel (texte libre), boutons **Reprendre** / **Valider**.
- Le brouillon (photo sélectionnée, note en cours) vit en mémoire pendant la session uniquement. L'entrée n'est créée en base qu'au moment de la validation.
- Après validation : résumé du jour photographié (photo + thème + note), bouton **Modifier** (remplacer la photo, éditer la note), et annonce du prochain thème débloqué.
- Édition après coup : toujours possible depuis la galerie ; remplacer la photo supprime l'ancienne du store.

### 3. Galerie

- Grille des jours photographiés, **du plus récent au plus ancien**.
- Chaque tuile : photo (miniature), numéro du jour, thème.
- Clic sur une tuile → **vue détail plein écran** : photo, jour, thème, note, date de prise de vue, bouton **Modifier** (rouvre le flux d'édition : nouvelle photo + note).
- Si la galerie est vide : message d'invitation à prendre la première photo.

### 4. Export / Import JSON

- **Export** : télécharge `stamps365-export-YYYY-MM-DD.json` — toutes les entrées, photos converties en base64, format versionné (`"version": 1`).
- **Import** : sélection du fichier → validation stricte (JSON, version, structure de chaque entrée, en-tête JPEG des photos) → confirmation « Remplacer les X entrées actuelles par les Y entrées du fichier ? » → remplacement complet en transaction atomique (sémantique : remplacer, pas fusionner).
- Indispensable : vider les données du navigateur efface les photos. Exporter régulièrement.

### 5. PWA

- Manifest complet (nom, icônes 192/512 + maskable, standalone, thème), généré par `vite-plugin-pwa`.
- Service worker : app shell en cache (démarrage offline).
- Installable depuis Chrome/Safari (« Ajouter à l'écran d'accueil »).
- **Interface en français**.

## Direction artistique (inspirée de Pocket Love, HyperBeard)

Univers cozy « maison de poupée » en pastel — l'app étant un album photo de souvenirs, l'analogie avec l'album de souvenirs de Pocket Love est directe.

**Palette** (crème + bonbon, texte brun cacao — jamais de gris anthracite) :

| Usage | Couleur |
|---|---|
| Fond | `#FDF3E7` (crème chaud) |
| Texte | `#5C4033` (brun cacao) |
| Texte secondaire | `#A38B78` |
| Primaire | `#F27E9D` (rose bonbon) · foncé `#E05C80` · profond `#D14A6E` (bords de boutons) |
| Primaire doux | `#FFE3EC` (badges, fonds actifs) |
| Accents pastel | menthe `#9ED9C5` (annonces), bleu ciel `#A5D8F3` (dates), beurre `#FFE38F` (célébrations) |
| Cartes | `#FFFDF9` avec bordure 3 px `#F0D9C8` (profonde `#E3BFA6` pour les ombres de boutons) |
| Erreur | `#E85D5D` |

**Typographie** : Fredoka (titres, boutons, badges — ronde et joueuse) + Nunito (corps — ronde et lisible), servies via `@fontsource` (pattern mymap).

**Composants** :
- **Boutons bonbon** : fond plein, coins pilule, bord inférieur épais (`box-shadow: 0 4px 0`) ; `:active` enfonce le bouton (`translateY` + ombre réduite).
- **Cartes sticker** : fond clair, bordure 3 px, coins 16-24 px, ombre douce.
- **Fond à pois pastel** discrets (double `radial-gradient` CSS rose/menthe).
- **Motif cœur** : icône de l'app, progression des jours, badge du titre « Jour N ».
- Grande pastille ronde pour le bouton photo ; bulles pastel pour les informations (thème suivant = menthe, date = ciel, félicitations = beurre).

**PWA** : `theme_color` rose `#F27E9D`, `background_color` crème `#FDF3E7`, icône = cœur bonbon à contour cacao sur fond crème.

## Modèle de données

IndexedDB : base `stamps365`, version 1, store `days` (keyPath `dayNumber`).

```ts
interface DayPhoto {
  id: string;        // crypto.randomUUID()
  blob: Blob;        // JPEG compressé
}

interface DayEntry {
  dayNumber: number;   // 1..N — attribué à la validation = max existant + 1
  theme: string;       // thème figé au moment de la validation
  photo: DayPhoto;
  note?: string;       // texte libre optionnel
  takenAt: number;     // Date.now() à la validation
  updatedAt: number;   // mis à jour à chaque modification
}
```

Règle d'attribution du `dayNumber` : `(max dayNumber existant) + 1`, ou `1` si le store est vide. Jamais de réattribution ni de renumérotation.

## Traitement des photos

Réutilisation du module `photoUtils` de mymap :

- Compression via `createImageBitmap` + canvas → JPEG qualité 0.85.
- Taille cible : bord le plus long à 1600 px max, ratio préservé (`computeTargetDimensions`).
- Échec de compression (fichier illisible, canvas indisponible) → erreur explicite, **aucune entrée créée**.

## Chargement et validation de `themes.json`

- Fetch de `themes.json` au démarrage (runtime, pas d'import statique — le fichier reste remplaçable sans rebuild).
- Validation : JSON parsable, tableau, chaque élément une chaîne non vide après trim, au moins 1 élément.
- Fichier invalide → écran d'erreur clair expliquant le format attendu et le chemin du fichier. Aucune fonctionnalité accessible tant que les thèmes ne chargent pas.

## Architecture technique

Clone structurel de mymap (stack et patterns prouvés, domaine métier neuf) :

- **Stack** : Vite · React 19 · TypeScript strict · `idb` · `vite-plugin-pwa` · Vitest + Testing Library (`jsdom`, `fake-indexeddb`) · ESLint (flat config, `typescript-eslint`, `react-hooks`, `react-refresh`).
- **Modules logiques purs et testables** :
  - `src/types.ts` — types du domaine (`DayEntry`, `DayPhoto`).
  - `src/themes.ts` — fetch + validation de `themes.json`, calcul du thème courant.
  - `src/db.ts` — store IndexedDB (`listDays`, `saveDay`, `deleteDay`, `replaceAllDays`).
  - `src/photoUtils.ts` — compression (copie de mymap).
  - `src/exportImport.ts` — export/import JSON versionné avec validation stricte.
- **Composants UI pilotés par props** : `TodayView` (thème du jour + flux photo), `GalleryView` (grille), `DayDetail` (plein écran + édition), `Toolbar` (onglets + export/import), assemblés dans un `App.tsx` fin.
- **Pas de routeur** : deux onglets + vue détail gérés par l'état React (comme mymap).

## Tests

- **Logique pure** : validation de `themes.json` (valides, invalides, vides), calcul du thème courant, attribution du `dayNumber`, dimensions cibles de compression, export/import (fichier valide, corrompu, version inconnue, photo non-JPEG).
- **Store** : cycle complet avec `fake-indexeddb` (save, list triée, replace atomique).
- **Composants** : flux photo → note → validation → thème suivant débloqué ; reprise avant validation ; modification après validation ; galerie triée récent→ancien ; détail + édition ; export/import boutons.

## Déploiement

1. Repo GitHub `365-stamps`, branche `main`, `vite.config.ts` avec `base: '/365-stamps/'`.
2. Workflow GitHub Actions (copie de mymap) : build Node 24 → `actions/deploy-pages`, déclenché sur push `main` + `workflow_dispatch`.
3. Pages activé sur la branche `gh-pages` gérée par Actions.

## Non-objectifs (explicitement hors scope)

- Aucun compte utilisateur, aucun serveur, aucune synchronisation cloud
- Aucun partage de photos ou d'entrées
- Pas de mécanique de révision type Anki (rappels espacés) — la galerie sert de re-visite
- Pas de notifications / rappels
- Pas de multi-photo par jour
- Pas de statistiques ni de séries (streaks)
- Pas d'ajout rétroactif de jours manqués (le concept même est « pas de jour raté »)
