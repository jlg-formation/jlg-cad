# Commandes et saisie dynamique

La polyligne est le premier outil de dessin. L’outil Mur a été retiré.

- Taper **PL**, puis **Entrée** ou **Espace**, lance Polyligne. Les noms PLINE, POLYLINE et POLYLIGNE sont également reconnus.
- Taper **L**, puis **Entrée** ou **Espace**, lance Ligne.
- La liste de complétion apparaît pendant la frappe. Les flèches changent la proposition ; Entrée valide. Échap efface la commande.
- Après le premier point, orienter la souris puis taper une longueur. Le champ apparaît près du tracé, sans clic préalable. Entrée crée le segment. Pour une polyligne, la valeur ne s’applique qu’à ce segment ; Entrée sans valeur termine le chemin.
- Les chiffres du clavier et du pavé numérique, les virgules et les points sont acceptés. Une longueur invalide est signalée sans créer de segment.
- ORTHO (F8) contraint la direction. Maj inverse temporairement ORTHO. Une longueur explicite garde sa précision, même près d’un accrochage.
- Ligne accepte deux clics ou un glissement. Échap annule le tracé en cours.

Dans **Paramètres** (engrenage), choisir l’unité de saisie et d’affichage : mètres par défaut, centimètres ou millimètres. Le choix est conservé dans ce navigateur. Une valeur sans suffixe utilise cette unité ; un suffixe explicite la remplace pour cette saisie. Changer l’unité ne redimensionne aucun objet. Les fichiers et exports conservent leurs unités internes en millimètres. L’espace papier et les hauteurs de texte imprimées restent en millimètres.

Les commandes par lettres demandent maintenant une validation. Les raccourcis de fonction et les combinaisons comme Ctrl+S restent immédiats.

## Sélection et poignées

La sélection affiche des poignées bleues de taille constante à l’écran, y compris avec Ctrl+A. Les carrés déplacent les sommets ; les poignées allongées au milieu d’une ligne ou d’un segment de polyligne déplacent ses deux extrémités ensemble. Les rectangles ont des poignées aux coins ; les cercles au centre et aux quatre points cardinaux. Les calques verrouillés ne proposent pas de poignées de modification. ORTHO et les accrochages restent actifs pendant la manipulation. Ctrl+Z annule la modification ; Échap annule une manipulation en cours. Les accrochages aux extrémités et milieux fonctionnent aussi sans sélection.

Un réticule de 86 pixels avec carré central remplace le curseur dans la zone de dessin.

Au démarrage et au retour dans Objet, la vue affiche au moins 50 m dans chaque direction. Sur un écran rectangulaire, la direction la plus longue montre davantage de terrain pour conserver les proportions. Un segment de 5 m représente moins d’un dixième du petit côté. La grille adapte son espacement au zoom.

L’indicateur d’origine suit les dimensions du dessin : 5 m vers la droite et le haut, 2,5 m vers la gauche et le bas. Son épaisseur reste constante à l’écran.

La vue initiale réserve une marge autour des branches négatives pour afficher toute la croix. Les branches positives portent une pointe de flèche et les lettres X et Y, de taille constante à l’écran.
Un point et la lettre O identifient l’intersection des axes comme origine.
Les instructions sont affichées dans la barre de statut, sans texte d’aide superposé à l’indicateur d’origine.

Pendant le tracé d’une polyligne, C puis Entrée ferme le contour après au moins trois sommets. Le dernier sommet est relié au premier sans duplication. Cette action est annulable et ne change pas le réglage de fermeture des prochains tracés. Dans le champ de commande, C puis Entrée produit la même fermeture.

ORTHO se bascule avec F8 ou Ctrl+L. Les anciennes préférences conservant uniquement le raccourci standard F8 reçoivent aussi Ctrl+L.

Le curseur affiche son carré central en sélection. Pendant un outil, la croix reste visible sans carré. Échap conserve les segments validés de la polyligne en cours sous forme de chemin ouvert et revient à la sélection, y compris pendant une saisie de longueur ou de commande.

Échap ignore le segment de prévisualisation et une longueur non confirmée. Un seul sommet ne crée pas d’objet. Les objets existants restent conservés. C prépare la fermeture ; seule Entrée la confirme.

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

## Onglets de dessin et fichier multi-dessins

Les dessins sont accessibles dans des onglets à droite de l’en-tête, sans augmenter sa hauteur. Le bouton + et Fichiers > Nouveau dessin créent un modèle indépendant. Chaque onglet conserve ses objets, calques, layouts, cadrage et historiques d’annulation et de zoom pendant la session. Changer de dessin conserve les segments validés d’une polyligne en cours. Les raccourcis concernent uniquement le dessin actif.

Enregistrer / Ctrl+S télécharge un seul fichier `.jlgcad` JSON contenant **tous** les onglets, leurs modèles et leurs layouts, ainsi que l’index du dessin actif. Le format de collection est `jlg-cad-workspace`, version 1, avec `name`, `drawings` et `activeDrawing`. Chaque entrée `drawings` utilise le format de dessin existant version 3. Les anciens fichiers mono-dessin restent lisibles ; les extensions `.jlgcad`, `.jlcad` et `.json` sont acceptées à l’ouverture. Ouvrir ajoute les dessins contenus dans le fichier aux onglets ouverts, sans écraser les dessins existants. Les exports DXF et PDF concernent le dessin actif.

Une étoile indique les modifications non enregistrées dans un fichier. La croix de chaque onglet demande confirmation pour tout dessin contenant des objets ou des layouts, même déjà enregistré. Un onglet entièrement vide (aucun objet et aucun layout) est supprimé directement. Le dialogue nomme le dessin et précise que tous ses objets et layouts seront supprimés du projet et exclus des prochaines sauvegardes. Le dialogue propose uniquement Annuler et Supprimer. Annuler (ou Échap) conserve le dessin. Annuler est sélectionné par défaut. Supprimer le dernier onglet crée un dessin vide. Les dessins ouverts et l’onglet actif sont restaurés depuis le stockage local au rechargement ; les historiques d’annulation et les cadrages de navigation sont conservés pendant la session, pas sérialisés dans le fichier.

Double-cliquer le nom d’un onglet de dessin permet de le modifier sur place. Entrée valide le nom (les espaces aux extrémités sont retirés ; un nom vide est refusé). Échap ou sortir du champ annule. Le nouveau nom est conservé localement et inclus dans le fichier multi-dessins à la prochaine sauvegarde.

Les onglets Objet/Layout du footer partagent les couleurs, le relief et la pente des onglets de dessin de l’en-tête, avec des hauteurs plus compactes de 22 px (inactif) et 28 px (actif). La barre d’outils d’architecture conserve sa place dans l’en-tête en espace papier : elle est masquée et non interactive, sans déplacer les onglets.

La commande Enregistrer le projet / Ctrl+S et son dialogue sont globaux au projet. Un seul téléchargement contient tous les onglets, y compris les dessins inactifs. Les étoiles restent propres aux dessins modifiés, mais sont toutes effacées par cette unique sauvegarde globale.

Ctrl+S enregistre directement tous les dessins et layouts dans un seul fichier, sans dialogue, avec le nom actuel du projet (Dessins.jlgcad par défaut). La commande du menu Fichiers conserve le dialogue pour choisir un autre nom. Les segments validés de la polyligne en cours sont inclus avant le téléchargement.
