import {constrainedEnd,parseLength} from './geometry';
import type {Point} from './model';

export type LengthUnit='m'|'cm'|'mm';
export const unitFactor:Record<LengthUnit,number>={m:1000,cm:10,mm:1};
export function readUnit(raw:string|null):LengthUnit{return raw==='cm'||raw==='mm'?raw:'m';}
export function displayDistance(mm:number,unit:LengthUnit){return Number((mm/unitFactor[unit]).toFixed(4)).toLocaleString('fr-FR',{maximumFractionDigits:4,useGrouping:false});}
export function lengthInMillimeters(text:string,unit:LengthUnit){return text.trim()?`${parseLength(text,unit)} mm`:'';}
export function exactEndpoint(start:Point,pointer:Point,text:string,unit:LengthUnit,ortho:boolean,polar=0,angle=''):Point{
 const length=parseLength(text,unit);
 if(length<=0)throw new Error('La longueur doit être positive.');
 if(start.x===pointer.x&&start.y===pointer.y&&!angle.trim())throw new Error('Indiquez la direction avec la souris.');
 return constrainedEnd(start,pointer,`${length} mm`,angle,ortho,ortho?0:polar);
}
export const draftingCommands=[
 {id:'line',name:'LINE',label:'Ligne',aliases:['L','LIGNE']},
 {id:'polyline',name:'PLINE',label:'Polyligne',aliases:['PL','POLYLINE','POLYLIGNE']},
 {id:'rect',name:'RECTANG',label:'Rectangle',aliases:['R','RECTANGLE']},
 {id:'circle',name:'CIRCLE',label:'Cercle',aliases:['C','CERCLE']},
 {id:'select',name:'SELECT',label:'Sélection',aliases:['V','SELECTION']},
 {id:'pan',name:'PAN',label:'Déplacement de vue',aliases:['H']},
 {id:'move',name:'MOVE',label:'Déplacer',aliases:['M','DEPLACER']},
 {id:'copy',name:'COPY',label:'Copier',aliases:['CO','COPIER']},
 {id:'offset',name:'OFFSET',label:'Décalage',aliases:['O','DECALAGE']},
 {id:'trim',name:'TRIM',label:'Ajuster',aliases:['X','AJUSTER']},
 {id:'extend',name:'EXTEND',label:'Prolonger',aliases:['E','PROLONGER']},
 {id:'bezier',name:'BEZIER',label:'Bézier',aliases:['B']},
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
export function dynamicFieldPosition(point:Point,width:number,height:number){return{x:Math.max(8,Math.min(point.x+22,width-198)),y:Math.max(8,Math.min(point.y-52,height-62))};}
