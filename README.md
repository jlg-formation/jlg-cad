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

- Le menu **Fichier** regroupe Nouveau, Ouvrir, Sauvegarder et les exports DXF/PDF. Nouveau propose de télécharger une sauvegarde avant de remplacer un dessin non sauvegardé.
- Le menu **Aide** contient le guide de démarrage, les outils d’architecture, l’espace papier, les formats et **Raccourcis clavier…** (F1).
- Dans cette fenêtre, cliquer une combinaison puis taper le nouveau raccourci. Les conflits sont signalés ; on peut ajouter ou retirer des combinaisons et rétablir les valeurs par défaut. Les préférences sont enregistrées dans `localStorage`, séparément des dessins, et survivent aux rafraîchissements. Les menus et infobulles reflètent les changements. Certaines combinaisons du navigateur/système sont refusées.
- **Ctrl+Y** et **Ctrl+Maj+Z** rétablissent une action annulée. Les raccourcis indiqués ci-dessous sont les valeurs par défaut ; les champs texte conservent leurs commandes d’édition habituelles.

- Sélection (V), ligne (L), rectangle (R), cercle (C), déplacement de la vue (H).
- Glisser pour dessiner. Pour un cercle, partir du centre et glisser jusqu’au rayon.
- Sélectionner une forme puis glisser pour la déplacer ; Suppr pour l’effacer.
- Molette pour zoomer autour du pointeur ; bouton de cadrage pour afficher tout le dessin.
- Grille et aimantation de 10 mm activables, couleurs, liste et dimensions des objets.
- Ctrl+Z / Ctrl+Maj+Z pour annuler/rétablir ; Échap pour quitter un outil.
- Dans l’espace objet, Ctrl+A sélectionne tous les objets, puis Suppr efface la sélection en une opération annulable. Les objets verrouillés restent protégés. Dans un champ texte, Ctrl+A sélectionne le texte.
- Sauvegarder (Ctrl+S) télécharge un `.jlgcad` JSON versionné ; Ouvrir recharge ce format.
- Une copie est automatiquement conservée dans le stockage local du navigateur.

## Formats et limites

Le format natif version 3 conserve le dessin, les chemins, les cotations, les calques et les présentations. Les fichiers versions 1 et 2 sont migrés à l’ouverture. Les unités sont des millimètres. Les coordonnées affichées dans l’espace objet utilisent Y vers le haut, comme le DXF.

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

L’export DXF ASCII R12 contient le dessin objet visible, ses calques, des LINE, CIRCLE, POLYLINE et TEXT. Les rectangles deviennent quatre lignes ; les arcs de polyligne sont conservés et les Bézier sont approchées à 0,1 mm. Les cotes deviennent des lignes et textes. Une unité DXF représente un millimètre (configurer cette unité à l’import). Les couleurs individuelles et présentations ne sont pas exportées en DXF. Il n’y a pas d’import DXF/DWG ni de 3D. Les fenêtres sont rectangulaires sans rotation. Le texte PDF utilise Helvetica avec les caractères latins usuels ; les alphabets complexes et les emoji ne sont pas encore pris en charge. La marge pointillée de 5 mm est un repère visuel.

Le DWG direct n’est pas implémenté. Autodesk propose [RealDWG](https://forge.autodesk.com/developer/overview/realdwg-api), avec des API C++/.NET : cela nécessite une intégration distincte. Un DXF peut être ouvert puis sauvegardé en DWG avec AutoCAD ([documentation Autodesk](https://help.autodesk.com/cloudhelp/2023/ENU/AutoCAD-LT/files/GUID-11AEFE3C-D05A-45C3-8604-7B6A594440F3.htm)).

## Vérification

`bun test` vérifie le format natif et l’export. `bun run build` vérifie TypeScript et produit le bundle.

## Outils d’architecture

- **Décalage (O)** : sélectionner une ligne ou un contour, saisir par exemple `10 cm`, puis cliquer du côté voulu. L’original reste en place. **Mur (W)** crée directement deux faces à l’épaisseur saisie.
- **Ajuster (X)** : cliquer le morceau à supprimer entre les intersections. La prévisualisation indique la partie retirée. Les formes visibles servent de limites ; on peut aussi choisir les limites puis valider avec Entrée. Répéter les clics pour nettoyer le plan.
- **Prolonger (E)** atteint la première limite du côté de l’extrémité choisie. **Raccorder** ajuste deux lignes droites à leur intersection, avec un rayon nul.
- **Copier**, **Déplacer (M)**, **Rotation** et **Miroir** utilisent un objet sélectionné et des points de référence. Copier/déplacer disposent aussi de déplacements X/Y saisis ; une rotation saisie utilise le centre choisi ou le premier point de l’objet.
- Les distances acceptent `mm`, `cm`, `m`, les valeurs signées et les virgules décimales. Sans unité, une valeur est en millimètres.
- Longueur et angle précis contraignent les lignes et segments de polyligne. **F8** active l’orthogonal ; le guidage polaire propose 15°, 30°, 45° ou 90°. Les accrochages reconnaissent extrémités, milieux, centres et intersections.
- **Polyligne (P)** : cliquer les sommets, choisir Ligne ou Arc circulaire pour le prochain segment, puis Entrée ou Terminer. Le contour peut être fermé. Les propriétés permettent de déplacer, insérer et supprimer les sommets et de modifier les arcs.
- **Bézier (B)** : cliquer les points de passage, puis terminer. Les sommets et poignées se déplacent dans le dessin ou par coordonnées. Les poignées peuvent être alignées et un sommet peut être lissé.
- **Mesurer** affiche distance, écarts X/Y et angle. **Cotation (D)** prend deux points puis la position de la cote ; régler hauteur imprimée et échelle prévue. Les cotes mesurent leurs propres points et ne suivent pas automatiquement les modifications d’un mur.
- Les **calques** proposent visibilité, verrouillage, couleur, renommage et ajout. Le verrouillage protège les modifications géométriques ; les calques masqués sont exclus des fenêtres et exports PDF/DXF.

Les décalages des lignes et arcs sont géométriques. Un décalage de Bézier produit une polyligne approchée à 0,1 mm ; ses intersections utilisent une approximation de 0,05 mm. Les décalages qui écrasent ou croisent un contour sont refusés. Raccords arrondis, sélection multiple, blocs et cotations associatives restent à développer.
