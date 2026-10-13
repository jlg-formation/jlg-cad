import {synchronizeHatches} from './hatch';
import type {Drawing,PaperItem,Shape} from './model';
import {add,sub,mul,distance,diameterDimension} from './geometry';

export function detachDimension<T extends Shape>(shape:T):T {
 if(shape.type!=='dimension'||!shape.circleId)return shape;
 const {circleId,...rest}=shape;return rest as T;
}
export function synchronizeDimensions(shapes:Shape[],previous:Shape[]=[]):Shape[]{
 const byId=new Map(shapes.map(s=>[s.id,s])),oldById=new Map(previous.map(s=>[s.id,s]));
 return shapes.flatMap(s=>{
  if(s.type!=='dimension'||s.kind!=='diameter'||!s.circleId)return[s];
  const circle=byId.get(s.circleId);
  if(circle?.type!=='circle'){
   // Deleting a parent deletes its dimensions. Replacing it by another type detaches them.
   if(!circle&&oldById.get(s.circleId)?.type==='circle')return[];
   return[detachDimension(s)];
  }
  const length=distance(s.a,s.b),direction=length?mul(sub(s.a,s.b),1/length):{x:-1,y:0},radius=distance(circle.a,circle.b);
  const old=oldById.get(s.id),oldCircle=oldById.get(s.circleId);
  if(old?.type==='dimension'&&oldCircle?.type==='circle'&&distance(oldCircle.a,circle.a)<1e-8&&distance(oldCircle.b,circle.b)<1e-8&&(distance(old.a,s.a)>1e-8||distance(old.b,s.b)>1e-8)){
   const center=mul(add(s.a,s.b),.5);
   if(distance(center,circle.a)>1e-8){const placed=diameterDimension(circle,add(s.a,mul(direction,Math.abs(s.offset))),s,s.height);return[{...placed,circleId:circle.id}];}
  }
  return[{...s,a:add(circle.a,mul(direction,radius)),b:sub(circle.a,mul(direction,radius))}];
 });
}
export function synchronizeDrawing(next:Drawing,previous?:Drawing):Drawing {
 return {...next,shapes:synchronizeHatches(synchronizeDimensions(next.shapes,previous?.shapes),previous?.shapes),layouts:next.layouts.map(l=>{
  const onlyShapes=(items:PaperItem[])=>items.filter((s):s is Shape=>s.type!=='text'&&s.type!=='viewport');
  const resolved=new Map(synchronizeHatches(synchronizeDimensions(onlyShapes(l.items),onlyShapes(previous?.layouts.find(p=>p.id===l.id)?.items||[])),onlyShapes(previous?.layouts.find(p=>p.id===l.id)?.items||[])).map(s=>[s.id,s]));
  return {...l,items:l.items.flatMap<PaperItem>(s=>s.type==='text'||s.type==='viewport'?[s]:resolved.has(s.id)?[resolved.get(s.id)!]:[])};
 })};
}
