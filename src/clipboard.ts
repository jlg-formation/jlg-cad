import {layerDefaults} from './layers';
import {insertBlock} from './blocks';
import {detachHatch} from './hatch';
import {detachDimension,synchronizeDimensions} from './associations';
import {bounds, documentOf, parseDrawing, lockedShape, type Drawing, type Point, type Shape} from './model';
import {translateItem} from './geometry';

export type CadClipboard = {format:'jlg-cad-clipboard';version:1;units:'mm';base:Point;drawing:Drawing};
export function selectedCopyIds(doc:Drawing,ids:string[],single:string|null):string[]{
 const selection=new Set(ids.length?ids:single?[single]:[]);
 return doc.shapes.filter(s=>selection.has(s.id)).map(s=>s.id);
}
export function moveSelectionObjects(doc:Drawing,ids:string[],base:Point,end:Point):Drawing{
 const selected=new Set(ids),shapes=doc.shapes.filter(s=>selected.has(s.id));
 if(!shapes.length)throw new Error('Sélectionnez des objets à déplacer.');
 if(shapes.some(s=>lockedShape(doc,s)))throw new Error('Le calque est verrouillé.');
 return {...doc,shapes:doc.shapes.map(s=>selected.has(s.id)?translateItem(s,end.x-base.x,end.y-base.y):s)};
}
export function copySelection(doc:Drawing,ids:string[],base:Point,end:Point,makeId:()=>string,validate=true):Drawing{
 const shapes=doc.shapes.filter(s=>ids.includes(s.id));
 if(shapes.some(s=>lockedShape(doc,s)))throw new Error('Le calque est verrouillé.');
 return pasteClipboard(doc,decodeClipboard(encodeClipboard(doc,shapes,base)),end,makeId,validate);
}
export function encodeClipboard(doc:Drawing, shapes:Shape[], base?:Point):string {
 if(!shapes.length)throw new Error('Sélectionnez des objets à copier.');
 const selected=new Set(shapes.map(s=>s.id));shapes=synchronizeDimensions(doc.shapes).filter(s=>selected.has(s.id)).map(original=>{const s=original.type==='dimension'&&original.paperLink?detachDimension(original):original;return s.type==='hatch'&&s.regions.some(r=>r.sourceIds.some(id=>!selected.has(id)))?detachHatch(s):s.type==='dimension'?{...s,...(s.circleId&&!selected.has(s.circleId)?{circleId:undefined}:{}),references:s.references?.filter(r=>selected.has(r.id)),angleSources:s.angleSources?.every(r=>selected.has(r.id))?s.angleSources:undefined}:s;});
 const used=new Set([...shapes,...(doc.blocks||[]).filter(b=>shapes.some(s=>s.type==='block'&&s.definitionId===b.id)).flatMap(b=>b.shapes)].map(s=>s.layerId||'0'));
 const boxes=shapes.map(bounds);
 const data:CadClipboard={format:'jlg-cad-clipboard',version:1,units:'mm',base:base??{x:Math.min(...boxes.map(b=>b.x)),y:Math.min(...boxes.map(b=>b.y))},drawing:{...documentOf('Copie',shapes,[],doc.layers.filter(l=>l.id==='0'||used.has(l.id))),references:doc.references?.filter(r=>shapes.some(s=>s.type==='reference'&&s.sourceId===r.id)),blocks:doc.blocks?.filter(b=>shapes.some(s=>s.type==='block'&&s.definitionId===b.id))}};
 return JSON.stringify(data);
}
export function decodeClipboard(text:string):CadClipboard {
 if(text.length>20_000_000)throw new Error('Copie trop volumineuse.');
 const data=JSON.parse(text);
 if(data?.format!=='jlg-cad-clipboard'||data.version!==1||data.units!=='mm'||!data.base||![data.base.x,data.base.y].every(n=>Number.isFinite(n)&&Math.abs(n)<=1e7))throw new Error('Format de presse-papiers JLG CAD non pris en charge.');
 const drawing=parseDrawing(JSON.stringify(data.drawing));
 if(!drawing.shapes.length||drawing.layouts.length)throw new Error('Copie JLG CAD invalide.');
 return {...data,drawing};
}
export function pasteClipboard(doc:Drawing,data:CadClipboard,point:Point,makeId:()=>string,validate=true):Drawing {
 const layers=[...doc.layers],mapping=new Map<string,string>();
 for(const source of data.drawing.layers){
  const existing=layers.find(l=>l.name===source.name&&l.color===source.color&&l.visible&&!l.locked&&(['linetype','lineweight','transparency','printable','description'] as const).every(k=>(l[k]??layerDefaults[k])===(source[k]??layerDefaults[k])));
  if(existing){mapping.set(source.id,existing.id);continue;}
  let name=source.name,n=2;while(layers.some(l=>l.name===name))name=`${source.name} (${n++})`;
  const layer={...source,id:makeId(),name,visible:true,locked:false};layers.push(layer);mapping.set(source.id,layer.id);
 }
 const blocks=[...(doc.blocks||[])],blockIds=new Map<string,string>();
 for(const source of data.drawing.blocks||[]){
  const mapped={...source,shapes:source.shapes.map(s=>({...s,layerId:mapping.get(s.layerId||'0')||'0'}))};
  const existing=blocks.find(b=>b.id===source.id&&JSON.stringify(b.shapes)===JSON.stringify(mapped.shapes));
  if(existing){blockIds.set(source.id,existing.id);continue;}
  let name=source.name,n=2;while(blocks.some(b=>b.name.toLocaleUpperCase()===name.toLocaleUpperCase()))name=source.name+' ('+(n++)+')';
  const definition={...mapped,id:makeId(),name};blocks.push(definition);blockIds.set(source.id,definition.id);
 }
 const references=[...(doc.references||[])],referenceIds=new Map<string,string>();
 for(const r of data.drawing.references||[]){const existing=references.find(o=>o.kind===r.kind&&o.data===r.data);const next=existing||{...r,id:makeId()};if(!existing)references.push(next);referenceIds.set(r.id,next.id);}
 const ids=new Map(data.drawing.shapes.map(s=>[s.id,makeId()]));
 const shapes=data.drawing.shapes.map(s=>({...translateItem(s,point.x-data.base.x,point.y-data.base.y),id:ids.get(s.id)!,...(s.type==='reference'?{sourceId:referenceIds.get(s.sourceId)!}:{}),...(s.type==='block'?{definitionId:blockIds.get(s.definitionId)!}:{}),layerId:mapping.get(s.layerId||'0')!,...(s.type==='hatch'?{regions:s.regions.map(r=>({...r,seed:{x:r.seed.x+point.x-data.base.x,y:r.seed.y+point.y-data.base.y},loops:r.loops.map(loop=>loop.map(p=>({x:p.x+point.x-data.base.x,y:p.y+point.y-data.base.y}))),boundaryLoops:r.boundaryLoops?.map(loop=>loop.map(p=>({x:p.x+point.x-data.base.x,y:p.y+point.y-data.base.y}))),outerSourceIds:r.outerSourceIds?.map(id=>ids.get(id)!),sourceIds:r.sourceIds.map(id=>ids.get(id)!)}))}:{}),...(s.type==='dimension'?{circleId:s.circleId?ids.get(s.circleId):undefined,references:s.references?.map(r=>({...r,id:ids.get(r.id)!})),angleSources:s.angleSources?.map(r=>({...r,id:ids.get(r.id)!}))}:{})}));
 // Validate translated coordinates and the resulting document limits before committing.
 const next={...doc,references,blocks,layers,shapes:[...doc.shapes,...shapes]};return validate?parseDrawing(JSON.stringify(next)):next;
}

export function importBlockDefinitions(doc:Drawing,source:Drawing,makeId:()=>string):Drawing{
 const library={...source,shapes:[],layers:source.layers.map(l=>({...l,locked:false}))};
 const shapes=(source.blocks||[]).map(b=>insertBlock(library,b.id,{x:0,y:0},1,0,makeId).shapes[0]);
 if(!shapes.length)throw new Error('Ce fichier ne contient aucun bloc réutilisable.');
 const imported=pasteClipboard(doc,decodeClipboard(encodeClipboard({...source,shapes},shapes)),{x:0,y:0},makeId);
 return {...imported,shapes:doc.shapes};
}
