import {getLanguage} from './i18n';
import {constrainedEnd,parseLength} from './geometry';
import type {Point,Node} from './model';
export function closedPolylineNodes(nodes:Node[]):Node[]{
 if(nodes.length<3)throw new Error('Placez au moins trois points pour fermer le contour.');
 return nodes.map(n=>({...n,p:{...n.p}}));
}

export type LengthUnit='m'|'cm'|'mm';
export function radiusEndpoint(center:Point,text:string,unit:LengthUnit):Point{
 const radius=parseLength(text,unit);
 if(!Number.isFinite(radius)||radius<=0)throw new Error('Le rayon doit être positif.');
 return {x:center.x+radius,y:center.y};
}
export const unitFactor:Record<LengthUnit,number>={m:1000,cm:10,mm:1};
export function readUnit(raw:string|null):LengthUnit{return raw==='cm'||raw==='mm'?raw:'m';}
export function displayDistance(mm:number,unit:LengthUnit){return Number((mm/unitFactor[unit]).toFixed(4)).toLocaleString(getLanguage()==='en'?'en-GB':'fr-FR',{maximumFractionDigits:4,useGrouping:false});}
export function lengthInMillimeters(text:string,unit:LengthUnit){return text.trim()?`${parseLength(text,unit)} mm`:'';}
export function exactEndpoint(start:Point,pointer:Point,text:string,unit:LengthUnit,ortho:boolean,polar=0,angle=''):Point{
 const length=parseLength(text,unit);
 if(length<=0)throw new Error('La longueur doit être positive.');
 if(start.x===pointer.x&&start.y===pointer.y&&!angle.trim())throw new Error('Indiquez la direction avec la souris.');
 return constrainedEnd(start,pointer,`${length} mm`,angle,ortho,ortho?0:polar);
}
export function lineEndpoint(start:Point,pointer:Point,text:string,unit:LengthUnit,ortho:boolean,polar=0,angle=''):Point{
 const direction=start.x===pointer.x&&start.y===pointer.y?{x:start.x+1,y:start.y}:pointer;
 return exactEndpoint(start,direction,text,unit,ortho,polar,angle);
}
export function translationEndpoint(base:Point,pointer:Point,text:string,unit:LengthUnit,ortho:boolean,polar=0,objectSnap=false):Point{
 return text.trim()?exactEndpoint(base,pointer,text,unit,ortho,polar):constrainedEnd(base,pointer,'','',ortho,ortho?0:polar,objectSnap);
}
export const copyEndpoint=translationEndpoint;
export const draftingCommands=[
 {id:'hatch',name:'HATCH',label:'Hachures',aliases:['HACHURES','HACHURE','HA']},
 {id:'arc',name:'ARC',label:'Arc par 3 points',aliases:['A']},
 {id:'line',name:'LINE',label:'Ligne',aliases:['L','LIGNE']},
 {id:'polyline',name:'PLINE',label:'Polyligne',aliases:['PL','POLYLINE','POLYLIGNE']},
 {id:'rect',name:'RECTANG',label:'Rectangle',aliases:['R','REC','RECTANGLE']},
 {id:'circle',name:'CIRCLE',label:'Cercle',aliases:['C','CERCLE']},
 {id:'select',name:'SELECT',label:'Sélection',aliases:['V','SELECTION']},
 {id:'pan',name:'PAN',label:'Déplacement de vue',aliases:['H']},
 {id:'move',name:'MOVE',label:'Déplacer',aliases:['M','DEPLACER']},
 {id:'copy',name:'COPY',label:'Copier',aliases:['CO','COPIER']},
 {id:'offset',name:'OFFSET',label:'Décalage',aliases:['O','DECALAGE']},
 {id:'trim',name:'TRIM',label:'Ajuster',aliases:['X','AJUSTER']},
 {id:'extend',name:'EXTEND',label:'Prolonger',aliases:['E','PROLONGER']},
 {id:'bezier',name:'BEZIER',label:'Bézier',aliases:['B']},
 {id:'linearDimension',name:'DIMLINEAR',label:'Cotation linéaire',aliases:['DLI']},
 {id:'diameter',name:'DIMDIAMETER',label:'Diamètre',aliases:['DDI','DIAMETRE']},
 {id:'dimension',name:'DIMENSION',label:'Cotation',aliases:['D','COTATION']},
 {id:'rotate',name:'ROTATE',label:'Rotation',aliases:['RO','ROTATION']},
 {id:'mirror',name:'MIRROR',label:'Miroir',aliases:['MI','MIROIR']},
 {id:'measure',name:'DIST',label:'Mesurer',aliases:['DI','MESURER']},
 {id:'join',name:'JOIN',label:'Raccorder',aliases:['J','RACCORDER']},
 {id:'text',name:'TEXT',label:'Texte papier',aliases:['T','TEXTE']},
 {id:'viewport',name:'VIEWPORT',label:'Fenêtre de vue',aliases:['F']},
] as const;
const normalize=(s:string)=>s.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
const names=(c:typeof draftingCommands[number],bindings:Record<string,string[]>)=>[c.name,...c.aliases,...(bindings[c.id]||[]).filter(k=>/^[A-Z]+$/.test(k))];
export function commandSuggestions(text:string,bindings:Record<string,string[]>={}){const q=normalize(text);if(!q)return [];return draftingCommands.filter(c=>names(c,bindings).some(a=>a.startsWith(q))).sort((a,b)=>Number(names(b,bindings).some(x=>x===q))-Number(names(a,bindings).some(x=>x===q)));}
export function resolveCommand(text:string,bindings:Record<string,string[]>={}){const q=normalize(text);return draftingCommands.find(c=>names(c,bindings).some(a=>a===q));}
export function dynamicFieldPosition(point:Point,width:number,height:number){return{x:Math.max(8,Math.min(point.x+22,width-153)),y:Math.max(8,Math.min(point.y-52,height-62))};}
export function rectangleEndpoint(start:Point,pointer:Point,width:string,height:string,unit:LengthUnit):Point{
 const x=width.trim()?parseLength(width,unit):Math.abs(pointer.x-start.x);
 const y=height.trim()?parseLength(height,unit):Math.abs(pointer.y-start.y);
 if(x<=0||y<=0)throw new Error('La largeur et la hauteur doivent être positives.');
 return {x:start.x+(pointer.x<start.x?-x:x),y:start.y+(pointer.y>start.y?y:-y)};
}
export function relativeRectangleEndpoint(start:Point,text:string,unit:LengthUnit,paper=false):Point{
 const raw=text.trim().replace(/^@/,'');
 const parts=raw.split(raw.includes(';')?';':',');
 if(parts.length!==2)throw new Error('Saisissez @120,80 ou 120;80.');
 const x=parseLength(parts[0],unit),y=parseLength(parts[1],unit);
 if(!x||!y)throw new Error('La largeur et la hauteur doivent être non nulles.');
 return {x:start.x+x,y:start.y+(paper?y:-y)};
}
