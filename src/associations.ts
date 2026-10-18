import {resolveDimensionReference,projectPaperDimension,paperDimensionOutside} from './paper-dimensions';
import {lineAngleDefinition} from './dimension-kinds';
import {synchronizeHatches} from './hatch';
import type {Drawing,PaperItem,Shape} from './model';
import {add,sub,mul,distance,diameterDimension,segments,at} from './geometry';

export function detachDimension<T extends Shape>(shape:T):T {
 if(shape.type!=='dimension')return shape;
 const {circleId,references,angleSources,...rest}=shape;return rest as T;
}
function dimensionResolver(shapes:Shape[],previous:Shape[]=[]){
 const byId=new Map(shapes.map(s=>[s.id,s])),oldById=new Map(previous.map(s=>[s.id,s]));
 return (s:Shape):Shape[]=>{
  if(s.type!=='dimension'||s.paperLink)return [s];
  if(s.references?.length||s.angleSources?.length){
   const points=(s.points||[s.a,s.b]).map(p=>({...p})),refs=s.references||[],retained:typeof refs=[];
   let sweep=s.sweep;
   for(const ref of refs){
    const source=byId.get(ref.id);if(!source||['dimension','hatch','text'].includes(source.type))continue;
    const old=oldById.get(ref.id);if(old&&old.type!==source.type)continue;if(old?.type==='polyline'&&source.type==='polyline'&&old.nodes.length!==source.nodes.length)continue;
    const part=segments(source)[ref.segment];if(!part)continue;
    const point=resolveDimensionReference(ref,byId,points[ref.point]);
    if(!point)continue;points[ref.point]=point;retained.push(ref);
    if(s.kind==='arcLength'&&part.kind==='arc')sweep=part.sweep;
   }
   if(s.points&&retained.length!==refs.length&&['radius','arcLength','diameter','jogged','angular'].includes(s.kind||''))return [detachDimension(s)];
   let angleSources=s.angleSources;
   if(angleSources){
    const [a,b]=angleSources.map(r=>byId.get(r.id));
    try{if(!a||!b)throw new Error('Source supprimée');const p=segments(a)[angleSources[0].segment],q=segments(b)[angleSources[1].segment];if(!p||!q)throw new Error('Segment supprimé');const next=lineAngleDefinition(a,b,at(p,angleSources[0].position),at(q,angleSources[1].position));points.splice(0,3,...next);}catch{angleSources=undefined;}
   }
   return [{...s,a:s.kind==='ordinate'?points[1]:points[0],b:s.kind==='ordinate'?points[2]:points[1],...(s.points?{points}:{}),references:retained.length?retained:undefined,angleSources,sweep}];
  }
  if(s.kind!=='diameter'||!s.circleId)return[s];
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
 };
}
export function synchronizeDimensions(shapes:Shape[],previous:Shape[]=[]):Shape[]{return shapes.flatMap(dimensionResolver(shapes,previous));}
export function synchronizeDrawing(next:Drawing,previous?:Drawing):Drawing {
 const resolveModelDimension=dimensionResolver(next.shapes,previous?.shapes),modelById=new Map(next.shapes.map(s=>[s.id,s]));
 return {...next,shapes:synchronizeHatches(synchronizeDimensions(next.shapes,previous?.shapes),previous?.shapes),layouts:next.layouts.map(l=>{
  const onlyShapes=(items:PaperItem[])=>items.filter((s):s is Shape=>s.type!=='text'&&s.type!=='viewport');
  const resolved=new Map(synchronizeHatches(synchronizeDimensions(onlyShapes(l.items),onlyShapes(previous?.layouts.find(p=>p.id===l.id)?.items||[])),onlyShapes(previous?.layouts.find(p=>p.id===l.id)?.items||[])).map(s=>[s.id,s]));
  return {...l,items:l.items.flatMap<PaperItem>(s=>{
   if(s.type==='dimension'&&s.paperLink){
    const v=l.items.find((v):v is import('./model').Viewport=>v.type==='viewport'&&v.id===s.paperLink!.viewportId);
    if(!v)return [{...s,paperHidden:false,associationWarning:'Fenêtre supprimée : cote détachée, dernière valeur conservée.',paperLink:{model:detachDimension(s.paperLink.model)}}];
    // A temporary ID avoids collisions between the model and a presentation.
    let key='paper:'+s.id;while(modelById.has(key))key+=':';
    const definition={...s.paperLink.model,id:key};
    const updated=resolveModelDimension(definition)[0];
    let model=updated?.type==='dimension'?{...updated,id:s.paperLink.model.id}:detachDimension(s.paperLink.model);
    const oldRefs=(definition.references?.length||0)+(definition.angleSources?.length||0)+(definition.circleId?1:0),newRefs=(model.references?.length||0)+(model.angleSources?.length||0)+(model.circleId?1:0);
    if(newRefs<oldRefs)model=detachDimension(s.paperLink.model);
    const projected=projectPaperDimension(model,v,s.height),paperHidden=paperDimensionOutside(projected,v,modelById);
    return [{...projected,paperHidden,associationWarning:paperHidden?'Source hors du cadre : cote masquée.':newRefs<oldRefs?'Source supprimée ou incompatible : cote détachée, dernière valeur conservée.':s.associationWarning?.startsWith('Source supprimée')?s.associationWarning:undefined}];
   }
   return s.type==='text'||s.type==='viewport'?[s]:resolved.has(s.id)?[resolved.get(s.id)!]:[];
  })};
 })};
}
