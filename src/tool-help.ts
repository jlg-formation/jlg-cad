import type {Tool} from './architecture';
import type {Language} from './i18n';

type Text = readonly [string, string];
const descriptions = {
 select:['Sélectionnez des objets pour consulter ou modifier leurs propriétés.','Select objects to inspect or edit their properties.'],
 pan:['Déplacez la vue sur le dessin.','Move the view across the drawing.'],
 line:['Tracez une suite de segments indépendants.','Draw a series of independent line segments.'],
 rect:['Tracez un rectangle à partir de deux coins opposés.','Draw a rectangle using two opposite corners.'],
 circle:['Tracez un cercle à partir de son centre et de son rayon.','Draw a circle using its center and radius.'],
 arc:['Tracez un arc passant par trois points.','Draw an arc through three points.'],
 polyline:['Construisez un contour composé de segments droits ou d’arcs.','Build a path from straight segments or arcs.'],
 bezier:['Tracez une courbe passant par plusieurs points. Ses poignées seront modifiables après création.','Draw a curve through several points. Its handles can be edited after creation.'],
 text:['Placez un texte, puis modifiez son contenu et son apparence.','Place text, then edit its content and appearance.'],
 viewport:['Créez une fenêtre sur le dessin dans une présentation.','Create a drawing viewport on a layout.'],
 hatch:['Remplissez une zone fermée avec un motif.','Fill an enclosed area with a pattern.'],
 move:['Déplacez les objets retenus vers une nouvelle position.','Move the chosen objects to a new position.'],
 copy:['Créez des copies des objets retenus.','Create copies of the chosen objects.'],
 scale:['Redimensionnez les objets autour d’un point de base.','Scale objects around a base point.'],
 rotate:['Faites tourner les objets sélectionnés autour d’un point de base.','Rotate selected objects around a base point.'],
 mirror:['Créez une symétrie d’un objet par rapport à un axe.','Reflect an object across an axis.'],
 offset:['Créez une forme parallèle à une distance donnée.','Create a parallel shape at a specified distance.'],
 trim:['Enlevez des portions d’objets en cliquant ou en balayant.','Remove parts of objects by clicking or sweeping.'],
 extend:['Prolongez une extrémité jusqu’à une limite. Une Bézier suit sa tangente.','Extend an endpoint to a boundary. A Bézier follows its tangent.'],
 join:['Réunissez des objets compatibles en un seul objet.','Combine compatible objects into one object.'],
 fillet:['Raccordez deux lignes à leur intersection avec un rayon nul.','Connect two lines at their intersection with zero radius.'],
 measure:['Mesurez une distance, les écarts X/Y et un angle.','Measure a distance, X/Y differences and an angle.'],
 dimension:['Créez une cote de diamètre ou une cote entre deux points.','Create a diameter dimension or a dimension between two points.'],
 linearDimension:['Créez une cote horizontale ou verticale.','Create a horizontal or vertical dimension.'],
 diameter:['Cotez le diamètre d’un cercle. La cote reste liée au cercle.','Dimension a circle’s diameter. The dimension stays linked to the circle.'],
} satisfies Record<Tool, Text>;

export type HelpState = {
 tool:Tool; points?:number; nodes?:number; hasDraft?:boolean; hasSource?:boolean;
 sourceIsCircle?:boolean; selection?:number; selectingArea?:boolean; lasso?:boolean;
 choosingBoundaries?:boolean; boundaries?:number; sweeping?:boolean;
 offsetReady?:boolean; segment?:'line'|'arc'; closed?:boolean;
 linearSelectObject?:boolean; hatchMode?:'pick'|'objects'; hatchCount?:number;
 hatchOrigin?:boolean; joinTargets?:boolean; measurement?:boolean; pendingOption?:'close'|'undo';
};
export type HelpHint = {key:'finish'|'escape'|'literal'; text:string; literal?:string};

