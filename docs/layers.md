# Calques

Le bouton compact **Calques** réunit une icône de calques superposés, la couleur, le nom du calque courant et un chevron. Sa largeur reste fixe (176 px, ou 144 px sur petit écran) quel que soit le calque sélectionné. Un nom trop long est tronqué avec des points de suspension ; l’infobulle affiche toujours son nom complet. Son menu permet de choisir un calque et indique le calque courant par une coche. Les calques masqués ou verrouillés restent affichés mais ne peuvent pas devenir courants. L’entrée **Configurer les calques…**, représentée par des calques et une fenêtre de propriétés, se trouve uniquement en bas de ce menu et ouvre le tableau du document. Les menus reprennent la présentation des outils Blocs et Modifier et acceptent les flèches du clavier, Début/Fin et Échap. La barre de droite affiche le calque et les propriétés d’un objet sélectionné ; elle ne contient plus la liste permanente des calques.

## Configuration initiale

| Nom | Couleur | Épaisseur sur papier |
| --- | --- | --- |
| 0 | Blanc | 0,25 mm |
| Très épais | Blanc | 0,70 mm |
| Épais | Rouge | 0,50 mm |
| Moyen | Jaune | 0,35 mm |
| Fin | Vert | 0,18 mm |
| Très fin | Cyan (bleu clair turquoise), `#00ffff` | 0,09 mm |
| Ultra fin | Magenta (rouge rose), `#ff00ff` | 0,05 mm |

Ces préréglages s’appliquent aux nouveaux documents. Le calque **Très fin** (cyan, 0,09 mm) est sélectionné comme calque courant dès leur création. Les documents existants conservent leurs calques et leurs couleurs individuelles.

Le calque **0** est le calque de base, présent dans tout dessin. Il reçoit aussi les objets sans affectation explicite. Il ne peut être ni supprimé ni renommé dans le gestionnaire. Des dessins anciens peuvent encore l’afficher sous le nom **Dessin** : son identifiant et son nom DXF restent `0`.

## Propriétés et commandes

Chaque calque possède un nom, une couleur, un type de trait, une épaisseur, une visibilité, un verrouillage, une autorisation d’impression, une transparence et une description.

- Les types proposés sont continu, tireté, pointillé et axe. Les épaisseurs sont exprimées en millimètres sur le papier.
- La transparence va de 0 % (opaque) à 90 %. Elle s’applique aussi au PDF.
- Un calque non imprimable reste visible à l’écran, mais ses objets sont exclus du PDF. Le DXF conserve ses objets et l’indicateur de non-impression pour le logiciel destinataire.
- Un calque masqué est caché dans le dessin et dans les fenêtres de présentation. Comme auparavant, les objets masqués ne sont pas inclus dans les exports géométriques ; les définitions de calques restent présentes dans la table DXF.
- Le verrouillage interdit les modifications des objets. Pour dessiner, choisissez un calque visible et déverrouillé.
- La description est facultative, limitée à 255 caractères.

Le gestionnaire permet d’ajouter jusqu’à 200 calques et de supprimer les calques vides. Un calque utilisé dans l’espace objet, sur une feuille ou dans une définition de bloc reste protégé, tout comme le calque courant et le calque 0. Les noms doivent être valides et uniques, sans distinction de casse.

**Appliquer** valide le tableau en une seule opération, annulable avec Ctrl+Z. **Annuler**, la croix ou Échap abandonnent toutes les modifications de la fenêtre.

## Héritage des objets

Un nouvel objet utilise **Du calque** pour sa couleur, son type de trait, son épaisseur et sa transparence. Modifier ces propriétés du calque actualise les objets qui en héritent. Les propriétés de sélection permettent de choisir une valeur individuelle ou de revenir à **Du calque**.

Changer le calque d’un objet remet ces quatre propriétés sur **Du calque**, y compris celles qui avaient une valeur individuelle. On peut ensuite créer de nouvelles exceptions. Les propriétés de visibilité, de verrouillage et d’impression restent des états du calque.

## Fichiers et limites

Le format natif version 12 enregistre les propriétés de calques et les exceptions des objets. Les versions antérieures restent lisibles ; leurs couleurs explicites sont conservées.

Le DXF conserve les noms, couleurs, types de trait pris en charge, épaisseurs, visibilité, verrouillage, autorisation d’impression, transparence et description des calques. Il conserve aussi les propriétés « Du calque » ou individuelles des objets compatibles. La transparence DXF étant codée sur un octet, une légère quantification est possible. Un type de trait importé non reconnu est remplacé par un trait continu et signalé dans le bilan. Les limites existantes d’import des hachures et des présentations restent applicables.

Le PDF utilise les propriétés des objets et des calques. Le réglage monochrome d’une présentation reste disponible. Les styles de tracé et les fichiers CTB/STB sont hors du périmètre de cette modification. La comparaison visuelle des DXF dans AutoCAD reste à réaliser.
