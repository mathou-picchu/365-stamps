# 365 Stamps — Spécification : pioche du jour et carte à retourner

Date : 2026-10-16
Statut : implémenté (branche `feat/pioche-carte`)

## Contexte

Le thème du jour était déterminé par la position dans `themes.json` (jour N = N-ième thème), affiché en clair dès l'ouverture de l'écran, et le panneau de validation spoilait le thème suivant (« Prochain thème : … »).

## Objectifs

1. **Pioche aléatoire** : chaque jour tire au hasard un thème pas encore photographié (paquet de cartes), au lieu de suivre l'ordre de la liste.
2. **Découverte** : le thème est masqué derrière une carte qui se retourne au clic.
3. **Changer le thème** : possibilité de repiocher avant de prendre la photo.
4. **Zéro spoiler** : après validation, le thème du jour suivant n'est jamais affiché ; le bouton « Continuer » devient « Jour suivant ».

## Comportement

### Pioche du jour

- Paquet = multicollection de `themes.json` moins les thèmes des entrées validées (les doublons de la liste — « Ton choix » ×28, « Une chute surprise » ×17 — sont des occurrences distinctes).
- Le tirage du jour est mémorisé dans `localStorage` (clé `stamps365-draw`, `{dayNumber, theme}`) : réouvrir l'app dans la journée redonne le même thème, carte face cachée (le rituel de découverte est rejoué, pas le tirage).
- Garde-fous : la pioche stockée est ignorée si son `dayNumber` ≠ jour en cours (validation, import) ou si son thème n'est plus dans le paquet → nouveau tirage. `localStorage` indisponible → pioche en mémoire (dégradé, fonctionnel).
- Couverture garantie : chaque validation consomme exactement une occurrence (`entry.theme` est figé à la validation) → aucun doublon possible, tous les thèmes sont photographiés.

### Changer le thème

- Disponible après retournement, avant la photo, illimité.
- Repioche au hasard dans le paquet en excluant le thème affiché (jamais le même deux fois de suite) ; masqué si le paquet ne contient plus que le thème courant.
- Le thème écarté reste dans le paquet (aucune occurrence perdue).
- Interaction : la carte se re-retourne (face cachée ~400 ms) puis révèle le nouveau tirage.

### Écran Aujourd'hui

- Au-dessus de la carte : pill « Jour N · ❤ X / total » (toujours visible).
- Carte flip 3D : dos = motif pois, cœurs pastel, gros « ? », libellé « Découvrir le thème » (tout le dos est un bouton) ; face avant = thème + « Prendre la photo » + « Changer le thème », puis aperçu/note/valider sans re-flip.
- Accessibilité : la face inactive porte `aria-hidden` + `inert` (pas de spoiler lecteur d'écran, pas de focus dans la face cachée) ; `prefers-reduced-motion` désactive l'animation.
- Nouveau jour (validation, import) : carte face cachée, brouillon et note remis à zéro.

### Après validation

- Ligne « Prochain thème : … » supprimée → pill « Un nouveau thème t'attend » (sans révélation).
- Bouton « Jour suivant » (au lieu de « Continuer ») → nouvelle carte face cachée pour le jour N+1. Dernier jour → « Défi terminé — bravo ! » puis écran de fin existant.

## Architecture

- `src/dailyTheme.ts` : `remainingThemes(themes, used)` (diff multicollection), `drawTheme(candidates, exclude?)` (null si épuisé), `loadDailyDraw(dayNumber)` / `saveDailyDraw(dayNumber, theme)` (try/catch).
- `App.tsx` : détient la pioche du jour (état + persistance), calcule `canReroll`, passe `theme` et `onRerollTheme` à `TodayView`. L'entrée validée enregistre le thème tiré.
- `TodayView.tsx/.css` : état `revealed` (reset au changement de jour via « adjust state during render »), structure flip deux faces, re-flip au re-tirage.
- `DayDetail`, galerie, export/import : inchangés.

## Limites acceptées

- Modifier `themes.json` en cours de défi ne revalide pas les tirages passés (comportement « thème figé » existant).
- La face arrière de la carte s'adapte à la hauteur de la face avant (aperçu photo) : la carte grandit pendant l'animation — accepté.
