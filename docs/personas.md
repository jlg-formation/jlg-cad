# Personas de JLG CAD

Ce document sert de référence pour les décisions produit, UX et UI. Il reprend les profils décrits par le porteur du projet. Les besoins et principes d’ergonomie proposés à partir de ces descriptions restent à valider avec les personnes concernées.

## Priorité du produit

### Objectif numéro un : remplacer AutoCAD dans son travail

L’objectif principal est que l’architecte puisse cesser d’utiliser AutoCAD et travailler à sa place avec **JLG CAD**, afin de ne plus avoir à payer les licences AutoCAD qu’elle juge très coûteuses. JLG CAD doit donc être conçu pour devenir son outil de travail quotidien, au-delà d’un prototype ou d’un outil complémentaire.

Ce remplacement doit préserver ses échanges professionnels : elle doit pouvoir **recevoir et ouvrir des documents AutoCAD**, puis **envoyer des documents utilisables dans AutoCAD** à ses interlocuteurs.

- **Format privilégié : DWG**, en réception/import comme en envoi/export.
- **Solution de repli : DXF**, également dans les deux sens, lorsque le DWG n’est pas possible.
- Un export PDF sert à remettre des documents imprimables, mais ne remplace pas l’échange de fichiers CAD éditables.

La réduction du coût des licences ne doit pas se faire au prix d’une rupture dans son travail ou dans ses échanges. La fidélité des fichiers échangés doit être évaluée sur ses documents réels : plans, façades, coupes et dessins de patrimoine avec des contours irréguliers. Les pertes, conversions et éléments non pris en charge doivent être signalés clairement avant qu’elle ne s’appuie sur le résultat.

**État actuel à distinguer de l’objectif :** le prototype propose un fichier natif `.jlgcad` et un export DXF limité. Il permet un premier import DXF texte 2D avec bilan des conversions et exclusions ; l’import/export DWG reste indisponible. Il ne satisfait donc pas encore l’objectif de remplacement d’AutoCAD et d’échange bidirectionnel de fichiers AutoCAD.

La destinataire numéro un de JLG CAD est l’épouse du porteur du projet, architecte et architecte du patrimoine. Le logiciel doit d’abord répondre à son travail réel de dessin architectural. Les autres profils permettent de vérifier qu’il reste compréhensible et utilisable à différents niveaux de maîtrise.

La familiarité avec AutoCAD constitue un repère, mais ne suffit pas à justifier une interaction difficile à comprendre. L’objectif est de conserver la précision et l’efficacité du dessin professionnel tout en rendant les actions et leurs étapes lisibles.

## 1. L’architecte et architecte du patrimoine — persona principal

### Profil et pratique

Elle utilise beaucoup AutoCAD dans son activité professionnelle. Elle conçoit des maisons neuves et prépare des permis de construire. Elle produit notamment des plans, des façades et des coupes.

Elle intervient également sur le patrimoine architectural, en particulier des églises anciennes. Dans ce contexte, les murs ne sont pas nécessairement droits et la géométrie ne se réduit pas à des rectangles réguliers.

### Objectifs

- Dessiner et modifier des documents architecturaux avec précision et efficacité.
- Construire des murs et des contours avec des distances maîtrisées, par exemple deux faces séparées de 10 cm.
- Nettoyer les intersections et supprimer les petits morceaux qui dépassent.
- Représenter des contours irréguliers et des courbes adaptés au bâti ancien.
- Composer des feuilles avec différentes vues et échelles, puis produire des PDF exploitables pour ses dossiers.
- Réaliser son travail quotidien sans AutoCAD et échanger des fichiers CAD éditables avec les personnes qui continuent à l’utiliser, en DWG de préférence ou en DXF à défaut.

### Conséquences pour l’UX

