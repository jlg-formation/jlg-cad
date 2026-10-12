# JLG CAD

Prototype de dessin 2D local, en Bun + TypeScript + React. Aucun serveur de données.

Les [personas et principes UX](docs/personas.md) décrivent les utilisateurs de référence, avec l’architecte et architecte du patrimoine comme destinataire prioritaire.

L’objectif produit principal est de remplacer AutoCAD dans son travail quotidien pour supprimer le coût de ses licences, tout en permettant de recevoir et d’envoyer des fichiers AutoCAD : **DWG en priorité, DXF à défaut**. Cet objectif dépasse les capacités actuelles du prototype ; voir la documentation UX pour distinguer les besoins des fonctions disponibles.

## Démarrer

```sh
bun install
bun run dev
```

Ouvrir http://127.0.0.1:5173/jlg-cad/. `bun run build` produit le site dans `dist` ; `bun run preview` permet de le consulter.

## Déploiement

Le site est publié sur https://jlg-formation.github.io/jlg-cad/ par GitHub Actions à chaque push sur `main`. Le workflow installe les dépendances verrouillées avec Bun, exécute les tests, compile puis déploie `dist` sur GitHub Pages. Dans les réglages Pages du dépôt, la source doit être GitHub Actions.

## Utilisation

- Le titre de l’onglet et l’en-tête affichent le nom réel du fichier ouvert ou enregistré, ou « nouveau fichier ». Un astérisque indique des modifications non enregistrées dans un fichier ; la sauvegarde de session conserve le nom et cet état au rechargement. Le nom est tronqué au besoin dans l’en-tête, visible en entier au survol, et masqué sur petit écran.
- Le menu **Fichier** regroupe Nouveau, Ouvrir, Sauvegarder et les exports DXF/PDF. Nouveau propose de télécharger une sauvegarde avant de remplacer un dessin non sauvegardé.
- Le menu **Aide** contient le guide de démarrage, les outils d’architecture, l’espace papier, les formats et **Raccourcis clavier…** (F1).
- Dans cette fenêtre, cliquer une combinaison puis taper le nouveau raccourci. Les conflits sont signalés ; on peut ajouter ou retirer des combinaisons et rétablir les valeurs par défaut. Les préférences sont enregistrées dans `localStorage`, séparément des dessins, et survivent aux rafraîchissements. Les menus et infobulles reflètent les changements. Certaines combinaisons du navigateur/système sont refusées.
- **Ctrl+Y** et **Ctrl+Maj+Z** rétablissent une action annulée. Les raccourcis indiqués ci-dessous sont les valeurs par défaut ; les champs texte conservent leurs commandes d’édition habituelles.

- L’en-tête regroupe les outils de création, d’édition, puis Sélection (V) et Déplacement de vue (H). La barre verticale de gauche et les coordonnées XY de la barre de statut ont été retirées. Ligne (L), rectangle (R ou REC), cercle (C).
- Rectangle : cliquer le premier coin donne automatiquement le focus au champ **Largeur** ; saisir la largeur, **Tab**, la hauteur puis **Entrée**. On peut aussi déplacer la souris et cliquer le second coin, ou saisir `@120,80` / `120;80` dans la ligne de commande. Les dimensions utilisent l’unité active, avec possibilité de préciser une unité explicite. Pour un cercle : **C puis Entrée**, cliquer le centre, saisir le rayon puis **Entrée**, ou cliquer un point sur la circonférence. Le rayon utilise l’unité active et accepte un suffixe explicite.
- Pour modifier un cercle sélectionné, cliquer l’un des quatre grips de rayon : un champ apparaît près du grip avec la valeur sélectionnée et le focus actif. Taper le nouveau rayon puis **Entrée** ; **Échap** ferme le champ sans modifier le cercle. La poignée centrale déplace le cercle.
- Sélectionner une forme puis glisser pour la déplacer ; Suppr pour l’effacer. Maj+clic ajoute ou retire un objet de la sélection.
- Avec l’outil Sélection, glisser depuis une zone vide trace un cadre : gauche vers droite, bleu, sélectionne les objets entièrement contenus ; droite vers gauche, vert pointillé, sélectionne ceux touchés ou contenus. Maj ajoute à la sélection et Échap annule le geste. Les objets masqués sont exclus ; les objets verrouillés restent sélectionnables et protégés.
- Dans **Paramètres**, les sélections bleue et verte ont chacune un toggle, activé par défaut. **Mode lasso**, désactivé par défaut, remplace le rectangle par un contour libre : sens horaire = bleu, antihoraire = vert. Le contour se ferme au relâchement ; un tracé croisé ou trop petit est refusé. Ces préférences sont mémorisées pour le site.
- **Ctrl+C / Ctrl+V** copie les objets de l’espace Objet via le presse-papiers système, y compris entre onglets et domaines différents. Après collage, déplacer le pointeur puis cliquer pour placer l’ensemble ; Échap annule et Ctrl+Z annule le collage entier. Le point d’insertion est le coin supérieur gauche de l’enveloppe géométrique. Les champs texte gardent leur copier-coller habituel.
- Les couleurs, dimensions, arcs, poignées Bézier et cotations sont conservés. Les calques compatibles sont réutilisés ; un conflit de couleur, visibilité ou verrouillage crée un calque distinct, visible et déverrouillé. Les textes papier et fenêtres de vue ne sont pas transférés.
- Chaque nouvel onglet ouvre un dessin vide et possède sa propre sauvegarde de session. Recharger un onglet restaure son dessin ; les autres onglets restent indépendants, y compris lorsqu’un onglet est dupliqué. Les préférences restent communes au site. Téléchargez un fichier `.jlgcad` pour conserver votre travail après la fermeture de la session.
- Molette pour zoomer autour du pointeur ; bouton de cadrage pour afficher tout le dessin.
- Grille et aimantation de 10 mm activables, couleurs, liste et dimensions des objets.
- Ctrl+Z / Ctrl+Maj+Z pour annuler/rétablir ; Échap pour quitter un outil en conservant le travail construit. Les polylignes et Bézier avec au moins deux points confirmés sont terminées en contours ouverts, sans ajouter le point d’aperçu au pointeur. Une forme valide en cours de glissement est conservée ; les constructions insuffisantes et les transformations sans destination confirmée sont abandonnées. Ctrl+Z annule ensuite l’objet créé.
- Dans l’espace objet, Ctrl+A sélectionne tous les objets, puis Suppr efface la sélection en une opération annulable. Les objets verrouillés restent protégés. Dans un champ texte, Ctrl+A sélectionne le texte.
- Sauvegarder (Ctrl+S) télécharge un `.jlgcad` JSON versionné ; Ouvrir recharge ce format.
- Une copie est automatiquement conservée dans le stockage de session de chaque onglet.

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

