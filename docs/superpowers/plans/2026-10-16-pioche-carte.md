# 365 Stamps — Plan d'implémentation : pioche du jour et carte à retourner

Date : 2026-10-16
Spec : `docs/superpowers/specs/2026-10-16-pioche-carte-design.md`
Statut : exécuté (TDD, branche `feat/pioche-carte`)

## Task 1 — Module `src/dailyTheme.ts`

- `remainingThemes(themes, used)` : diff multicollection (une occurrence retirée par entrée).
- `drawTheme(candidates, exclude?)` : tirage aléatoire, `null` si épuisé.
- `loadDailyDraw(dayNumber)` / `saveDailyDraw(dayNumber, theme)` : localStorage `stamps365-draw`, JSON `{dayNumber, theme}`, erreurs avalées.
- Tests `src/dailyTheme.test.ts` : 13 cas (multicollection, exclusion, épuisement, roundtrip, jour périmé, JSON invalide, localStorage en échec).

## Task 2 — `TodayView` : flip, reroll, « Jour suivant »

- Props : `+canReroll`, `+onRerollTheme`.
- État `revealed` ; reset au changement de `dayNumber` (pattern « adjust state during render », pas d'effet) et au clic « Jour suivant ».
- Header pill sorti de la carte ; carte flip 3D deux faces (`.flip-card__inner` grid + `preserve-3d` + `backface-visibility`) ; dos cliquable « Découvrir le thème » ; face inactive `aria-hidden` + `inert` + `pointer-events: none`.
- Re-tirage : `handleReroll` → face cachée 400 ms → `onRerollTheme()` → re-révélation (timer nettoyé à l'unmont).
- Panneau de succès : pill « Un nouveau thème t'attend » (zéro spoiler), bouton « Jour suivant ».
- CSS : perspective, transition 0,6 s, motif pois/cœurs pastel, `prefers-reduced-motion`.

## Task 3 — `App` : wiring de la pioche

- Imports `dailyTheme` ; état `dailyDraw` ; `usedThemes`/`remaining` en `useMemo`.
- Effet : pioche absente/périmée → `loadDailyDraw` → validation (jour + appartenance au paquet) → sinon `drawTheme` + `saveDailyDraw` (justification `set-state-in-effect` documentée).
- `currentTheme` dérivé de `dailyDraw` ; `canReroll` = au moins un autre thème dans le paquet ; `handleRerollTheme` repioche en excluant le courant ; `handleComplete` refuse un thème vide.
- `entry.theme` enregistre le thème tiré (inchangé côté modèle).

## Task 4 — Docs, vérification, déploiement

- README : points clés (pioche, carte, zéro spoiler), note `localStorage` `stamps365-draw`.
- Spec + plan datés (ce document).
- Vérifications : `npm test` (93 tests), `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- Merge `main` → push → déploiement GitHub Pages auto → vérification live.
