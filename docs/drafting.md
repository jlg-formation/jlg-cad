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
