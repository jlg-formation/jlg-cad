import {detachDimension,synchronizeDimensions} from './associations';
import {bounds, documentOf, parseDrawing, type Drawing, type Point, type Shape} from './model';
import {translateItem} from './geometry';

export type CadClipboard = {format:'jlg-cad-clipboard';version:1;units:'mm';base:Point;drawing:Drawing};
export function encodeClipboard(doc:Drawing, shapes:Shape[]):string {
 if(!shapes.length)throw new Error('Sélectionnez des objets à copier.');
 const selected=new Set(shapes.map(s=>s.id));shapes=synchronizeDimensions(doc.shapes).filter(s=>selected.has(s.id)).map(s=>s.type==='dimension'&&s.circleId&&!selected.has(s.circleId)?detachDimension(s):s);
 const used=new Set(shapes.map(s=>s.layerId||'0'));
 const boxes=shapes.map(bounds);
 const data:CadClipboard={format:'jlg-cad-clipboard',version:1,units:'mm',base:{x:Math.min(...boxes.map(b=>b.x)),y:Math.min(...boxes.map(b=>b.y))},drawing:documentOf('Copie',shapes,[],doc.layers.filter(l=>l.id==='0'||used.has(l.id)))};
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
export function pasteClipboard(doc:Drawing,data:CadClipboard,point:Point,makeId:()=>string):Drawing {
 const layers=[...doc.layers],mapping=new Map<string,string>();
 for(const source of data.drawing.layers){
  const existing=layers.find(l=>l.name===source.name&&l.color===source.color&&l.visible&&!l.locked);
  if(existing){mapping.set(source.id,existing.id);continue;}
  let name=source.name,n=2;while(layers.some(l=>l.name===name))name=`${source.name} (${n++})`;
  const layer={...source,id:makeId(),name,visible:true,locked:false};layers.push(layer);mapping.set(source.id,layer.id);
 }
 const ids=new Map(data.drawing.shapes.map(s=>[s.id,makeId()]));
 const shapes=data.drawing.shapes.map(s=>({...translateItem(s,point.x-data.base.x,point.y-data.base.y),id:ids.get(s.id)!,layerId:mapping.get(s.layerId||'0')!,...(s.type==='dimension'&&s.circleId?{circleId:ids.get(s.circleId)!}:{})}));
 // Validate translated coordinates and the resulting document limits before committing.
 return parseDrawing(JSON.stringify({...doc,layers,shapes:[...doc.shapes,...shapes]}));
}
