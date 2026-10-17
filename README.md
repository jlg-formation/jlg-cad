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
- Sélectionner une forme puis glisser pour la déplacer ; Suppr pour l’effacer. Les clics successifs ajoutent les objets à la sélection ; Maj+clic retire un objet.
- Avec l’outil Sélection, maintenir le bouton gauche et glisser depuis une zone vide trace un lasso, validé au relâchement. Un clic suivi du relâchement démarre un rectangle : déplacer la souris puis cliquer le second coin pour valider, même sur un objet. Le clic bref (moins de 300 ms) reste prioritaire même si la souris bouge : le premier coin reste au point d’appui. Le lasso ou le rectangle glissé demande un appui maintenu au moins 300 ms et un déplacement de 4 pixels.
- Rectangle : gauche vers droite, bleu, objets entièrement contenus ; droite vers gauche, vert pointillé, objets touchés ou contenus. Pour le lasso, le mouvement initial fixe le mode bleu (droite) ou vert (gauche), conservé pendant tout le tracé. Un lasso croisé ou trop petit est refusé.
- Les sélections successives s’ajoutent ; Maj retire les objets visés. Échap annule le geste et restaure la sélection précédente. Les objets masqués sont exclus ; les objets verrouillés restent sélectionnables et protégés.
- Dans **Paramètres → Sélection**, le lasso est autorisé par défaut. Le désactiver permet de tracer un rectangle en maintenant le bouton ; le rectangle en deux clics reste disponible. Les sélections bleue et verte restent configurables. Les anciennes préférences sont migrées vers le lasso automatique ; les nouveaux choix sont mémorisés.
- **Ctrl+C / Ctrl+V** copie les objets de l’espace Objet via le presse-papiers système, y compris entre onglets et domaines différents. Après collage, déplacer le pointeur puis cliquer pour placer l’ensemble ; Échap annule et Ctrl+Z annule le collage entier. Le point d’insertion est le coin supérieur gauche de l’enveloppe géométrique. Les champs texte gardent leur copier-coller habituel.
- Les couleurs, dimensions, arcs, poignées Bézier et cotations sont conservés. Les calques compatibles sont réutilisés ; un conflit de couleur, visibilité ou verrouillage crée un calque distinct, visible et déverrouillé. Les textes papier et fenêtres de vue ne sont pas transférés.
- Chaque nouvel onglet ouvre un dessin vide et possède sa propre sauvegarde de session. Recharger un onglet restaure son dessin ; les autres onglets restent indépendants, y compris lorsqu’un onglet est dupliqué. Les préférences restent communes au site. Téléchargez un fichier `.jlgcad` pour conserver votre travail après la fermeture de la session.
- Molette pour zoomer autour du pointeur ; bouton de cadrage pour afficher tout le dessin.
- Grille et aimantation de 10 mm activables, couleurs, liste et dimensions des objets.
- Ctrl+Z / Ctrl+Maj+Z pour annuler/rétablir ; Échap pour quitter un outil en conservant le travail construit. Les polylignes et Bézier avec au moins deux points confirmés sont terminées en contours ouverts, sans ajouter le point d’aperçu au pointeur. Une forme valide en cours de glissement est conservée ; les constructions insuffisantes et les transformations sans destination confirmée sont abandonnées. Ctrl+Z annule ensuite l’objet créé.
- Dans l’espace objet, Ctrl+A sélectionne tous les objets, puis Suppr efface la sélection en une opération annulable. Les objets verrouillés restent protégés. Dans un champ texte, Ctrl+A sélectionne le texte.
- Sauvegarder (Ctrl+S) télécharge un `.jlgcad` JSON versionné ; Ouvrir recharge ce format et importe les fichiers DXF texte 2D.
- Une copie est automatiquement conservée dans le stockage de session de chaque onglet.

## Clic droit

Dans la zone de dessin, le clic droit ouvre un menu près du pointeur, adapté à la commande en cours ou à la sélection. Au repos : répéter le dernier outil de dessin, retrouver les huit outils récents, presse-papiers, annuler/rétablir et navigation. Avec une sélection : édition et propriétés ; les hachures et fenêtres de vue proposent aussi leurs actions spécifiques. Pendant une commande : options disponibles, fin ou sortie. Les polylignes proposent Ligne/Arc, retrait du dernier sommet et fermeture. Échap ferme le menu sans quitter la commande. Les flèches permettent de parcourir les actions. Aucun réglage supplémentaire ni clic temporisé.

## Langues

