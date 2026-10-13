import type {BaseShape,HatchRegion,HatchShape,HatchStyle,PaperItem} from './model';
import {createHatch,boundaryShape} from './hatch';

export type HatchSessionOptions={separate:boolean;sessionIds:string[];redefineId?:string|null;makeBase:()=>BaseShape;editable:(s:PaperItem)=>boolean};
export function initialHatchSelection(items:PaperItem[],ids:string[]):string[]{return ids.filter(id=>{const s=items.find(s=>s.id===id);return s&&s.type!=='text'&&s.type!=='viewport'&&boundaryShape(s);});}
export function applyHatchRegions(items:PaperItem[],regions:HatchRegion[],style:HatchStyle,options:HatchSessionOptions):{items:PaperItem[];ids:string[];duplicate:boolean;redefined:boolean}{
 const confirmed=items.filter((s):s is HatchShape=>s.type==='hatch'&&options.sessionIds.includes(s.id));
 const signature=(r:HatchRegion)=>JSON.stringify(r.loops);
 regions=regions.filter(r=>!confirmed.some(s=>s.regions.some(old=>signature(old)===signature(r))));
 if(!regions.length)return{items,ids:options.sessionIds,duplicate:true,redefined:false};
 if(options.redefineId){const original=items.find(s=>s.id===options.redefineId);if(original?.type!=='hatch'||!options.editable(original))throw new Error('La hachure ne peut pas être modifiée.');const created=createHatch(original,regions,style);return {items:items.map(s=>s.id===original.id?created:s),ids:[created.id],duplicate:false,redefined:true};}
 const grouped=!options.separate&&confirmed.find(options.editable);
 if(grouped){const created=createHatch(grouped,[...grouped.regions,...regions],style);return{items:items.map(s=>s.id===grouped.id?created:s),ids:options.sessionIds,duplicate:false,redefined:false};}
 const created=(options.separate?regions.map(r=>[r]):[regions]).map(group=>createHatch(options.makeBase(),group,style));
 return{items:[...items,...created],ids:[...options.sessionIds,...created.map(s=>s.id)],duplicate:false,redefined:false};
}
