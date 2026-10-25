import {parseDrawing,type Drawing,type Layout,type Shape,type PaperItem} from './model';

// Paper geometry is always stored in physical millimetres. Units affect input/display only.
export function spaceDrawing(doc:Drawing,layoutId?:string|null):Drawing {
 const layout=doc.layouts.find(l=>l.id===layoutId);
 return layout?{...doc,shapes:layout.items.filter((s):s is Shape=>s.type!=='viewport')}:doc;
}
export function replaceSpaceDrawing(doc:Drawing,next:Drawing,layoutId?:string|null):Drawing {
 const layout=doc.layouts.find(l=>l.id===layoutId);
 if(!layout)return next;
 const replacements=new Map(next.shapes.map(s=>[s.id,s]));
 const existing=new Set(layout.items.map(s=>s.id));
 const items=layout.items.flatMap<PaperItem>(s=>s.type==='viewport'?[s]:replacements.has(s.id)?[replacements.get(s.id)!]:[]);
 items.push(...next.shapes.filter(s=>!existing.has(s.id)));
 return {...doc,layers:next.layers,blocks:next.blocks,references:next.references,layouts:doc.layouts.map(l=>l.id===layout.id?{...l,items}:l)};
}
export function duplicateLayout(doc:Drawing,layoutId:string,makeId:()=>string):Drawing {
 const source=doc.layouts.find(l=>l.id===layoutId);
 if(!source)throw new Error('Choisissez une présentation.');
 const ids=new Map(source.items.map(s=>[s.id,makeId()]));
 const reference=<T extends {id:string;other?:{id:string;segment:number}}>(r:T):T=>({...r,id:ids.get(r.id)!,...(r.other?{other:{...r.other,id:ids.get(r.other.id)!}}:{})});
 const items=structuredClone(source.items).map(s=>({...s,id:ids.get(s.id)!,...(s.type==='dimension'?{circleId:s.circleId?ids.get(s.circleId):undefined,references:s.references?.map(reference),angleSources:s.angleSources?.map(reference),paperLink:s.paperLink?{...s.paperLink,viewportId:s.paperLink.viewportId?ids.get(s.paperLink.viewportId):undefined}:undefined}:{}),...(s.type==='hatch'?{regions:s.regions.map(r=>({...r,sourceIds:r.sourceIds.map(id=>ids.get(id)!),outerSourceIds:r.outerSourceIds?.map(id=>ids.get(id)!)}))}:{})}));
 let name=source.name+' (copie)',n=2;while(doc.layouts.some(l=>l.name===name))name=source.name+' (copie '+(n++)+')';
 const layout:Layout={...source,id:makeId(),name,items};
 return parseDrawing(JSON.stringify({...doc,layouts:[...doc.layouts,layout]}));
}
export function layoutTemplate(doc:Drawing):Drawing {
 // Building annotations have no source in a blank template; retain only paper graphics.
 return parseDrawing(JSON.stringify({...doc,name:'Gabarit — '+doc.name,shapes:[],layouts:doc.layouts.map(l=>({...l,items:l.items.filter(s=>s.type!=='dimension'||!s.paperLink)}))}));
}
