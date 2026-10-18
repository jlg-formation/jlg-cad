import type {BaseShape,Dimension,DimensionReference,Layout,Point,Shape,Viewport} from './model';
import {bounds,modelToPaper,paperToModel} from './model';
import {add,sub,mul,distance,segments,closestSegment,intersections,mapItem,snapPoint,nearestPart,parseAngle,at,type Snap} from './geometry';
import {circularDefinition,directedLinearDimension,lineAngleDefinition,makeDimension,type DimensionOptions} from './dimension-kinds';

export const paperDimensionTools=['dimension','linearDimension','alignedDimension','angularDimension','arcDimension','radius','diameter','ordinate','jogged'] as const;
export type PaperDimensionTool=typeof paperDimensionTools[number];
export const isPaperDimensionTool=(tool:string):tool is PaperDimensionTool=>paperDimensionTools.includes(tool as PaperDimensionTool);
export type PaperDimensionSession={viewportId:string;points:Point[];sourceId?:string;sweep?:number;angleSources?:NonNullable<Dimension['angleSources']>};
export type PaperDimensionSettings=DimensionOptions&{height:number;angularMode:'lines'|'points'};
export function containsPaperPoint(v:Viewport,p:Point){const b=bounds(v);return p.x>=b.x&&p.y>=b.y&&p.x<=b.x+b.width&&p.y<=b.y+b.height;}
export function dimensionViewport(layout:Layout,p:Point,session?:PaperDimensionSession|null):Viewport|undefined{
 if(session)return layout.items.find((s):s is Viewport=>s.type==='viewport'&&s.id===session.viewportId);
 return [...layout.items].reverse().find((s):s is Viewport=>s.type==='viewport'&&containsPaperPoint(s,p));
}
export function paperDimensionSnap(layout:Layout,shapes:Shape[],p:Point,tolerance:number,session:PaperDimensionSession|null,kinds:readonly Snap['kind'][]):Snap|null{
 const v=dimensionViewport(layout,p,session);if(!v||!containsPaperPoint(v,p))return null;
 const snap=snapPoint(paperToModel(p,v),shapes,tolerance*v.denominator,kinds);
 return snap&&containsPaperPoint(v,modelToPaper(snap.point,v))?{...snap,point:modelToPaper(snap.point,v)}:null;
}
export function dimensionReferences(d:Dimension,shapes:Shape[],sourceId?:string):DimensionReference[]{
 const points=d.points||[d.a,d.b],count=d.kind==='ordinate'?2:d.points?3:2;
 const candidates=[...shapes].filter(s=>!['dimension','hatch','text'].includes(s.type)).sort((a,b)=>Number(b.id===sourceId)-Number(a.id===sourceId));
 return points.slice(0,count).flatMap((point,index):DimensionReference[]=>{
  if(d.kind==='ordinate'&&index===0)return [];
  const near:{id:string;segment:number;t:number}[]=[];
  for(const shape of candidates){const parts=segments(shape);for(let i=0;i<parts.length;i++){
   const part=parts[i];
   for(const feature of ['center','a','b'] as const){const target=feature==='center'?(part.kind==='arc'?part.center:undefined):part[feature];if(target&&distance(point,target)<1e-5)return [{id:shape.id,segment:i,point:index,feature}];}
   const c=closestSegment(point,part);if(distance(c.point,point)<1e-5)near.push({id:shape.id,segment:i,t:c.t});
  }}
  if(near.length>1){const a=near[0],b=near.find(r=>r.id!==a.id||r.segment!==a.segment);if(b)return [{id:a.id,segment:a.segment,point:index,feature:'intersection',other:{id:b.id,segment:b.segment}}];}
  return near.length?[{id:near[0].id,segment:near[0].segment,point:index,feature:'at',t:near[0].t}]:[];
 });
}
export function projectPaperDimension(model:Dimension,v:Viewport,height:number):Dimension{
 const projected=mapItem(model,p=>modelToPaper(p,v),1/v.denominator);
 const {references,angleSources,circleId,paperLink,paperHidden,associationWarning,...geometry}=projected;
 return {...geometry,height,angularQuadrants:model.angleSources?.length===2||model.angularQuadrants,paperLink:{viewportId:v.id,model}};
}
export function paperDimensionPreview(tool:PaperDimensionTool,session:PaperDimensionSession,v:Viewport,sheet:Point,base:BaseShape,settings:PaperDimensionSettings):Dimension|null{
 const p=paperToModel(sheet,v),ps=session.points,height=settings.height*v.denominator,constructionHeight=Math.min(height,1e5);
 let model:Dimension;
 if(tool==='linearDimension'){
  if(ps.length<2)return null;
  model=directedLinearDimension(ps[0],ps[1],p,base,height,settings.direction.trim()?parseAngle(settings.direction):undefined);
 }else if(tool==='dimension'||tool==='alignedDimension'){
  if(session.sourceId&&ps.length===3){model=makeDimension('diameter',ps,p,base,constructionHeight,settings,session.sweep);}
  else{if(ps.length<2)return null;model=makeDimension('alignedDimension',ps,p,base,constructionHeight,settings);}
 }else{
  if(ps.length<(tool==='ordinate'?1:tool==='jogged'?4:3))return null;
  const pointer=tool==='jogged'&&ps.length===5?ps[4]:p;
  const definition=tool==='jogged'?[...ps.slice(0,3),ps[3],ps.length===5?p:mul(add(ps[3],p),.5)]:ps;
  model=makeDimension(tool,definition,pointer,base,constructionHeight,settings,session.sweep);
 }
 model.height=height;
 if(session.angleSources)model.angleSources=session.angleSources;
 return projectPaperDimension(model,v,settings.height);
}
export function paperDimensionClick(tool:PaperDimensionTool,previous:PaperDimensionSession|null,layout:Layout,shapes:Shape[],sheet:Point,tolerance:number,base:BaseShape,settings:PaperDimensionSettings,selectObject=false):{session:PaperDimensionSession|null;dimension?:Dimension;message:string}{
 const v=dimensionViewport(layout,sheet,previous);if(!v)throw new Error('Cliquez le bâtiment dans une fenêtre de vue.');
 const session:PaperDimensionSession=previous||{viewportId:v.id,points:[]},ps=session.points,p=paperToModel(sheet,v);
 const hit=containsPaperPoint(v,sheet)?shapes.filter(s=>!['dimension','hatch','text'].includes(s.type)).map(s=>({s,d:distance(nearestPart(s,p).point,p)})).filter(h=>h.d<=tolerance*v.denominator).sort((a,b)=>a.d-b.d)[0]?.s:undefined;
 const more=(points:Point[],message:string,extra:Partial<PaperDimensionSession>={})=>({session:{...session,...extra,points},message});
 const placed='Placez la cote sur la feuille, même à l’extérieur de la fenêtre.';
 if(!ps.length&&!containsPaperPoint(v,sheet))throw new Error('Cliquez le bâtiment dans une fenêtre de vue.');
 if(tool==='linearDimension'||tool==='alignedDimension'||tool==='dimension'){
  if(!ps.length&&tool==='dimension'&&hit?.type==='circle'){const def=circularDefinition(hit,p);return more(def.points,placed,{sourceId:hit.id,sweep:def.sweep});}
  if(ps.length<2){
   if(!containsPaperPoint(v,sheet))throw new Error('Choisissez les points dans la même fenêtre de vue.');
   if(selectObject&&!ps.length){if(!hit)throw new Error('Choisissez un côté du bâtiment.');const part=nearestPart(hit,p).segment;if(part.kind!=='line')throw new Error('Choisissez un segment droit.');return more([part.a,part.b],placed,{sourceId:hit.id});}
   if(ps.length&&distance(ps[0],p)<.001)throw new Error('Choisissez deux points distincts.');
   return more([...ps,p],ps.length?placed:'Cliquez le second point dans la même fenêtre.');
  }
 }else if(tool==='ordinate'){
  if(!ps.length)return more([p],placed);
 }else if(tool==='angularDimension'){
  if(ps.length<3){
   if(!containsPaperPoint(v,sheet))throw new Error('Choisissez les points dans la même fenêtre de vue.');
   if(!ps.length&&hit&&nearestPart(hit,p).segment.kind==='arc'){const def=circularDefinition(hit,p);return more(def.points,placed,{sourceId:hit.id});}
   if(!ps.length&&settings.angularMode==='lines'){
    if(!hit)throw new Error('Choisissez une ligne du bâtiment, ou le mode Sommet et deux points.');
    const part=nearestPart(hit,p),ss=segments(hit),index=ss.findIndex(s=>s===part.segment||distance(s.a,part.segment.a)<1e-8&&distance(s.b,part.segment.b)<1e-8);
    if(part.segment.kind!=='line')throw new Error('Choisissez un segment droit.');
    return more([p],'Cliquez la seconde ligne dans la même fenêtre.',{sourceId:hit.id,angleSources:[{id:hit.id,segment:index,position:part.t}]});
   }
   if(session.angleSources?.length===1){
    const source=shapes.find(s=>s.id===session.sourceId);if(!source||!hit)throw new Error('Choisissez une seconde ligne du bâtiment.');
    const part=nearestPart(hit,p),index=segments(hit).findIndex(s=>distance(s.a,part.segment.a)<1e-8&&distance(s.b,part.segment.b)<1e-8);
    return more(lineAngleDefinition(source,hit,ps[0],p),placed,{angleSources:[...session.angleSources,{id:hit.id,segment:index,position:part.t}]});
   }
   if(ps.length&&distance(ps[0],p)<.001)throw new Error('Choisissez deux points distincts.');
   return more([...ps,p],ps.length===2?placed:'Cliquez un point sur la direction à mesurer.');
  }
 }else{
  if(!ps.length){if(!hit)throw new Error('Choisissez un cercle ou un arc du bâtiment.');const def=circularDefinition(hit,p);if(tool==='arcDimension'&&Math.abs(def.sweep)>=Math.PI*2-1e-8)throw new Error('Choisissez un arc ouvert.');return more(def.points,tool==='jogged'?'Cliquez le centre de remplacement sur la feuille.':placed,{sourceId:hit.id,sweep:def.sweep});}
  if(tool==='jogged'&&ps.length<5)return more([...ps,p],ps.length===3?placed:'Cliquez pour placer la brisure.');
 }
 const dimension=paperDimensionPreview(tool,session,v,sheet,base,settings);if(!dimension)throw new Error('Terminez la sélection de la géométrie.');
 const model=dimension.paperLink!.model;
 model.references=dimensionReferences(model,shapes,session.sourceId);
 if(session.sourceId&&model.points&&['radius','diameter','arcLength','jogged','angular'].includes(model.kind||'')){
  const source=shapes.find(s=>s.id===session.sourceId);
  const index=source?.type==='circle'?0:source?segments(source).findIndex(s=>s.kind==='arc'&&distance(s.center,model.points![0])<1e-5&&distance(s.a,model.points![1])<1e-5&&distance(s.b,model.points![2])<1e-5):-1;
  if(source&&index>=0)model.references=[{id:source.id,segment:index,point:0,feature:'center'},{id:source.id,segment:index,point:1,feature:'a'},{id:source.id,segment:index,point:2,feature:source.type==='circle'?'a':'b'}];
 }
 return {session:null,dimension,message:'Cotation créée sur la feuille — choisissez la géométrie suivante.'};
}

