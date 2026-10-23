# Béroueizh — GIF météo

Création de GIF des phénomènes météo avec une carte Earth Nullschool, une période et un cadrage au choix.

- Ouverture à l’heure courante, arrondie à l’heure entière, avec les vents de surface et le cadrage par défaut conservés.
- **Instant Normand** revient à l’heure courante et prépare une période de 24 heures.
- Dates, chronologie et horodatage du GIF en **heure de Paris**, avec gestion automatique de l’heure d’été et d’hiver.
- Raccourcis de fin **+12 h, +24 h, +36 h, +48 h et +72 h**, calculés depuis le début en heures réellement écoulées.
- Pas de 1, 2, 3, 6, 12 ou 24 heures ; attente supplémentaire réglable de 1 à 60 secondes après chargement des données.
- **Partager** produit un lien qui restitue la carte, le cadrage, le repère, les dates et tous les réglages d’export. Aucun GIF n’est envoyé automatiquement.
- Capture directe des couches de la carte, sans partage d’écran, et téléchargement du GIF encodé dans le navigateur.

Le menu « earth » reste utilisable dans la frame. La fréquence réelle des données dépend de la couche : plusieurs échéances peuvent utiliser les mêmes fichiers, notamment les vagues et les courants. Le moteur Nullschool conserve son fonctionnement interne en UTC ; la conversion pour l’utilisateur est faite en Europe/Paris.

Lors du retour à l’heure d’hiver, une saisie manuelle de l’heure répétée désigne sa première occurrence. Les raccourcis et les liens partagés préservent l’instant exact, y compris sa seconde occurrence.

## Développement

Node.js 22.13 ou supérieur.

```sh
npm run install:ci
npm run dev
```

Construction : `npm run build`.

## Architecture et publication

- `app/studio.html` : interface compacte.
- `public/app.js` : commandes, aperçu, capture et partage.
- `public/core.mjs` : paramètres des cartes et plan d’export, en instants UTC.
- `public/time-config.mjs` : heure de Paris, changements d’heure et liens de configuration.
- `public/map-controller.mjs` : changement des échéances et contrôle du chargement.
- `public/map-capture.mjs` : composition des couches natives dans leur ordre d’affichage.
- `app/earth-data/[host]/[...path]/route.ts` : relais des données publiques Nullschool, limité aux hôtes gaia, atlas, terra1 et pangaea ; aucun cookie ni en-tête d’identité du visiteur n’est transmis.

Dépôt : https://github.com/philippejacquet0-source/science009

Page statique : https://philippejacquet0-source.github.io/science009/

Application et relais météo : https://meteo-gif.philippe0.chatgpt.site

`npm run build:pages` génère le dossier statique `docs/` sans compilation serveur ni dépendance à installer. GitHub Pages publie la branche `main`, dossier `/docs`. Après une modification, régénérer ce dossier et commiter son contenu.

La page, la carte, les réglages et l’encodage GIF fonctionnent dans le navigateur. Les données météo passent par le relais public existant sur Sites, car leurs serveurs d’origine ne permettent pas directement les lectures depuis GitHub Pages. Ce relais doit rester disponible ; il autorise les lectures CORS publiques sans cookies ni identification. Les URL de données sont adaptées uniquement dans les copies générées, afin de conserver la version Sites.

## Validation

```sh
node --test tests/*.test.mjs
node --check public/app.js
npm run build
```

Les tests couvrent le plan d’export, les limites de mémoire, les pas horaires, les changements d’heure de Paris et l’aller-retour des configurations partagées.

## Sources et notices

Le moteur public Earth Nullschool, ses géométries et les notices de licence sont conservés dans `public/earth`. Les adaptations locales concernent les adresses de téléchargement, la synchronisation du curseur dans la frame, un témoin de l’instant accepté et la conservation des buffers WebGL pour l’export. Les notices de l’encodeur GIF sont dans `public/vendor`.

Le nom est une création mêlant les sonorités de la **bérouée** (brouillard humide dans le Bocage virois) et de **Breizh**. Référence normande : https://www.paysdevire-normandie-tourisme.fr/les-bases-du-patois-normand/
