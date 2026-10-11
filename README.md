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

Le format natif version 2 conserve le dessin et toutes les présentations. Les anciens fichiers version 1 sont migrés à l’ouverture. Les unités du projet sont des millimètres. L’écran utilise Y vers le bas ; l’export DXF inverse Y pour les coordonnées CAD.

## Espace papier et PDF

- L’onglet **Objet** contient le dessin commun à toutes les vues. **+ Présentation** crée une feuille vide, sans fenêtre imposée.
- Chaque présentation se renomme et dispose d’un format A4/A3, portrait/paysage, et d’un mode noir et blanc ou couleur. Cliquer dans une zone vide du papier affiche ses réglages.
- L’outil **Fenêtre de vue (F)** permet de tracer plusieurs fenêtres rectangulaires. Elles affichent le même dessin avec un cadrage et une échelle indépendants.
- Sélectionner une fenêtre permet de régler position, dimensions, échelle `1:N`, centre, verrouillage et impression du cadre. Une poignée déplace le coin opposé pour redimensionner le cadre ; **Cadrer les objets** ajuste la vue au dessin.
- Double-cliquer dans une fenêtre active l’édition du dessin partagé. **H** ou le bouton du milieu déplace son cadrage, la molette ajuste son échelle. Le verrouillage bloque ces deux actions sans empêcher de modifier le dessin.
- Double-cliquer hors des fenêtres, appuyer sur Échap ou choisir **Revenir au papier** réactive l’espace papier.
- Dans le papier : lignes, rectangles, cercles et **Texte (T)**. Cliquer avec l’outil Texte crée une annotation dont le contenu multiligne et la taille se modifient dans les propriétés. La taille typographique est exprimée en mm papier ; elle ne dépend pas de l’échelle des fenêtres.
- **Ajouter un cartouche** ajoute un cadre et deux textes indépendants, éditables comme les autres objets papier.
- **PDF** exporte la présentation active ; **PDF de toutes les présentations** produit un document multipage, y compris les feuilles sans fenêtre. Les formes sont vectorielles et découpées aux limites de chaque fenêtre et de la feuille. Les aides visuelles et les cadres non imprimables sont exclus.
- Imprimer le PDF à **100 % / taille réelle**, sans ajustement automatique, pour respecter les échelles.
- L’annulation/rétablissement couvre le dessin, les objets papier et les paramètres des présentations. La sauvegarde `.jlgcad` et le stockage local conservent l’ensemble.

L’export DXF ASCII R12 contient le dessin objet uniquement, avec des LINE et CIRCLE ; les rectangles sont exportés en quatre lignes. Une unité DXF représente un millimètre (configurer cette unité à l’import, le R12 ne transporte pas ici les métadonnées d’unité). Les couleurs et présentations ne sont pas exportées en DXF. Il n’y a pas d’import DXF/DWG, ni de 3D, de cotations ou de calques dans ce MVP. Les fenêtres sont rectangulaires sans rotation. Le texte PDF utilise Helvetica avec les caractères latins usuels ; les alphabets complexes et les emoji ne sont pas encore pris en charge. La marge pointillée de 5 mm est un repère visuel, pas une limite d’imprimante.

Le DWG direct n’est pas implémenté. Autodesk propose [RealDWG](https://forge.autodesk.com/developer/overview/realdwg-api), avec des API C++/.NET : cela nécessite une intégration distincte. Un DXF peut être ouvert puis sauvegardé en DWG avec AutoCAD ([documentation Autodesk](https://help.autodesk.com/cloudhelp/2023/ENU/AutoCAD-LT/files/GUID-11AEFE3C-D05A-45C3-8604-7B6A594440F3.htm)).

## Vérification

`bun test` vérifie le format natif et l’export. `bun run build` vérifie TypeScript et produit le bundle.