- Donner une place centrale aux outils de précision : saisie des distances, unités explicites, accrochages, décalage, ajustement et prolongement.
- Permettre d’enchaîner les opérations répétitives sans relancer l’outil à chaque clic.
- Montrer le résultat attendu avant validation et rendre les erreurs faciles à annuler.
- Traiter le patrimoine comme un usage à part entière : ne pas imposer des murs droits, une grille ou l’orthogonalité.
- Distinguer une courbe libre d’un arc circulaire et expliciter les approximations qui affectent la précision.
- Rendre la préparation des plans imprimés aussi importante que le dessin dans l’espace objet.

### Situations de référence

« Je trace une première face de mur, je saisis 10 cm et je choisis le côté de la seconde face. »

« Je dessine le contour irrégulier d’un mur d’église ancienne sans devoir le ramener à une ligne droite. »

« Je prépare une feuille de dossier avec un plan, une façade ou une coupe, au cadrage et à l’échelle voulus. »

## 2. Les deux jeunes architectes salariés

### Profil et pratique

Deux salariés de l’agence sont de jeunes architectes qui manipulent également AutoCAD. Leur niveau précis de maîtrise et la répartition de leurs tâches ne sont pas encore documentés.

### Objectifs

- Pouvoir utiliser JLG CAD pour les tâches de dessin de l’agence.
- Retrouver des repères compréhensibles à partir de leur pratique d’AutoCAD.
- Passer du dessin à la mise en page et aux exports sans ambiguïté sur le résultat.

### Conséquences pour l’UX

- Employer un vocabulaire de dessin architectural cohérent : objet, présentation, fenêtre de vue, calque, décalage, ajuster.
- Garder les commandes accessibles à la souris et proposer des raccourcis visibles et personnalisables.
- Afficher clairement l’outil actif, la sélection et l’espace dans lequel une modification s’applique.
- Fournir une aide courte au bon endroit, sans imposer un parcours d’apprentissage à chaque utilisation.

### Points à valider

Leurs commandes les plus fréquentes, leur usage de l’espace papier et leurs attentes concernant les échanges de fichiers avec AutoCAD.

## 3. Le salarié expérimenté, âgé de 75 à 80 ans

### Profil et pratique

Cette personne travaille également avec AutoCAD dans l’agence. Elle n’utilise pas les outils informatiques au quotidien de manière générale, mais maîtrise quelques procédures qui lui permettent notamment de dessiner et de sauvegarder. Elle ne maîtrise pas l’espace papier.

L’âge ne doit pas être utilisé pour déduire des difficultés visuelles, motrices ou cognitives qui n’ont pas été décrites. Le besoin connu porte sur des procédures familières et sur l’apprentissage de la mise en page.

### Objectifs

- Continuer à dessiner et sauvegarder avec des étapes stables et identifiables.
- Comprendre comment passer du dessin à une feuille imprimable.
- Pouvoir retrouver une commande ou corriger une erreur sans dépendre d’un raccourci mémorisé.

### Conséquences pour l’UX

- Conserver des libellés explicites, des emplacements stables et des commandes visibles.
- Éviter que les fonctions essentielles soient accessibles uniquement par une icône, un survol, un double-clic ou une touche.
- Proposer une explication progressive de l’espace papier : choisir une feuille, créer une fenêtre, cadrer, régler l’échelle, exporter.
- Indiquer sans ambiguïté si une action modifie le dessin, la fenêtre de vue ou la feuille.
- Garder Annuler, Rétablir et Sauvegarder faciles à retrouver ; expliquer ce qui vient d’être fait.
- Prévoir des boutons lisibles, un contraste suffisant et une utilisation au clavier, au bénéfice de tous les utilisateurs.

### Situation de référence

« Mon dessin est terminé. Je veux obtenir un PDF à la bonne échelle, avec une suite d’étapes que je peux refaire la prochaine fois. »

## 4. Le porteur du projet — consultant, formateur en IA et auteur du logiciel

### Profil et pratique

Il est consultant et formateur en intelligence artificielle. Il porte le projet et participe à la création du logiciel avec l’assistance de développement.

