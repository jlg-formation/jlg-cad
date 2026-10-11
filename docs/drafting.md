# Commandes et saisie dynamique

La polyligne est le premier outil de dessin. L’outil Mur a été retiré.

- Taper **PL**, puis **Entrée** ou **Espace**, lance Polyligne. Les noms PLINE, POLYLINE et POLYLIGNE sont également reconnus.
- Taper **L**, puis **Entrée** ou **Espace**, lance Ligne.
- La liste de complétion apparaît pendant la frappe. Les flèches changent la proposition ; Entrée valide. Échap efface la commande.
- Après le premier point, orienter la souris puis taper une longueur. Le champ apparaît près du tracé, sans clic préalable. Entrée crée le segment. Pour une polyligne, la valeur ne s’applique qu’à ce segment ; Entrée sans valeur termine le chemin.
- Les chiffres du clavier et du pavé numérique, les virgules et les points sont acceptés. Une longueur invalide est signalée sans créer de segment.
- ORTHO (F8) contraint la direction. Maj inverse temporairement ORTHO. Une longueur explicite garde sa précision, même près d’un accrochage.
- Ligne : **L puis Entrée**, ou bouton Ligne, puis clic du premier point. Le champ Longueur reçoit automatiquement le focus. Orientez la souris, saisissez la distance puis Entrée : une seule ligne est créée et l’outil revient à Sélection, sans Échap. Un second clic peut aussi confirmer le point final. Une saisie invalide garde le champ ouvert pour correction.

Dans **Paramètres** (engrenage), choisir l’unité de saisie et d’affichage : mètres par défaut, centimètres ou millimètres. Le choix est conservé dans ce navigateur. Une valeur sans suffixe utilise cette unité ; un suffixe explicite la remplace pour cette saisie. Changer l’unité ne redimensionne aucun objet. Les fichiers et exports conservent leurs unités internes en millimètres. L’espace papier et les hauteurs de texte imprimées restent en millimètres.

Les commandes par lettres demandent maintenant une validation. Les raccourcis de fonction et les combinaisons comme Ctrl+S restent immédiats.

## Sélection et poignées

La sélection affiche des poignées bleues de taille constante à l’écran, y compris avec Ctrl+A. Les carrés déplacent les sommets ; les poignées allongées au milieu d’une ligne ou d’un segment de polyligne déplacent ses deux extrémités ensemble. Les rectangles ont des poignées aux coins ; les cercles au centre et aux quatre points cardinaux. Les calques verrouillés ne proposent pas de poignées de modification. ORTHO et les accrochages restent actifs pendant la manipulation. Ctrl+Z annule la modification ; Échap conserve une manipulation géométrique valide en cours et revient à la sélection. Les accrochages aux extrémités et milieux fonctionnent aussi sans sélection.

Un réticule de 86 pixels avec carré central remplace le curseur dans la zone de dessin.

Au démarrage et au retour dans Objet, la vue affiche au moins 50 m dans chaque direction. Sur un écran rectangulaire, la direction la plus longue montre davantage de terrain pour conserver les proportions. Un segment de 5 m représente moins d’un dixième du petit côté. La grille adapte son espacement au zoom.

L’indicateur d’origine suit les dimensions du dessin : 5 m vers la droite et le haut, 2,5 m vers la gauche et le bas. Son épaisseur reste constante à l’écran.

La vue initiale réserve une marge autour des branches négatives pour afficher toute la croix. Les branches positives portent une pointe de flèche et les lettres X et Y, de taille constante à l’écran.
Un point et la lettre O identifient l’intersection des axes comme origine.
Les instructions sont affichées dans la barre de statut, sans texte d’aide superposé à l’indicateur d’origine.

Pendant le tracé d’une polyligne, C puis Entrée ferme le contour après au moins trois sommets. Le dernier sommet est relié au premier sans duplication. Cette action est annulable et ne change pas le réglage de fermeture des prochains tracés. Dans le champ de commande, C puis Entrée produit la même fermeture.

