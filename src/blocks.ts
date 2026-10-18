import {bounds,lockedShape,type Drawing,type Shape,type Point,type BlockDefinition,type BlockShape} from './model';
import {mapItem,rotateShape,translateItem} from './geometry';
import {detachDimension} from './associations';
import {detachHatch} from './hatch';

export const blockCommands=['block','insert','explode','bedit','bclose'] as const;
export function plainShapes(shapes:Shape[]):Shape[]{return shapes.flatMap(s=>s.type==='block'?plainShapes(s.entities):[s]);}
// Definitions use local coordinates. Instances carry a transformed basis and a render cache.
export function remapBlockContents(shapes:Shape[],ids:Map<string,string>):Shape[]{
 return shapes.map(s=>({...s,id:ids.get(s.id)!,...(s.type==='dimension'?{circleId:s.circleId?ids.get(s.circleId):undefined,references:s.references?.map(r=>({...r,id:ids.get(r.id)!,other:r.other?{...r.other,id:ids.get(r.other.id)!}:undefined})),angleSources:s.angleSources?.map(r=>({...r,id:ids.get(r.id)!}))}:{}),...(s.type==='hatch'?{regions:s.regions.map(r=>({...r,sourceIds:r.sourceIds.map(id=>ids.get(id)!),outerSourceIds:r.outerSourceIds?.map(id=>ids.get(id)!)}))}:{})}));
}
export function blockEntities(definition:BlockDefinition,instance:Pick<BlockShape,'a'|'b'|'yAxis'|'id'|'layerId'>):Shape[]{
 const x={x:instance.b.x-instance.a.x,y:instance.b.y-instance.a.y},y={x:instance.yAxis.x-instance.a.x,y:instance.yAxis.y-instance.a.y};
 const scale=Math.hypot(x.x,x.y),flip=x.x*y.y-x.y*y.x<0;
 const mapped=definition.shapes.map(s=>({...mapItem(rotateShape(s,{x:0,y:0},0),p=>({x:instance.a.x+p.x*x.x+p.y*y.x,y:instance.a.y+p.x*x.y+p.y*y.y}),scale,flip),layerId:(!s.layerId||s.layerId==='0')?instance.layerId:s.layerId}));
 return remapBlockContents(mapped,new Map(mapped.map(s=>[s.id,instance.id+':'+s.id])));
}
export function synchronizeBlocks(doc:Drawing):Drawing{
 const resolve=(s:Shape):Shape=>{if(s.type!=='block')return s;const definition=doc.blocks?.find(b=>b.id===s.definitionId);return definition?{...s,entities:blockEntities(definition,s)}:s;};
 return {...doc,shapes:doc.shapes.map(resolve),layouts:doc.layouts.map(l=>({...l,items:l.items.map(s=>s.type==='block'?resolve(s):s)}))};
}
export function insertBlock(doc:Drawing,definitionId:string,point:Point,scale:number,angle:number,makeId:()=>string,layerId='0'):Drawing{
 if(![point.x,point.y].every(v=>Number.isFinite(v)&&Math.abs(v)<=1e7))throw new Error('Point d’insertion invalide.');
 const definition=doc.blocks?.find(b=>b.id===definitionId);
 if(!definition)throw new Error('Choisissez un bloc à insérer.');
 if(!Number.isFinite(scale)||scale<1e-6||scale>1e5||!Number.isFinite(angle))throw new Error('Échelle ou rotation invalide.');
 if(doc.layers.find(l=>l.id===layerId)?.locked)throw new Error('Le calque est verrouillé.');
 const a=-angle*Math.PI/180,c=Math.cos(a)*scale,s=Math.sin(a)*scale;
 const instance:BlockShape={id:makeId(),type:'block',definitionId,a:point,b:{x:point.x+c,y:point.y+s},yAxis:{x:point.x-s,y:point.y+c},color:definition.shapes[0].color,layerId,entities:[]};
 instance.entities=blockEntities(definition,instance);
 const box=bounds(instance);if([box.x,box.y,box.x+box.width,box.y+box.height].some(v=>!Number.isFinite(v)||Math.abs(v)>1e7))throw new Error('Le bloc dépasse les limites du dessin.');
 return {...doc,shapes:[...doc.shapes,instance]};
}
export function blockName(name:string,blocks:BlockDefinition[]):string{
 const value=name.trim();if(!value||value.length>255||/[<>/\\":;?*|=\x00-\x1f]/.test(value))throw new Error('Nom de bloc invalide.');
 if(blocks.some(b=>b.name.toLocaleUpperCase()===value.toLocaleUpperCase()))throw new Error('Un bloc porte déjà ce nom.');
 return value;
}
export function createBlock(doc:Drawing,ids:string[],name:string,base:Point,makeId:()=>string,replace=true):Drawing{
 const selected=doc.shapes.filter(s=>ids.includes(s.id));
 if(!selected.length)throw new Error('Sélectionnez les objets du bloc.');
 if(selected.some(s=>lockedShape(doc,s)))throw new Error('Le calque est verrouillé.');
 const shapes=plainShapes(selected).map(s=>{const item=s.type==='dimension'?detachDimension(s):s.type==='hatch'?detachHatch(s):s;return translateItem(rotateShape(item,{x:0,y:0},0),-base.x,-base.y);});
 const definition:BlockDefinition={id:makeId(),name:blockName(name,doc.blocks||[]),shapes};
 let next:Drawing={...doc,blocks:[...(doc.blocks||[]),definition],shapes:replace?doc.shapes.filter(s=>!ids.includes(s.id)):doc.shapes};
 if(replace)next=insertBlock(next,definition.id,base,1,0,makeId,selected[0].layerId);
 return next;
}
export function explodeBlocks(doc:Drawing,ids:string[],makeId:()=>string):Drawing{
 const chosen=doc.shapes.filter(s=>ids.includes(s.id)&&s.type==='block');
 if(!chosen.length)throw new Error('Sélectionnez un bloc à décomposer.');
 if(chosen.some(s=>lockedShape(doc,s)))throw new Error('Le calque est verrouillé.');
 return {...doc,shapes:doc.shapes.flatMap(s=>s.type==='block'&&ids.includes(s.id)?remapBlockContents(s.entities,new Map(s.entities.map(child=>[child.id,makeId()]))): [s])};
}
export function redefineBlock(doc:Drawing,definitionId:string,shapes:Shape[]):Drawing{
 if(!shapes.length)throw new Error('Un bloc doit contenir au moins un objet.');
 if(shapes.some(s=>s.type==='block'))throw new Error('Les blocs imbriqués ne sont pas encore pris en charge dans l’éditeur.');
 return synchronizeBlocks({...doc,blocks:doc.blocks?.map(b=>b.id===definitionId?{...b,shapes}:b)});
}
export function selectionBase(shapes:Shape[]):Point{const boxes=shapes.map(bounds);return{x:Math.min(...boxes.map(b=>b.x)),y:Math.min(...boxes.map(b=>b.y))};}
