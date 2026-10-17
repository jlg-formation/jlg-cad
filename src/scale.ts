import {distance,mapItem,parseLength} from './geometry';
import {bounds,lockedShape,type Drawing,type Point,type Shape} from './model';
export function scaleFactor(base:Point,pointer:Point,text:string,source:Shape,reference='',target=''):number {
 const box=bounds(source);
 const value=reference.trim()||target.trim()?parseLength(target)/parseLength(reference):text.trim()?Number(text.trim().replace(',','.')):distance(base,pointer)/Math.max(Math.hypot(box.width,box.height),.001);
 if(!Number.isFinite(value)||value<=0)throw new Error('Le facteur d’échelle doit être strictement positif.');
 if(reference.trim()&&parseLength(reference)<=0||target.trim()&&parseLength(target)<=0)throw new Error('Les longueurs doivent être positives.');
 return value;
}
export function scaleSelection(doc:Drawing,ids:string[],base:Point,factor:number,copyId?:()=>string):Drawing {
 const selected=new Set(ids),shapes=doc.shapes.filter(s=>selected.has(s.id));
 if(!shapes.length)throw new Error('Sélectionnez des objets à redimensionner.');
 if(!Number.isFinite(factor)||factor<=0)throw new Error('Le facteur d’échelle doit être strictement positif.');
 if(shapes.some(s=>lockedShape(doc,s)))throw new Error('Le calque est verrouillé.');
 const copies=new Map(shapes.map(s=>[s.id,copyId?copyId():s.id]));
 const transform=(s:Shape):Shape=>{
  const next=mapItem(s,p=>({x:base.x+(p.x-base.x)*factor,y:base.y+(p.y-base.y)*factor}),factor);
  next.id=copies.get(s.id)!;
  if(copyId&&next.type==='dimension'&&next.circleId)next.circleId=copies.get(next.circleId);
  if(copyId&&next.type==='hatch'){next.associative=false;next.regions=next.regions.map(r=>({...r,sourceIds:[],outerSourceIds:[]}));}
  return next;
 };
 return {...doc,shapes:copyId?[...doc.shapes,...shapes.map(transform)]:doc.shapes.map(s=>selected.has(s.id)?transform(s):s)};
}
