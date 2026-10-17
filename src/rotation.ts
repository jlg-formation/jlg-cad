import {parseAngle,rotateShape} from './geometry';
import {lockedShape,type Drawing,type Point} from './model';

export function rotationAngle(base:Point,pointer:Point,text:string):number {
 return text.trim()?parseAngle(text):-Math.atan2(pointer.y-base.y,pointer.x-base.x)*180/Math.PI;
}

export function rotateSelection(doc:Drawing,ids:string[],base:Point,angle:number):Drawing {
 const selected=new Set(ids),shapes=doc.shapes.filter(s=>selected.has(s.id));
 if(!shapes.length)throw new Error('Sélectionnez des objets à tourner.');
 if(!Number.isFinite(angle))throw new Error('Saisissez un angle en degrés.');
 if(shapes.some(s=>lockedShape(doc,s)))throw new Error('Le calque est verrouillé.');
 return {...doc,shapes:doc.shapes.map(s=>selected.has(s.id)?rotateShape(s,base,angle):s)};
}