- **Décalage (O)** : sélectionner une ligne ou un contour, saisir par exemple `10 cm`, puis cliquer du côté voulu. L’original reste en place.
- **Ajuster (X)** : cliquer le morceau à supprimer entre les intersections. La prévisualisation indique la partie retirée. Les formes visibles servent de limites ; on peut aussi choisir les limites puis valider avec Entrée. Répéter les clics pour nettoyer le plan.
- **Prolonger (E)** atteint la première limite du côté de l’extrémité choisie. **Raccorder** ajuste deux lignes droites à leur intersection, avec un rayon nul.
- **Copier**, **Déplacer (M)**, **Rotation** et **Miroir** utilisent un objet sélectionné et des points de référence. Copier/déplacer disposent aussi de déplacements X/Y saisis ; une rotation saisie utilise le centre choisi ou le premier point de l’objet.
- Les distances acceptent `mm`, `cm`, `m`, les valeurs signées et les virgules décimales. Sans unité, une valeur est en millimètres.
- Longueur et angle précis contraignent les lignes et segments de polyligne. **F8** active l’orthogonal ; le guidage polaire propose 15°, 30°, 45° ou 90°. Les accrochages reconnaissent extrémités, milieux, centres et intersections.
- **Polyligne (P)** : cliquer les sommets, choisir Ligne ou Arc circulaire pour le prochain segment, puis Entrée ou Terminer. Le contour peut être fermé. Les propriétés permettent de déplacer, insérer et supprimer les sommets et de modifier les arcs.
- **Bézier (B)** : cliquer les points de passage, puis terminer. Les sommets et poignées se déplacent dans le dessin ou par coordonnées. Les poignées peuvent être alignées et un sommet peut être lissé.
- **Mesurer** affiche distance, écarts X/Y et angle. **Cotation (D)** prend deux points puis la position de la cote ; régler hauteur imprimée et échelle prévue. Les cotes mesurent leurs propres points et ne suivent pas automatiquement les modifications d’un mur.
- Les **calques** proposent visibilité, verrouillage, couleur, renommage et ajout. Le verrouillage protège les modifications géométriques ; les calques masqués sont exclus des fenêtres et exports PDF/DXF.

Les décalages des lignes et arcs sont géométriques. Un décalage de Bézier produit une polyligne approchée à 0,1 mm ; ses intersections utilisent une approximation de 0,05 mm. Les décalages qui écrasent ou croisent un contour sont refusés. Raccords arrondis, blocs et cotations associatives restent à développer.

Voir le [guide des commandes, unités et poignées](docs/drafting.md) pour la saisie dynamique et les modifications par points remarquables.

Les nouvelles cotations de diamètre (DIAMÈTRE / DDI puis Entrée) suivent le rayon et le centre du cercle. Le fichier natif version 4 conserve cette liaison ; copier le cercle et sa cote ensemble la recrée pour les copies, et supprimer le cercle retire ses cotations liées en une action annulable. Les anciennes cotations restent indépendantes.