/** Rebuilds the model definition from a paper edit without moving its source geometry. */
export function updatePaperDimensionPlacement(d:Dimension,v:Viewport):Dimension{
 if(!d.paperLink)return d;
 const {paperLink,paperHidden,associationWarning,...paper}=d,old=paperLink.model;
 const converted=mapItem(paper,p=>paperToModel(p,v),v.denominator);
 return {...d,paperLink:{...paperLink,model:{...converted,references:old.references,angleSources:old.angleSources,circleId:old.circleId}}};
}

export function resolveDimensionReference(ref:DimensionReference,shapes:Map<string,Shape>,previous:Point):Point|undefined{
 const source=shapes.get(ref.id);if(!source||['dimension','hatch','text'].includes(source.type))return;
 const part=segments(source)[ref.segment];if(!part)return;
 if(ref.feature==='center')return part.kind==='arc'?part.center:undefined;
 if(ref.feature==='a'||ref.feature==='b')return part[ref.feature];
 if(ref.feature==='at')return at(part,ref.t!);
 if(ref.feature==='intersection'&&ref.other){const second=shapes.get(ref.other.id);if(!second||['dimension','hatch','text'].includes(second.type))return;const other=segments(second)[ref.other.segment];if(other)return intersections(part,other).sort((a,b)=>distance(a,previous)-distance(b,previous))[0];}
}
export function paperDimensionOutside(d:Dimension,v:Viewport,shapes:Shape[]|Map<string,Shape>):boolean{
 const byId=Array.isArray(shapes)?new Map(shapes.map(s=>[s.id,s])):shapes;
 const model=d.paperLink!.model,ids=[...(model.references||[]).flatMap(r=>[r.id,...(r.other?[r.other.id]:[])]),...(model.angleSources||[]).map(r=>r.id),...(model.circleId?[model.circleId]:[])];
 const viewportBox=bounds(v);
 if(ids.length)return ids.some(id=>{const source=byId.get(id);if(!source)return false;const modelBounds=bounds(source),corner=modelToPaper({x:modelBounds.x,y:modelBounds.y},v),b={x:corner.x,y:corner.y,width:modelBounds.width/v.denominator,height:modelBounds.height/v.denominator};return b.x+b.width<viewportBox.x||b.x>viewportBox.x+viewportBox.width||b.y+b.height<viewportBox.y||b.y>viewportBox.y+viewportBox.height;});
 const ps=model.points?model.kind==='ordinate'?[model.points[1]]:model.points.slice(0,3):[model.a,model.b];
 return !ps.some(p=>containsPaperPoint(v,modelToPaper(p,v)));
}
