# JLG CAD

Prototype de dessin 2D local, en Bun + TypeScript + React. Aucun serveur de données.

Les [personas et principes UX](docs/personas.md) décrivent les utilisateurs de référence, avec l’architecte et architecte du patrimoine comme destinataire prioritaire.

L’objectif produit principal est de remplacer AutoCAD dans son travail quotidien pour supprimer le coût de ses licences, tout en permettant de recevoir et d’envoyer des fichiers AutoCAD : **DWG en priorité, DXF à défaut**. Cet objectif dépasse les capacités actuelles du prototype ; voir la documentation UX pour distinguer les besoins des fonctions disponibles.

## Démarrer

Avec [mise](https://mise.jdx.dev/) installé, le fichier `mise.toml` fixe les versions de Bun et Node :

```sh
mise trust
mise install
mise run dev
```

Les tâches installent automatiquement les dépendances avec le fichier de verrouillage. `mise tasks` affiche les commandes disponibles :

| Tâche | Usage |
| --- | --- |
| `mise run install` | Installer les dépendances verrouillées |
| `mise run dev` | Démarrer le serveur de développement |
| `mise run test` | Exécuter les tests |
| `mise run build` | Vérifier TypeScript et compiler dans `dist` |
| `mise run preview` | Compiler puis prévisualiser le site |
| `mise run check:dxf` | Vérifier les échanges DXF ; fichiers produits dans `artifacts/dxf-roundtrip` |
| `mise run check` | Exécuter toutes les vérifications (tests, compilation, DXF) |

Ou directement avec Bun :

```sh
bun install
bun run dev
```

Ouvrir http://127.0.0.1:5173/jlg-cad/. `bun run build` produit le site dans `dist` ; `bun run preview` permet de le consulter.

## Déploiement

Le site est publié sur https://jlg-formation.github.io/jlg-cad/ par GitHub Actions à chaque push sur `main`. Le workflow installe les dépendances verrouillées avec Bun, exécute les tests, compile puis déploie `dist` sur GitHub Pages. Dans les réglages Pages du dépôt, la source doit être GitHub Actions.

## Utilisation

- **Ligne** enchaîne les segments : chaque extrémité devient le départ suivant, et chaque segment reste un objet indépendant. Une longueur saisie puis Entrée valide le segment et permet de poursuivre. Entrée sans valeur ou Échap termine sans ajouter l’aperçu. **C puis Entrée** ferme la suite après au moins deux segments ; **U puis Entrée** ou **Ctrl+Z** retire le dernier segment et revient au point précédent. Le clic droit propose aussi Terminer, Fermer et Annuler le dernier segment.

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

## Répéter au clavier

Au repos, **Entrée** ou **Espace** relance le dernier outil disponible, comme « Répéter » au clic droit. Cela fonctionne aussi dans la ligne de commande vide, palette fermée. La répétition demande de nouveaux points et reprend la sélection selon les règles habituelles de l’outil ; elle ne rejoue pas la géométrie précédente. Pendant une commande ou une saisie, les validations habituelles restent prioritaires. Un appui maintenu ne relance pas plusieurs fois l’outil.

Les touches réaffectées à une autre action restent prioritaires ; le menu contextuel et l’aide indiquent les touches disponibles. L’historique reste propre à l’onglet et est réinitialisé après Nouveau ou une ouverture réussie.

## Clic droit

Dans la zone de dessin, le clic droit ouvre un menu près du pointeur, adapté à la commande en cours ou à la sélection. Au repos : répéter le dernier outil de dessin, retrouver les huit outils récents, presse-papiers, annuler/rétablir et navigation. Avec une sélection : édition et propriétés ; les hachures et fenêtres de vue proposent aussi leurs actions spécifiques. Pendant une commande : options disponibles, fin ou sortie. Les polylignes proposent Ligne/Arc, retrait du dernier sommet et fermeture. Échap ferme le menu sans quitter la commande. Les flèches permettent de parcourir les actions. Aucun réglage supplémentaire ni clic temporisé.

## Langues

**Paramètres → Language** permet de choisir Français ou English. Le choix est appliqué immédiatement, conservé sur cet appareil et partagé entre les onglets du site, sans modifier le dessin. Le français reste la valeur par défaut. La première étape couvre les principaux menus, outils, propriétés, paramètres, le menu contextuel et de nombreuses instructions de dessin. Le réglage indépendant « Langue d’affichage des commandes » choisit les noms anglais ou français, toujours en majuscules (anglais par défaut). Il s’applique aux outils, à la palette et aux commandes des menus, y compris Répéter. Changer l’une ou l’autre langue ne modifie jamais les alias ni les raccourcis existants ou personnalisés. Les noms affichés des deux langues restent acceptés à la saisie. Les distances utilisent la virgule en français et le point en anglais, sans conversion de la géométrie.

La traduction est centralisée dans src/locales/en.json. Les textes non encore traduits gardent leur version française, notamment les longs guides d’aide et certains diagnostics techniques. Les noms et textes des dessins ne sont pas traduits.


## Formats et limites

Le format natif version 12 conserve le dessin, les arcs natifs, les chemins, les cotations, les hachures et leurs liaisons aux contours, les calques et les présentations. Les fichiers versions 1 à 11 sont migrés à l’ouverture. Les unités sont des millimètres. Les coordonnées affichées dans l’espace objet utilisent Y vers le haut, comme le DXF.

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

L’export DXF conserve le dessin objet visible et ses calques. Il utilise le format ASCII R2004, avec des entités LINE, ARC et CIRCLE, des LWPOLYLINE (y compris pour les rectangles), les couleurs individuelles et de véritables entités HATCH éditables avec leurs motifs et leurs îlots. Les liaisons associatives des hachures restent propres au fichier natif : les HATCH exportées sont indépendantes. Les arcs des polylignes sont conservés et les Bézier sont approchées à 0,1 mm ; les cotes deviennent des lignes et textes. Une unité DXF représente un millimètre. Les présentations ne sont pas exportées en DXF. L’import DXF texte 2D est disponible ; l’import DWG et la 3D restent indisponibles. Les fenêtres sont rectangulaires sans rotation. Le texte PDF utilise Helvetica avec les caractères latins usuels ; les alphabets complexes et les emoji ne sont pas encore pris en charge. La marge pointillée de 5 mm est un repère visuel.

Le DWG direct n’est pas implémenté. Autodesk propose [RealDWG](https://forge.autodesk.com/developer/overview/realdwg-api), avec des API C++/.NET : cela nécessite une intégration distincte. Un DXF peut être ouvert puis sauvegardé en DWG avec AutoCAD ([documentation Autodesk](https://help.autodesk.com/cloudhelp/2023/ENU/AutoCAD-LT/files/GUID-11AEFE3C-D05A-45C3-8604-7B6A594440F3.htm)).

## Import DXF 2D

Dans **Fichiers → Ouvrir…**, choisir un `.dxf`, vérifier l’unité puis cliquer **Analyser le fichier**. Le bilan présente le nombre d’objets et de calques, les insertions de blocs analysées, l’enveloppe du dessin en millimètres et les éléments non importés. Vérifier l’échelle avant d’ouvrir le résultat. En cas de modifications du dessin courant, une sauvegarde téléchargeable est proposée avant son remplacement. Annuler ou une erreur conserve le dessin courant ; un fichier sans objet compatible ne peut pas le remplacer.

Cette première version lit les DXF **texte**, notamment les structures R12 et R2004 : LINE, CIRCLE, ARC, POLYLINE 2D, LWPOLYLINE, TEXT, MTEXT simplifié, ATTRIB et INSERT. Les arcs sont conservés exactement. Les blocs statiques à échelle uniforme sont conservés avec leur point de base, rotation, miroir et répétitions. Le contenu imbriqué est aplati dans la définition extérieure. Les insertions à échelles non uniformes sont décomposées ; les courbes incompatibles sont signalées. Les calques gardent leur nom, leur visibilité et leur verrouillage ; les couleurs ACI, RGB, ByLayer et ByBlock sont résolues en couleurs individuelles.

Le choix d’unité est obligatoire si `$INSUNITS` est absent, sans unité ou non reconnu. Les unités proposées sont mm, cm, m, pouces et pieds ; le stockage reste en mm. Les DXF modernes (R2007+) sont décodés en UTF-8 ; les anciens utilisent leur encodage ANSI déclaré, ou Windows-1252 en son absence. Un encodage non reconnu produit une erreur.

Les textes sont éditables dans l’espace objet : contenu, hauteur, rotation, déplacement et copier-coller. Leur alignement est conservé ; les polices sont remplacées par Arial/Helvetica. MTEXT perd ses styles et ses retours automatiques. Les exports DXF conservent les textes et les sauts de ligne explicites. Le format natif version 7 conserve les textes objet et les arcs natifs ; il ouvre les anciennes versions 1 à 6.

**Limites signalées dans le bilan :** hachures, cotations AutoCAD, splines, ellipses, présentations, références externes, objets personnalisés et géométrie 3D. Les textes déformés et les arcs ou cercles soumis à une échelle non uniforme sont exclus. Les types de trait continu, tireté, pointillé et axe ainsi que les épaisseurs sont conservés. Les autres types de trait sont signalés et remplacés par un trait continu. Les largeurs de polyligne ne sont pas conservées. Un bloc cyclique ou manquant est signalé. Le DXF binaire est refusé.

Limites : 20 Mo, 50 000 objets, 200 calques, 5 000 sommets par polyligne, 16 niveaux de blocs et 100 000 visites d’entités. Le fichier importé est cadré automatiquement et marqué comme à sauvegarder en `.jlgcad`. L’import reste entièrement local au navigateur.

Un [plan de vérification](tests/fixtures/import-2d.dxf) est fourni : contour de 8 × 6 m, arc de porte, fenêtre sous forme de bloc et annotations. La validation sur les fichiers réels de l’agence reste à réaliser.

## Vérification

`bun test` vérifie le format natif et l’export. `bun run build` vérifie TypeScript et produit le bundle.

### Mise à l’échelle par référence — SCALE / SC

La commande **SCALE** propose l’option **R — Référence** pour les images, les PDF et les autres objets pris en charge dans l’espace Objet. Elle conserve le point de base, l’orientation et les proportions de la sélection.

1. Sélectionner les objets puis lancer `SC`, ou lancer SCALE et choisir l’objet.
2. Cliquer le **point de base**, qui restera fixe.
3. Taper **R** puis Entrée, ou cliquer **R — Référence**.
4. Définir la **longueur de référence** : saisir une distance ou cliquer ses deux extrémités.
5. Définir la **nouvelle longueur** : saisir une distance (par exemple `12 m`), ou cliquer un point dont la distance au point de base représente la longueur souhaitée.

Le geste avec un cercle est donc : **SC → point de base → R → premier point de référence → second point de référence → point sur le cercle**. Si le premier point de référence est le point de base, il est cliqué de nouveau après R, comme dans AutoCAD. Le cercle, s’il ne fait pas partie de la sélection, conserve sa taille et sert uniquement de repère.

À l’étape de la nouvelle longueur, **P — Points** permet de choisir deux points indépendants pour mesurer la distance cible. Un clic direct mesure au contraire la distance depuis le point de base, même si la référence a été mesurée ailleurs. Les longueurs sans suffixe utilisent l’unité active ; les suffixes mm, cm et m sont acceptés. Entrée sans valeur reprend la dernière longueur de référence ou cible utilisée dans la session.

Les étapes sont indiquées dans la barre de commande et dans l’aide contextuelle. Les objets restent immobiles pendant le choix des points, sans aperçu animé de la mise à l’échelle. La transformation s’applique uniquement au clic final ou à la validation de la valeur saisie. Échap abandonne la commande sans modification. Ctrl+Z annule l’opération validée en une seule fois. **Copier les objets**, ou **C** avant R, conserve les originaux. Les calques verrouillés restent protégés.

### Images attachées, sous-jacents PDF et transmission

Le menu **Références** propose **Attacher une image**, **Attacher un PDF** et le gestionnaire **Références**. Les commandes `IMAGEATTACH`, `PDFATTACH`, `EXTERNALREFERENCES` et `XREF` donnent accès aux mêmes parcours. Les sources acceptées sont PNG, JPEG et PDF, avec une limite de 20 Mo par fichier et 100 pages par PDF. Un PDF protégé par mot de passe n’est pas pris en charge.

Comme dans AutoCAD, choisir le fichier, les pages PDF, le point d’insertion, le facteur d’échelle et la rotation. Chaque paramètre peut être renseigné ou **spécifié à l’écran**. Plusieurs pages sont placées successivement ; Échap annule le placement en préparation et conserve les pages confirmées. Les images utilisent leur résolution PNG/JFIF lorsqu’elle est disponible, sinon une base de 96 ppp ; la taille résultante est indiquée avant l’insertion. Le point d’insertion est le coin inférieur gauche visuel. Les coordonnées et les dimensions suivent les unités habituelles de JLGCAD.

Les références peuvent être attachées dans Objet ou sur une présentation. Sélectionner leur cadre pour les déplacer, les copier ou les modifier ; les poignées déplacent l’occurrence ou la redimensionnent proportionnellement. Les propriétés proposent dimensions, rotation, estompage, contraste, réglages propres au type, visibilité et ordre d’affichage. Le verrouillage passe par le calque. Les cadres sont masqués/non imprimés, affichés/imprimés ou affichés/non imprimés (valeur initiale).

**Calibrer l’échelle** demande deux points puis la distance réelle à saisir dans la commande. La commande `SCALE` propose aussi le parcours AutoCAD par référence décrit ci-dessus, avec une longueur cible saisie ou pointée. Le menu contextuel propose aussi la calibration et le découpage. **Délimiter** accepte un rectangle ou un polygone simple dans les limites du document ; la limite peut être désactivée ou supprimée sans modifier la source. `CLIP`, `IMAGECLIP` et `PDFCLIP` lancent le découpage rectangulaire de la référence sélectionnée. `PDFADJUST` et `IMAGEADJUST` ouvrent ses propriétés.

Pour les PDF vectoriels, les extrémités et milieux des tracés exploitables peuvent servir d’accrochages, indépendamment des objets JLGCAD. Ce réglage se trouve dans les propriétés du PDF. Les centres et intersections du contenu PDF ne sont pas pris en charge. Un scan ne fournit aucun accrochage aux pixels. Attacher un PDF ne convertit pas son contenu en objets modifiables.

Le gestionnaire permet de sélectionner une occurrence, décharger/recharger une source, choisir une nouvelle version du fichier ou détacher la référence avec toutes ses occurrences. Remplacer une source conserve les placements ; l’opération est refusée si une page utilisée disparaît. Les fichiers locaux ne sont pas surveillés automatiquement. Les références ne peuvent pas être incorporées à une définition de bloc.

Le format natif **v11** conserve les sources et leurs occurrences dans un `.jlgcad` autonome ; il ouvre les versions 1 à 10. Copier-coller des références entre dessins transporte leurs sources. La sauvegarde de session est limitée par le quota du navigateur : en cas d’échec, un message invite à enregistrer un fichier `.jlgcad`.

**Exporter en DXF** conserve le téléchargement d’un DXF seul lorsque le dessin exporté n’a aucune référence. Avec des références, une fenêtre propose un **ZIP contenant le DXF, les sources et un récapitulatif**. Cocher **Ne plus afficher ce message** puis confirmer mémorise ce choix dans le navigateur : les prochains exports concernés téléchargent directement le ZIP. **Paramètres → Général** permet de réactiver l’avertissement. Annuler ne mémorise pas le choix.

Le ZIP contient les références de l’espace Objet, même masquées, sur un calque masqué ou déchargées, avec des chemins relatifs et des noms sans collision. Extraire tout le ZIP avant d’ouvrir le DXF. Le DXF avec références est en **R2010** : les images restent des `IMAGE` et les PDF restent des `PDFUNDERLAY` avec leur fichier PDF original. Les présentations restent exclues du DXF. Les réglages de cadre individuels n’ont pas d’équivalence exacte avec les réglages globaux AutoCAD ; le récapitulatif indique les limites. Une validation visuelle dans AutoCAD sur les documents réels de l’agence reste à effectuer, notamment pour les PDF recadrés ou pivotés à la source. Aucun export DWG n’est prévu.

L’export PDF inclut les références visibles, leurs transformations et leurs découpages. Les PDF attachés sont rendus depuis la source pour l’impression, avec une cible de 300 ppp, limitée à 8 192 pixels par côté et 32 millions de pixels ; ce rendu est raster. Les sources originales restent intactes dans le projet et le ZIP de transmission.

## Outils d’architecture

- **Décalage (O)** : sélectionner une ligne ou un contour, saisir par exemple `10 cm`, puis cliquer du côté voulu. L’original reste en place.
- **Ajuster (X)** : cliquer le morceau à supprimer entre les intersections. La prévisualisation indique la partie retirée. Les formes visibles servent de limites ; on peut aussi choisir les limites puis valider avec Entrée. Répéter les clics pour nettoyer le plan.
- **Prolonger (E)** atteint la première limite du côté de l’extrémité choisie. **RACCORD / FILLET** ajuste deux lignes droites à leur intersection, avec un rayon nul. **JOINDRE / JOIN** est une commande distincte qui fusionne des objets compatibles.
- **Copier**, **Déplacer (M)**, **Rotation** et **Miroir** utilisent un objet sélectionné et des points de référence. Copier/déplacer disposent aussi de déplacements X/Y saisis ; la rotation exige un point de base explicite et agit sur toute la sélection. Après le choix du pivot, la boîte Angle près du curseur et le panneau latéral partagent la même valeur : saisir un angle signé en degrés puis Entrée, ou indiquer une direction à la souris et cliquer. La saisie fixe l’aperçu malgré les mouvements de souris ; Échap abandonne sans modifier le dessin.
- Les distances acceptent `mm`, `cm`, `m`, les valeurs signées et les virgules décimales. Sans unité, une valeur est en millimètres.
- Longueur et angle précis contraignent les lignes et segments de polyligne. **F8** active l’orthogonal ; le guidage polaire propose 15°, 30°, 45° ou 90°. Les accrochages reconnaissent extrémités, milieux, centres et intersections.
- **Polyligne (P)** : cliquer les sommets, choisir Ligne ou Arc circulaire pour le prochain segment, puis Entrée ou Terminer. Le contour peut être fermé. Les propriétés permettent de déplacer, insérer et supprimer les sommets et de modifier les arcs.
- **Bézier (B)** : cliquer les points de passage, puis terminer. Les sommets et poignées se déplacent dans le dessin ou par coordonnées. Les poignées peuvent être alignées et un sommet peut être lissé.
- **Mesurer** affiche distance, écarts X/Y et angle. **Cotation (D)** prend deux points puis la position de la cote ; régler hauteur imprimée et échelle prévue. Les nouvelles cotations explicites suivent les extrémités et centres reconnus ; les anciennes cotations générales restent indépendantes.
- Les **calques** se configurent depuis le bouton voisin du sélecteur de calque courant dans la barre d’outils : neuf propriétés, ajout et suppression des calques vides. Les objets héritent de leur calque et permettent des exceptions individuelles. Voir le [guide des calques](docs/layers.md). Le verrouillage protège les modifications géométriques ; les calques masqués sont exclus des fenêtres et exports PDF/DXF.

Les décalages des lignes et arcs sont géométriques. Un décalage de Bézier produit une polyligne approchée à 0,1 mm ; ses intersections utilisent une approximation de 0,05 mm. Les décalages qui écrasent ou croisent un contour sont refusés. Raccords arrondis, blocs et liaisons de cotation aux intersections et aux points arbitraires restent à développer.

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

## JOINDRE / JOIN et RACCORD / FILLET

- **JOIN**, **JOINDRE** ou **J** : sélectionner plusieurs objets (clics, fenêtre, lasso ou Ctrl+A), puis Entrée. Les lignes jointives formant des angles deviennent des polylignes, ouvertes ou fermées ; plusieurs ensembles indépendants peuvent être traités ensemble. Une présélection de plusieurs objets est traitée dès le lancement de JOIN. Maj+clic retire un objet de la sélection en cours.
- Pour un **objet source**, sélectionner un seul objet puis Entrée (ou Utiliser comme source), sélectionner les objets à ajouter, puis Entrée. Une ligne source accepte uniquement des lignes alignées, même avec des espaces ; une polyligne ouverte source exige des extrémités jointives. Le résultat conserve l’identifiant, la couleur et le calque de la source. Sans source explicite, le premier objet de chaque ensemble détermine ses propriétés.
- Les **arcs natifs** sont distincts des polylignes à segments courbes. Les arcs de même centre et rayon peuvent être réunis avec des espaces ; une couverture circulaire complète devient un cercle. Avec un arc source, **C puis Entrée** ou Fermer l’arc en cercle produit un cercle. Les autres arcs jointifs peuvent former une polyligne exacte avec des lignes et des polylignes ouvertes. Les propriétés de l’arc donnent accès au centre, au rayon et à l’angle ; ses poignées modifient les extrémités, le point intermédiaire et le centre.
- **Échap** abandonne la préparation sans fusionner les objets. **Ctrl+Z** annule toute la jonction validée en une opération ; Rétablir restaure le résultat. Les objets incompatibles ou verrouillés sont conservés, avec un bilan des objets non joints. Les embranchements ambigus ne sont pas résolus arbitrairement.
- Les références des **hachures associatives**, y compris leurs îlots, suivent les objets réunis. La synchronisation existante conserve ou détache la hachure selon la validité du contour résultant. La tolérance de coïncidence est de **0,000001 mm**, indépendante du zoom, de la grille et des accrochages. La limite reste de 5 000 sommets par polyligne. JOIN fonctionne dans Objet, dans une fenêtre active et sur les objets papier.
- **FILLET**, **RACCORD** et l’ancien alias **RACCORDER** conservent le raccord d’angle à rayon zéro entre deux lignes. Cette commande ne fusionne pas les objets. Les anciens raccourcis personnalisés de Raccorder sont transférés à FILLET ; J désigne désormais JOIN. F reste affecté à la fenêtre de vue.
- Les nouveaux arcs créés avec ARC ou importés depuis un DXF sont enregistrés comme arcs dans le format natif v7 et exportés comme ARC dans le DXF. Les anciennes polylignes courbes restent des polylignes : aucune conversion fondée seulement sur leur apparence. Les Bézier, ellipses, splines AutoCAD et objets 3D ne sont pas pris en charge par JOIN.

Les tests de jonction couvrent les lignes avec espaces et superpositions, les ordres et sens des segments, les contours séparés et fermés, les sources, les arcs passant par zéro degré, les calques verrouillés, les hachures avec îlots et les échanges natif/presse-papiers/DXF. La comparaison interactive sur les fichiers réels de l’agence avec AutoCAD reste à effectuer.

## Cotations

Les textes des cotes linéaires et alignées restent parallèles au trait et au-dessus dans leur sens de lecture, avec un espace proportionnel à leur hauteur, indépendant de l’ordre des points. Les textes angulaires et de longueur d’arc restent horizontaux et entièrement à l’extérieur de l’arc. Ce placement est commun au dessin, aux présentations et aux exports PDF/DXF, sans masque opaque derrière les chiffres.

La flèche du bouton Cotation ouvre les huit familles, dans l’ordre du menu AutoCAD. Le bouton principal relance la dernière famille choisie. La commande générale **D / DIMENSION** reste disponible en bas du menu.

Pendant la cotation angulaire par deux lignes, les segments choisis deviennent temporairement bleus : le premier pendant le choix du second, puis les deux pendant le placement. Sur un rectangle ou une polyligne, seuls les segments retenus sont mis en évidence, sans poignées ni sélection de l’objet. Dans une présentation, ce retour apparaît uniquement dans la fenêtre utilisée, à l’intérieur de son cadre. Il disparaît à la validation, à Échap ou au changement d’outil ; il ne modifie ni le dessin enregistré ni les exports.

| Outil | Commande / alias | Parcours |
| --- | --- | --- |
| Linéaire | DIMLINEAR / DLI | Deux points, puis placement horizontal/vertical ; Entrée avant le premier point permet de choisir un côté. Une direction précise en degrés est disponible dans les réglages. |
| Alignée | DIMALIGNED / DAL | Deux points, ou Entrée puis sélection d’un côté droit ; placement parallèle au côté. |
| Angulaire | DIMANGULAR / DAN | Deux côtés droits puis placement dans le secteur souhaité ; le réglage « Sommet et deux points » permet le parcours à trois points. Un arc circulaire peut aussi être sélectionné. |
| Longueur d’arc | DIMARC / DAR | Un arc natif ou un segment circulaire de polyligne, puis placement ; mesure le chemin circulaire avec symbole d’arc. |
| Rayon | DIMRADIUS / DRA | Cercle ou arc, puis placement ; préfixe R. |
| Diamètre | DIMDIAMETER / DDI | Cercle ou arc, puis placement ; préfixe Ø. |
| Ordonnée | DIMORDINATE / DOR | Point puis rappel de cote ; origine X/Y dans l’unité active, axe automatique ou X/Y imposé. Y est positif vers le haut. |
| Rayon raccourci | DIMJOGGED / DJO | Cercle ou arc, centre de remplacement, placement du texte, puis position de la brisure. La valeur reste le rayon réel. |

Les réglages proposent hauteur imprimée et échelle de cote ; les saisies acceptent la virgule et les unités explicites. Entrée valide les paramètres, Tab change de champ, Échap quitte la commande. Les valeurs mesurées sont calculées depuis le dessin. Les nouvelles commandes restent actives après création pour enchaîner les cotes. Une poignée permet de replacer les cotations circulaires, angulaires et par ordonnées.

Les nouvelles cotes se lient aux extrémités et centres exacts reconnus lors de la création. Les angles créés par sélection de deux lignes suivent ces lignes. Copier les cotes avec leurs sources recrée les liens ; copier une cote seule conserve une mesure indépendante. Une source supprimée ou un segment devenu incompatible détache les nouvelles liaisons en conservant la géométrie disponible ; le diamètre lié à un cercle conserve son comportement de suppression en cascade. Les points libres, milieux et intersections ne sont pas liés automatiquement ; les remaniements de topologie d’une polyligne peuvent nécessiter de recréer une cote.

Le format natif conserve les définitions et les liaisons. Le PDF est vectoriel. Le DXF conserve l’apparence en traits, flèches et textes ; il ne produit pas encore des entités DIMENSION éditables et associatives dans AutoCAD. Les styles DIMSTYLE, les tolérances, les unités alternatives et les cotes annotatives ne sont pas implémentés. Les cotes se créent dans Objet et directement sur les présentations, sans activer les fenêtres.

### Cotations sur les présentations

Les huit outils sont accessibles dans l’espace papier par le même bouton Cotation et leurs alias. Restez sur la feuille : cliquez les points du bâtiment visibles dans une fenêtre, puis placez la cote, même hors de son cadre. Un double-clic pendant la cotation n’active pas la fenêtre. Une fenêtre verrouillée reste utilisable pour coter.

La première sélection détermine la fenêtre de référence ; les points suivants doivent appartenir à la même vue. Les extrémités, centres, milieux et intersections bénéficient des accrochages du dessin à travers la fenêtre. Le réglage Angulaire propose deux lignes ou un sommet et deux points. Les cotes restent des objets de la présentation ; aucune cote n’est ajoutée dans Objet et les autres présentations restent indépendantes.

La valeur affichée est la mesure réelle du bâtiment dans l’unité active du dessin. Un mur de 5 m affiché au 1:50 est coté 5 m, pas 100 mm. La hauteur du texte est directement exprimée en millimètres imprimés, 3 mm par défaut ; aucun facteur d’échelle de cote n’est à saisir. Changer l’échelle, le cadrage, la position ou les dimensions de la fenêtre reprojette les cotes en conservant cette hauteur et la taille des flèches.

Modifier les éléments du bâtiment met à jour les valeurs et les points d’attache liés. Les milieux suivent leur position relative sur le segment ; les intersections sont recalculées tant que les deux segments se croisent. Les poignées et les propriétés permettent de déplacer la cote sur la feuille sans déplacer le bâtiment ni perdre ses liens.

Si une source sort entièrement du cadre, sa cote est masquée et revient lorsqu’elle redevient visible. Une source supprimée ou devenue incompatible détache la cote en conservant la dernière géométrie et la dernière valeur valides, avec une indication dans ses propriétés. Supprimer la fenêtre conserve également une cote détachée sur la feuille. Annuler/rétablir restaure les liens, la fenêtre et les sources avec leur état précédent.

Le fichier natif v9 conserve ces liaisons entre espaces ; les anciens formats restent lisibles. Le PDF utilise les mesures réelles, les tailles papier et le masquage des cotes hors cadre. Les mesures entre fenêtres différentes, les fenêtres tournées ou non rectangulaires, la réassociation manuelle et la conservation des associations dans un DWG/DXF AutoCAD ne sont pas pris en charge. Les remaniements de topologie et les intersections disparues peuvent nécessiter de recréer la cote. La comparaison sur des plans réels de l’agence reste à effectuer.

## Blocs statiques 2D

Le menu **Blocs**, le clic droit et la ligne de commande donnent accès aux mêmes parcours, en français et en anglais :

| Opération | Commandes et alias |
| --- | --- |
| Créer | `BLOCK`, `BLOC`, `B` |
| Insérer | `INSERT`, `INSERER`, `I` |
| Décomposer | `EXPLODE`, `DECOMPOS`, `X` |
| Éditer | `BEDIT`, `MODIFBLOC`, `BE` ou double-clic sur une insertion |
| Fermer l’éditeur | `BCLOSE`, `FERMERBLOC` |

Créer : sélectionner les objets avant la commande, ou lancer B puis sélectionner et valider par Entrée. Nommer le bloc, choisir si les objets doivent être remplacés par une insertion, puis cliquer son point de base. Échap annule la préparation.

Insérer : choisir un bloc avec aperçu, régler son échelle uniforme et sa rotation, puis cliquer son point d’insertion. Le bloc suit le curseur avant placement. **Récupérer des blocs depuis un plan** charge les définitions d’un `.jlgcad` ou d’un DXF avec unité déclarée, sans remplacer le dessin courant. Les conflits de noms créent un nom distinct ; les définitions existantes ne sont pas écrasées.

Une insertion se sélectionne et se transforme comme un seul objet. Sa poignée marque le point d’insertion ; ses propriétés donnent accès à la position, la rotation, l’échelle et l’édition. Les accrochages voient sa géométrie. Copier/coller entre dessins transporte aussi ses définitions et calques.

Éditer ouvre un espace isolé, centré sur la définition du bloc et utilisant les outils habituels. **Enregistrer le bloc** actualise toutes ses insertions, avec une seule annulation dans le dessin principal. Fermer propose d’enregistrer, d’abandonner ou de poursuivre. Les commandes de fichier et le changement d’espace demandent de fermer l’éditeur. Pendant l’édition, la sauvegarde de session conserve le dessin principal ; recharger abandonne les modifications non validées du bloc.

Décomposer remplace seulement les insertions sélectionnées par leurs objets ; la définition reste disponible. Création, insertion et décomposition sont annulables. Entrée/Espace répète la dernière commande de bloc au repos. Les anciens alias par défaut B (Bézier) et X (Ajuster) deviennent BEZ et TR pour libérer les alias AutoCAD ; les préférences personnalisées restent configurables.

Le format natif v10 conserve les définitions et insertions ; les anciens dessins sont migrés. Le DXF exporte les blocs utilisés sous forme BLOCK/INSERT. Les couleurs importées sont résolues : des variantes de calque ou couleur peuvent créer des définitions distinctes. Les blocs imbriqués sont aplatis, les attributs deviennent des textes et les blocs dynamiques ne sont pas gérés. L’édition de blocs est limitée à l’espace Objet. L’import direct DWG reste indisponible : enregistrer les anciens plans en DXF depuis AutoCAD.