ORTHO se bascule avec F8 ou Ctrl+L. Les anciennes préférences conservant uniquement le raccourci standard F8 reçoivent aussi Ctrl+L.

Le curseur affiche son carré central en sélection. Pendant un outil, la croix reste visible sans carré. Échap conserve les points confirmés de la polyligne ou de la Bézier en cours sous forme de chemin ouvert et revient à la sélection, y compris pendant une saisie de longueur ou de commande.

Échap ignore le segment de prévisualisation et une longueur non confirmée. Un seul sommet ne crée pas d’objet. Les Bézier peuvent aussi se terminer avec Espace. Les transformations sans destination confirmée restent sans effet ; les actions déjà effectuées sont conservées. Les objets existants restent conservés. C prépare la fermeture ; seule Entrée la confirme.

La barre inférieure unique mesure 30 px : onglets Objet et présentations, ajout (+), commande, instruction active, ORTHO et coordonnées fixes. Elle ne se replie pas ; les onglets défilent horizontalement. Les instructions se masquent sous 600 px, les coordonnées sous 400 px.

Les onglets mesurent 72 px. Sur desktop, leur zone de 400 px affiche Objets et quatre layouts avec le bouton + fixe. Les layouts supplémentaires défilent horizontalement ; l’onglet actif est rendu visible automatiquement. Les anciens noms standard Présentation N sont affichés comme Layout N ; les noms personnalisés sont conservés.

Le bouton + suit le dernier layout dans le défilement. Deux chevrons discrets défilent de deux onglets à la fois et se désactivent aux extrémités. La zone desktop mesure 434 px pour garder quatre layouts visibles avec ces flèches.

Les onglets gardent une largeur minimale de 72 px et s’élargissent pour afficher intégralement les noms personnalisés, sans points de suspension. La zone reste limitée et défile horizontalement.

La zone des onglets s’élargit désormais avec l’écran, jusqu’à 1 250 px : sur un grand desktop, Objets et quinze layouts aux noms standard tiennent simultanément. Sur écran plus étroit ou avec des noms longs, les flèches et le défilement restent disponibles.

En layout, le fond autour de la feuille est gris moyen et la feuille blanc cassé pour réduire la rupture visuelle avec les panneaux sombres. Le curseur et les indications deviennent foncés pour rester lisibles. Ces couleurs d’écran ne modifient pas l’export PDF.

Les onglets sont regroupés par leur contour incliné et leur fond, sans espacement entre eux. Leur hauteur est de 22 px et leur largeur minimale de 64 px ; le nom complet reste affiché. L’onglet actif a un fond plus clair et un texte renforcé.

Navigation : Z puis Entrée, puis E (Étendu), W (Fenêtre), P (Précédent), A (Tout), O (Objet sélectionné) ou S (facteur numérique), puis Entrée. Zoom Tout inclut les limites par défaut de 50 × 50 m, ou la feuille papier. Fenêtre utilise deux clics avec aperçu ; Échap annule sans toucher aux objets. Molette : zoom sous le curseur ; bouton central maintenu : déplacement ; double-clic central : Étendu. Historique séparé de 50 vues par espace, avec une entrée par rafale de molette. La navigation dans une fenêtre verrouillée est refusée.

L’aide contextuelle flotte au-dessus du champ de commande, sans espace vertical, avec le bord droit aligné. Elle ne prend aucune hauteur dans le dessin et laisse passer les clics. La complétion prend sa place pendant la saisie ; l’aide au repos est masquée.

L’en-tête affiche Fichier à gauche, Aide et Paramètres à droite. Le nom du dessin et le bouton de sauvegarde permanent sont retirés. Fichier > Sauvegarder ou Ctrl+S demande le nom du fichier dans une boîte de dialogue avant téléchargement. Annuler conserve le dessin. Sauvegarder puis créer passe par la même saisie.

