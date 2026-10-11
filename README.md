# JLG CAD

Prototype de dessin 2D local, en Bun + TypeScript + React. Aucun serveur de données.

## Démarrer

```sh
bun install
bun run dev
```

Ouvrir http://127.0.0.1:5173/jlg-cad/. `bun run build` produit le site dans `dist` ; `bun run preview` permet de le consulter.

## Déploiement

Le site est publié sur https://jlg-formation.github.io/jlg-cad/ par GitHub Actions à chaque push sur `main`. Le workflow installe les dépendances verrouillées avec Bun, exécute les tests, compile puis déploie `dist` sur GitHub Pages. Dans les réglages Pages du dépôt, la source doit être GitHub Actions.

## Utilisation

- Sélection (V), ligne (L), rectangle (R), cercle (C), déplacement de la vue (H).
- Glisser pour dessiner. Pour un cercle, partir du centre et glisser jusqu’au rayon.
- Sélectionner une forme puis glisser pour la déplacer ; Suppr pour l’effacer.
- Molette pour zoomer autour du pointeur ; bouton de cadrage pour afficher tout le dessin.
- Grille et aimantation de 10 mm activables, couleurs, liste et dimensions des objets.
- Ctrl+Z / Ctrl+Maj+Z pour annuler/rétablir ; Échap pour quitter un outil.
- Sauvegarder (Ctrl+S) télécharge un `.jlgcad` JSON versionné ; Ouvrir recharge ce format.
- Une copie est automatiquement conservée dans le stockage local du navigateur.

## Formats et limites

Le format natif conserve les coordonnées, couleurs et types des formes. Les unités du projet sont des millimètres. L’écran utilise Y vers le bas ; l’export inverse Y pour les coordonnées CAD.

L’export DXF ASCII R12 contient des LINE et CIRCLE ; les rectangles sont exportés en quatre lignes. Une unité DXF représente un millimètre (configurer cette unité à l’import, le R12 ne transporte pas ici les métadonnées d’unité). Les couleurs ne sont pas exportées. Il n’y a pas d’import DXF/DWG, ni de 3D, de cotations ou de calques dans ce MVP.

Le DWG direct n’est pas implémenté. Autodesk propose [RealDWG](https://forge.autodesk.com/developer/overview/realdwg-api), avec des API C++/.NET : cela nécessite une intégration distincte. Un DXF peut être ouvert puis sauvegardé en DWG avec AutoCAD ([documentation Autodesk](https://help.autodesk.com/cloudhelp/2023/ENU/AutoCAD-LT/files/GUID-11AEFE3C-D05A-45C3-8604-7B6A594440F3.htm)).

## Vérification

`bun test` vérifie le format natif et l’export. `bun run build` vérifie TypeScript et produit le bundle.
