# 365 Stamps — Une photo par jour

Application web installable (PWA) de défi photo personnel : chaque jour un thème, une photo qui s'y lie, une note optionnelle. La progression est sans pression — le thème suivant n'est débloqué que lorsque la photo du thème en cours est prise.

## Points clés

- **Tes données restent avec toi** : les photos sont stockées dans ton navigateur (IndexedDB) et ne sont jamais envoyées nulle part. Le projet est partageable, tes photos non.
- **Pioche du jour** : chaque jour, l'app tire au hasard un thème pas encore photographié dans `public/themes.json` (le paquet de cartes) — remplace son contenu par ta propre liste (tableau JSON de chaînes non vides), aucun code à changer. Le nombre de thèmes définit la durée du défi.
- **Carte à retourner** : le thème du jour reste masqué derrière une carte ; retourne-la pour le découvrir. Pas envie du thème ? **Changer le thème** repioche (illimité, avant la photo) — le thème écarté reste dans le paquet.
- **Pas de jour raté** : tu avances au jour suivant seulement quand tu as pris la photo du thème en cours.
- **Zéro spoiler** : après validation, le prochain thème n'est jamais affiché — il attend sa carte.
- **Thème figé** : chaque photo garde le thème du moment où elle a été prise ; modifier `themes.json` ne réécrit pas l'histoire.
- **Export / import JSON** pour sauvegarder ou transférer tes photos sur un autre appareil.
- Installable sur mobile (PWA), fonctionne hors-ligne.

## Démarrage

```bash
npm install
npm run dev
```

## Scripts

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production (vérification TypeScript incluse) |
| `npm run preview` | Prévisualiser le build |
| `npm run test` | Lancer les tests (Vitest) |
| `npm run lint` | Linter le code (ESLint) |
| `npm run icons` | Régénérer les icônes PWA |

## Où sont mes données ?

Dans le stockage IndexedDB **de ton navigateur**, base `stamps365`. Elles ne quittent jamais ta machine sauf export explicite. La pioche du jour (thème tiré non encore validé) est mémorisée dans `localStorage` (clé `stamps365-draw`) pour rester stable durant la journée.

Pour les sauvegarder ou les transférer : bouton **⬇️** (export : télécharge un JSON avec tes photos) puis **⬆️** (import) sur l'autre appareil.

⚠️ Vider les données du navigateur efface tes photos : pense à exporter régulièrement.

## Installer l'app

- **iOS Safari** : Partager → « Sur l'écran d'accueil »
- **Android Chrome** : menu → « Installer l'application »

## Déploiement (GitHub Pages)

1. Repo GitHub nommé `365-stamps`, branche `main` (le `base` de `vite.config.ts` dépend du nom du repo).
2. Le workflow `.github/workflows/deploy.yml` build et publie automatiquement à chaque push sur `main`.
3. Dans les réglages du repo : Settings → Pages → Source « GitHub Actions ».

## Remplacer les thèmes

Édite `public/themes.json` :

```json
["Rouge", "Eau", "Matin", "..."]
```

- un tableau JSON de chaînes non vides ;
- le nombre de thèmes = la durée du défi ;
- commit + push : le site se redéploie automatiquement.