**Paramètres → Language** permet de choisir Français ou English. Le choix est appliqué immédiatement, conservé sur cet appareil et partagé entre les onglets du site, sans modifier le dessin. Le français reste la valeur par défaut. La première étape couvre les principaux menus, outils, propriétés, paramètres, le menu contextuel et de nombreuses instructions de dessin. Le réglage indépendant « Langue d’affichage des commandes » choisit les noms anglais ou français, toujours en majuscules (anglais par défaut). Il s’applique aux outils, à la palette et aux commandes des menus, y compris Répéter. Changer l’une ou l’autre langue ne modifie jamais les alias ni les raccourcis existants ou personnalisés. Les noms affichés des deux langues restent acceptés à la saisie. Les distances utilisent la virgule en français et le point en anglais, sans conversion de la géométrie.

La traduction est centralisée dans src/locales/en.json. Les textes non encore traduits gardent leur version française, notamment les longs guides d’aide et certains diagnostics techniques. Les noms et textes des dessins ne sont pas traduits.


## Formats et limites

Le format natif version 6 conserve le dessin, les chemins, les cotations, les hachures et leurs liaisons aux contours, les calques et les présentations. Les fichiers versions 1 à 5 sont migrés à l’ouverture. Les unités sont des millimètres. Les coordonnées affichées dans l’espace objet utilisent Y vers le haut, comme le DXF.

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

L’export DXF conserve le dessin objet visible et ses calques. Sans hachure ni texte objet, il utilise le format ASCII R12 existant (LINE, CIRCLE, POLYLINE, TEXT ; rectangles en quatre lignes). Avec des hachures ou du texte objet, il utilise le format R2004 avec de véritables entités HATCH éditables, leurs motifs et leurs îlots, des LWPOLYLINE et les couleurs individuelles. Les liaisons associatives des hachures restent propres au fichier natif : les HATCH exportées sont indépendantes. Les arcs des polylignes sont conservés et les Bézier sont approchées à 0,1 mm ; les cotes deviennent des lignes et textes. Une unité DXF représente un millimètre. Les présentations ne sont pas exportées en DXF. L’import DXF texte 2D est disponible ; l’import DWG et la 3D restent indisponibles. Les fenêtres sont rectangulaires sans rotation. Le texte PDF utilise Helvetica avec les caractères latins usuels ; les alphabets complexes et les emoji ne sont pas encore pris en charge. La marge pointillée de 5 mm est un repère visuel.