Il souhaite dessiner et comprendre le fonctionnement d’AutoCAD, mais se sent débutant en dessin CAD. Bien qu’à l’aise en informatique, il trouve l’ergonomie d’AutoCAD difficile à prendre en main. Son expérience rappelle que la compétence informatique générale ne remplace pas la connaissance des conventions du CAD.

### Objectifs

- Comprendre la logique des outils en les utilisant.
- Réaliser un dessin simple sans devoir apprendre d’abord un grand nombre de commandes.
- Comprendre les unités, la sélection, les transformations et la différence entre espace objet et espace papier.
- Évaluer et faire évoluer le logiciel à partir de l’expérience réelle de l’agence.

### Conséquences pour l’UX

- Expliquer les étapes d’un outil : quoi sélectionner, quoi saisir, où cliquer et comment terminer.
- Donner un retour visuel immédiat et afficher les unités et valeurs utiles.
- Permettre de découvrir les raccourcis progressivement, sans les rendre obligatoires.
- Préférer des exemples concrets d’architecture à des explications centrées sur l’implémentation technique.
- Ne pas laisser les préférences du développeur prendre le pas sur les besoins du persona principal.

### Situation de référence

« Je veux dessiner un mur de 10 cm d’épaisseur et comprendre chaque étape, sans connaître la commande AutoCAD correspondante. »

## Critères communs pour les évolutions

### Démarche d’évolution et retours utilisateurs

JLG CAD est destiné à évoluer progressivement. Le porteur du projet observera le fonctionnement d’AutoCAD pour identifier des fonctionnalités importantes et intéressantes, puis demandera leur intégration au fil du développement. Cette exploration demande du temps ; elle ne suppose pas de définir dès maintenant une liste exhaustive des fonctions à reproduire.

Il prévoit également de faire essayer JLG CAD à son épouse pour recueillir ce qu’elle apprécie, ce qui lui déplaît et ce qui lui manque. Ces essais doivent aider à confronter les choix de conception à son travail réel et à préciser les prochaines priorités. Ils sont prévus, mais ne constituent pas encore des retours recueillis ni une validation du logiciel.

Pour chaque essai, une trace courte peut consigner :

- La tâche qu’elle cherchait à accomplir et le type de document utilisé.
- Ce qu’elle a réussi à faire, ce qui l’a bloquée et les étapes difficiles à comprendre.
- Ce qu’elle a apprécié ou souhaité changer, en conservant ses mots lorsque possible.
- Le contournement éventuel, notamment le besoin de retourner dans AutoCAD.
- L’amélioration envisagée et le résultat à vérifier lors d’un prochain essai.

La priorité d’une fonctionnalité dépend de son utilité dans le travail de l’architecte principale, de la fréquence du besoin et des obstacles rencontrés. La présence d’une fonction dans AutoCAD constitue une référence ; son intégration dans JLG CAD doit aussi tenir compte des besoins de précision, d’échange de fichiers et de compréhension décrits dans ce document.

Avant de retenir une interaction, vérifier :

1. Est-elle précise et assez rapide pour le travail de l’architecte principale ?
2. Convient-elle aussi aux contours irréguliers du patrimoine ?
3. Son déroulement est-il compréhensible sans connaître les conventions d’AutoCAD ?
4. Existe-t-il une commande visible en plus du raccourci éventuel ?
5. L’utilisateur sait-il ce qui sera modifié et comment annuler ?
6. Le passage à une feuille et à un PDF à l’échelle est-il explicable pas à pas ?
7. Cette évolution rapproche-t-elle JLG CAD du remplacement d’AutoCAD dans son travail quotidien ?
8. Préserve-t-elle la réception et l’envoi de documents AutoCAD éditables, avec une fidélité vérifiée et des limites explicites ?

Ces critères guident la conception ; ils ne constituent pas une validation par les utilisateurs. Des essais avec chacun des profils permettront de préciser les difficultés, les priorités et les habitudes à préserver.