L’en-tête unique mesure 42 px et accueille les outils d’architecture sous forme d’icônes. Le nom et le raccourci apparaissent au survol, avec un libellé accessible pour chaque bouton. Sur écran étroit, les outils défilent horizontalement ; Fichier, Aide et Paramètres restent accessibles.

Le logo JLG CAD ouvre désormais le menu Fichiers ; le bouton Fichiers séparé est retiré. La poubelle de la barre d’outils est supprimée et Delete conserve la suppression de la sélection.

## Un dessin par fichier

L’application affiche un seul dessin architectural par fichier, avec son espace Objet et tous ses layouts dans la barre du bas. Les onglets de dessins en haut ont été retirés. Ctrl+S télécharge directement le dessin complet et ses layouts au format natif .jlgcad, sans dialogue. Le menu Fichiers > Enregistrer le projet permet de choisir le nom du fichier. Nouveau et Ouvrir remplacent le dessin affiché, avec confirmation en cas de modifications non enregistrées.

Les anciens fichiers contenant plusieurs dessins restent lisibles : l’application récupère le dessin indiqué comme actif dans le fichier. Le fichier original reste intact. Les anciennes copies locales de collections sont conservées, et le dernier dessin affiché est repris depuis la copie locale mono-dessin.

Les onglets du bas conservent le relief, les couleurs et la pente communs, avec des hauteurs compactes de 22 px (inactif) et 28 px (actif). La barre d’outils reste masquée et non interactive en espace papier, tout en conservant sa place dans l’en-tête.

## Cercles

C puis Entrée active le cercle. Cliquez le centre, saisissez un rayon puis Entrée, ou cliquez un point de sa circonférence. Le champ dynamique affiche le rayon près du curseur, dans l’unité active ; les suffixes mm, cm et m restent acceptés. Échap annule le cercle en cours.

En sélection, cliquez l’un des quatre grips cardinaux pour ouvrir la même saisie près du grip. Le champ reçoit automatiquement le focus et sélectionne la valeur actuelle. Entrée confirme un rayon strictement positif ; Échap ferme la saisie sans modification. Le centre reste fixe et Ctrl+Z annule le changement. Cliquer la circonférence seule n’ouvre pas cette saisie.

Pour Ligne, si la souris reste sur le premier point, Entrée crée une ligne horizontale vers la droite. Une direction donnée à la souris ou un angle explicite est prioritaire.

## Cotation de diamètre

Activez Cotation (D puis Entrée), cliquez la circonférence d’un cercle puis cliquez à l’extérieur pour placer la cote. L’aperçu suit le pointeur : la ligne traverse le centre, deux flèches pleines pointent vers le cercle et la valeur est précédée de Ø. Le texte reste lisible à la création et sa taille est modifiable dans les propriétés. Les nouvelles cotations de diamètre sont liées au cercle et suivent ses modifications. Les anciennes cotations restent indépendantes. La liaison est conservée dans les fichiers JLG CAD ; les PDF/DXF exportent la géométrie et la valeur à jour.

## Cotations de diamètre liées

**DIAMÈTRE**, **DIAMETRE**, **DIMDIAMETER** ou **DDI**, puis Entrée, lance la commande réservée aux cercles. D puis Entrée conserve la cotation générale, qui reconnaît aussi les cercles.

Le rayon, le centre, les flèches et la valeur restent cohérents. Le texte garde son orientation et son écart avec le cercle. La poignée de placement permet de repositionner la cote sans changer le diamètre. Supprimer le cercle supprime ses cotations liées ; Ctrl+Z restaure tout en une action. Une cote liée sur un calque verrouillé empêche la suppression du cercle ; modifier le cercle actualise toujours la mesure.

Copier le cercle et sa cote ensemble recrée une liaison entre les copies. Copier la cote seule donne une cote indépendante. Les anciennes cotations restent indépendantes ; si un cercle est transformé en un autre type d’objet, ses cotations deviennent indépendantes.

Les fichiers natifs version 4 conservent la liaison ; les anciennes versions restent lisibles. Les exports PDF/DXF conservent le résultat actuel, sans liaison associative.