Le DWG direct n’est pas implémenté. Autodesk propose [RealDWG](https://forge.autodesk.com/developer/overview/realdwg-api), avec des API C++/.NET : cela nécessite une intégration distincte. Un DXF peut être ouvert puis sauvegardé en DWG avec AutoCAD ([documentation Autodesk](https://help.autodesk.com/cloudhelp/2023/ENU/AutoCAD-LT/files/GUID-11AEFE3C-D05A-45C3-8604-7B6A594440F3.htm)).

## Import DXF 2D

Dans **Fichiers → Ouvrir…**, choisir un `.dxf`, vérifier l’unité puis cliquer **Analyser le fichier**. Le bilan présente le nombre d’objets et de calques, les blocs décomposés, l’enveloppe du dessin en millimètres et les éléments non importés. Vérifier l’échelle avant d’ouvrir le résultat. En cas de modifications du dessin courant, une sauvegarde téléchargeable est proposée avant son remplacement. Annuler ou une erreur conserve le dessin courant ; un fichier sans objet compatible ne peut pas le remplacer.

Cette première version lit les DXF **texte**, notamment les structures R12 et R2004 : LINE, CIRCLE, ARC, POLYLINE 2D, LWPOLYLINE, TEXT, MTEXT simplifié, ATTRIB et INSERT. Les arcs sont conservés exactement. Les blocs statiques sont décomposés, avec point de base, rotation, échelle, miroir géométrique, imbrication et répétitions. Les calques gardent leur nom, leur visibilité et leur verrouillage ; les couleurs ACI, RGB, ByLayer et ByBlock sont résolues en couleurs individuelles.

Le choix d’unité est obligatoire si `$INSUNITS` est absent, sans unité ou non reconnu. Les unités proposées sont mm, cm, m, pouces et pieds ; le stockage reste en mm. Les DXF modernes (R2007+) sont décodés en UTF-8 ; les anciens utilisent leur encodage ANSI déclaré, ou Windows-1252 en son absence. Un encodage non reconnu produit une erreur.

Les textes sont éditables dans l’espace objet : contenu, hauteur, rotation, déplacement et copier-coller. Leur alignement est conservé ; les polices sont remplacées par Arial/Helvetica. MTEXT perd ses styles et ses retours automatiques. Les exports DXF conservent les textes et les sauts de ligne explicites. Le format natif passe en version 6 pour conserver les textes objet et leurs paramètres ; il ouvre les anciennes versions 1 à 5.

**Limites signalées dans le bilan :** hachures, cotations AutoCAD, splines, ellipses, présentations, références externes, objets personnalisés et géométrie 3D. Les textes déformés et les arcs ou cercles soumis à une échelle non uniforme sont exclus. Les types de trait, épaisseurs, largeurs de polyligne et la structure réutilisable des blocs ne sont pas conservés. Un bloc cyclique ou manquant est signalé. Le DXF binaire est refusé.

Limites : 20 Mo, 50 000 objets, 200 calques, 5 000 sommets par polyligne, 16 niveaux de blocs et 100 000 visites d’entités. Le fichier importé est cadré automatiquement et marqué comme à sauvegarder en `.jlgcad`. L’import reste entièrement local au navigateur.

Un [plan de vérification](tests/fixtures/import-2d.dxf) est fourni : contour de 8 × 6 m, arc de porte, fenêtre sous forme de bloc et annotations. La validation sur les fichiers réels de l’agence reste à réaliser.

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

## Hachures

- **HACHURES / HATCH / HA** ou le bouton Hachures ouvre le panneau de création. **H** reste réservé au déplacement de vue.
- **Point intérieur** détecte la surface fermée autour du clic, y compris un assemblage de lignes qui se croisent ou dépassent aux coins. Une ligne traversante divise la zone ; une branche intérieure ne crée pas de trou. Les contours restent intacts. La recherche utilise tous les objets visibles du même espace, indépendamment du zoom ; les calques verrouillés peuvent servir de limites.
- **Sélectionner des objets** utilise uniquement les limites sélectionnées. Une présélection est reprise automatiquement. Les îlots intérieurs doivent aussi être sélectionnés ; cliquer **Créer**, ou Entrée, confirme les zones. Un contour ouvert est refusé et les extrémités libres sont signalées quand elles sont identifiables.
- Motifs : SOLID, ANSI31, Croisé, Brique, Béton et lignes personnalisées. Ces deux derniers motifs de matériau sont un petit catalogue JLG CAD, pas une reprise complète du catalogue AutoCAD. Angle, échelle, origine et espacement se modifient avant et après création ; les lignes personnalisées acceptent un second réseau perpendiculaire. L’angle tourne le motif relativement à son orientation de base (ANSI31 = 45° à l’angle 0). L’échelle ne dépend pas du zoom. Sur un grand plan, augmentez-la pour obtenir des traits lisibles.
- **Normal** alterne plein et vide aux contours imbriqués ; **Extérieur** laisse tous les îlots vides ; **Ignorer** remplit la limite extérieure. Les hachures sont affichées derrière les contours, avec une sélection sur leur surface et priorité aux traits proches du pointeur.
- Répéter les clics crée plusieurs hachures, ou un seul objet si **Hachures séparées** est décoché. Un second clic dans la même zone pendant la commande ne crée pas de doublon. Entrée termine en mode point ; Échap conserve les zones déjà confirmées. Ctrl+Z/Ctrl+Y annule/rétablit les créations et modifications.
- Les hachures sont **associatives** par défaut. Modifier un sommet, une ligne ou un rayon recalcule la surface liée. Copier ensemble la hachure et toutes ses limites recrée leurs liens ; copier ou déplacer uniquement la hachure crée une surface indépendante. Une limite ouverte ou supprimée détache la hachure en conservant sa dernière surface valide. Ajouter une nouvelle ligne ne redécoupe pas les hachures existantes : utilisez **Redéfinir la zone**. **Sélectionner le contour** retrouve les objets liés.
- Disponible dans Objet, dans une fenêtre active et directement sur le papier. Sauvegarde native, restauration de session, copier-coller, calques, PDF vectoriel et DXF sont intégrés. Les arcs et Bézier des limites de hachures sont approchés à **0,05 mm** dans les unités de l’espace concerné. Seules les coïncidences numériques (0,000001 mm) sont fusionnées ; les ouvertures réelles ne sont pas fermées. Des limites de complexité et de densité produisent un message invitant à réduire les limites ou augmenter l’échelle.
- L’aide **Hachures — guide en 2 minutes** décrit les deux parcours. Les dégradés, motifs PAT importés, hachures annotatives, masquage des textes et Ajuster/Prolonger sur les hachures restent hors de cette version.

Les nouvelles cotations de diamètre (DIAMÈTRE / DDI puis Entrée) suivent le rayon et le centre du cercle. Le fichier natif version 4 conserve cette liaison ; copier le cercle et sa cote ensemble la recrée pour les copies, et supprimer le cercle retire ses cotations liées en une action annulable. Les anciennes cotations restent indépendantes.