// Instructions depend on confirmed construction state, never on pointer coordinates.
export function toolHelp(state:HelpState, language:Language='fr') {
 const {tool}=state, n=state.points||0, nodes=state.nodes||0;
 const text=(fr:string,en:string)=>language==='fr'?fr:en;
 const hints:HelpHint[]=[];
 const hint=(key:HelpHint['key'],fr:string,en:string,literal?:string)=>hints.push({key,text:text(fr,en),literal});
 let instruction='';
 switch(tool){
 case 'select': instruction=state.hatchOrigin?text('Cliquez la nouvelle origine du motif.','Click the new pattern origin.'):state.selectingArea?text('Terminez la zone de sélection. Maj retire des objets de la sélection.','Complete the selection area. Shift removes objects from the selection.'):state.selection?text('Consultez les propriétés de la sélection ci-dessous.','Inspect the selection properties below.'):text('Cliquez un objet ou définissez une zone de sélection.','Click an object or define a selection area.');break;
 case 'pan': instruction=text('Maintenez le bouton gauche et faites glisser pour déplacer la vue.','Hold the left mouse button and drag to pan.');break;
 case 'line': instruction=state.hasDraft?text('Cliquez le point suivant, ou saisissez une longueur puis Entrée.','Click the next point, or enter a length and press Enter.'):text('Cliquez le premier point.','Click the first point.');break;
 case 'rect': instruction=state.hasDraft?text('Indiquez le coin opposé, ou saisissez la largeur et la hauteur puis Entrée.','Specify the opposite corner, or enter width and height and press Enter.'):text('Cliquez le premier coin du rectangle.','Click the first rectangle corner.');break;
 case 'circle': instruction=state.hasDraft?text('Cliquez un point du cercle, ou saisissez le rayon puis Entrée.','Click a point on the circle, or enter the radius and press Enter.'):text('Cliquez le centre du cercle.','Click the circle center.');break;
 case 'arc': instruction=n===0?text('Cliquez le point de départ de l’arc.','Click the arc start point.'):n===1?text('Cliquez un point sur l’arc.','Click a point on the arc.'):text('Cliquez le point final de l’arc.','Click the arc end point.');break;
 case 'polyline': case 'bezier': instruction=!nodes?text('Cliquez le premier sommet.','Click the first vertex.'):tool==='bezier'?text('Cliquez le prochain point de passage.','Click the next through point.'):state.segment==='arc'?text('Cliquez le prochain sommet de l’arc.','Click the next arc vertex.'):text('Cliquez le prochain sommet du segment droit.','Click the next straight segment vertex.');break;
 case 'text': instruction=text('Cliquez pour placer le texte, puis modifiez son contenu ci-dessous.','Click to place text, then edit its content below.');break;
 case 'viewport': instruction=state.hasDraft?text('Terminez le rectangle de la fenêtre sur la feuille.','Complete the viewport rectangle on the sheet.'):text('Faites glisser sur la feuille pour définir la fenêtre.','Drag on the sheet to define the viewport.');break;
 case 'hatch': instruction=state.hatchOrigin?text('Cliquez le point d’origine du motif.','Click the pattern origin.'):state.hatchMode==='objects'?text('Sélectionnez les objets du contour et les îlots, puis créez la hachure.','Select boundary objects and islands, then create the hatch.'):text('Cliquez à l’intérieur d’une zone fermée.','Click inside an enclosed area.');break;
 case 'move': case 'copy': instruction=!state.hasSource?text('Sélectionnez un objet à transformer.','Select an object to transform.'):!n?text('Cliquez le point de base.','Click the base point.'):text('Cliquez la destination, ou indiquez la direction et saisissez une distance puis Entrée.','Click the destination, or indicate a direction and enter a distance followed by Enter.');break;
 case 'scale': instruction=!state.hasSource?text('Sélectionnez les objets à redimensionner.','Select objects to scale.'):!n?text('Cliquez le point de base qui restera fixe.','Click the base point that will remain fixed.'):text('Saisissez un facteur positif puis Entrée, ou cliquez.','Enter a positive factor and press Enter, or click.');break;
 case 'rotate': instruction=!state.hasSource?text('Sélectionnez les objets à faire tourner.','Select the objects to rotate.'):!n?text('Cliquez le point de base de la rotation.','Click the rotation base point.'):text('Saisissez l’angle puis Entrée, ou cliquez la direction voulue.','Enter an angle and press Enter, or click the desired direction.');break;
 case 'mirror': instruction=!state.hasSource?text('Sélectionnez l’objet à mettre en miroir.','Select the object to mirror.'):!n?text('Cliquez le premier point de l’axe de symétrie.','Click the first point of the mirror axis.'):text('Cliquez le second point de l’axe de symétrie.','Click the second point of the mirror axis.');break;
 case 'offset': instruction=!state.offsetReady?text('Saisissez la distance dans le champ du dessin puis Entrée.','Enter the distance in the drawing input and press Enter.'):!state.hasSource?text('Sélectionnez l’objet à décaler.','Select the object to offset.'):text('Cliquez du côté où créer le décalage.','Click on the side where the offset should be created.');break;
 case 'trim': case 'extend': instruction=state.choosingBoundaries?text('Cliquez les limites, puis validez le choix.','Click the boundaries, then confirm the choice.'):state.sweeping?text('Relâchez pour valider le balayage.','Release to confirm the sweep.'):tool==='trim'?text('Cliquez un morceau à enlever, ou maintenez le bouton gauche et balayez.','Click a part to remove, or hold the left mouse button and sweep.'):text('Cliquez près de l’extrémité à prolonger.','Click near the endpoint to extend.');break;
 case 'join': instruction=state.joinTargets?text('Sélectionnez les objets compatibles à joindre à la source, puis validez.','Select compatible objects to join to the source, then confirm.'):state.selection===1?text('Utilisez cet objet comme source, ou sélectionnez plusieurs objets à joindre.','Use this object as the source, or select several objects to join.'):text('Sélectionnez les objets à joindre, puis validez.','Select the objects to join, then confirm.');break;
 case 'fillet': instruction=state.hasSource?text('Cliquez près de l’extrémité de la seconde ligne.','Click near the endpoint of the second line.'):text('Cliquez près de l’extrémité de la première ligne.','Click near the endpoint of the first line.');break;
 case 'measure': instruction=n===1?text('Cliquez le second point à mesurer.','Click the second measurement point.'):state.measurement?text('Consultez le résultat, ou cliquez pour commencer une nouvelle mesure.','Read the result, or click to start a new measurement.'):text('Cliquez le premier point à mesurer.','Click the first measurement point.');break;
 case 'dimension': case 'diameter': case 'linearDimension':
 instruction=state.sourceIsCircle?text('Cliquez pour placer la cote de diamètre.','Click to place the diameter dimension.'):n>=2?text('Déplacez le pointeur puis cliquez pour placer la cote.','Move the pointer, then click to place the dimension.'):n===1?text('Cliquez le second point à coter.','Click the second point to dimension.'):tool==='diameter'?text('Cliquez la circonférence d’un cercle.','Click a circle circumference.'):state.linearSelectObject?text('Cliquez un côté droit à coter. Avec Cotation, vous pouvez aussi choisir un cercle.','Click a straight side to dimension. With Dimension, you may also choose a circle.'):text('Cliquez le premier point à coter, ou choisissez un côté avec Entrée.','Click the first point to dimension, or press Enter to select a side.');break;
 }
 if(state.pendingOption==='close')instruction=text('Appuyez sur Entrée pour confirmer la fermeture du contour.','Press Enter to confirm closing the path.');
 if(state.pendingOption==='undo')instruction=text('Appuyez sur Entrée pour annuler le dernier segment.','Press Enter to undo the last segment.');
 if(tool==='line'){
  hint('finish','terminer la suite de lignes','finish the line series');
  if(state.hasDraft){hint('literal','fermer la suite','close the series','C ↵');hint('literal','annuler le dernier segment','undo the last segment','U ↵');}
 }
 if(tool==='polyline'||tool==='bezier'){
  hint('finish','terminer le chemin (au moins deux points)','finish the path (at least two points)');
  if(tool==='polyline'&&nodes)hint('literal','fermer le contour (au moins trois sommets)','close the path (at least three vertices)','C ↵');
 }
 if(state.choosingBoundaries)hint('finish','valider les limites (au moins une)','confirm boundaries (at least one)');
 if(tool==='join')hint('finish','utiliser la source ou joindre la sélection','use the source or join the selection');
 if(tool==='linearDimension'&&!n&&!state.linearSelectObject)hint('finish','choisir un côté à coter','select a side to dimension');
 if(tool==='hatch')hint('finish',state.hatchOrigin?'revenir au choix de zone':state.hatchMode==='objects'&&(state.hatchCount||0)>0?'créer la hachure':'terminer les hachures',state.hatchOrigin?'return to area selection':state.hatchMode==='objects'&&(state.hatchCount||0)>0?'create the hatch':'finish hatching');
 if(tool==='trim'&&!state.choosingBoundaries||tool==='offset'&&state.offsetReady)hint('finish','quitter l’outil','leave the tool');
 if(tool==='line'||tool==='hatch'||(tool==='polyline'||tool==='bezier')&&nodes>=2)hint('escape','quitter en conservant les éléments confirmés','leave keeping confirmed elements');
 else if(state.sweeping)hint('escape','annuler le balayage','cancel the sweep');
 else if(tool==='select'&&state.selectingArea)hint('escape','annuler la sélection en cours','cancel the current selection');
 else if(tool==='select'&&state.selection)hint('escape','désélectionner les objets','deselect objects');
 else if(tool==='circle'&&state.hasDraft)hint('escape','annuler le cercle en cours','cancel the current circle');
 else if(tool==='viewport'&&state.hasDraft)hint('escape','quitter en conservant la fenêtre si ses dimensions sont valides','leave keeping the viewport if its dimensions are valid');
 else if(tool!=='select')hint('escape','quitter l’outil','leave the tool');
 return {description:descriptions[tool][language==='fr'?0:1],instruction,hints};
}
