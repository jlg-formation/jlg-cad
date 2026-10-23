import {commandNames} from './command-language';
import {translate} from './i18n';
import {draftingCommands} from './drafting';
import {commands, type Bindings} from './shortcuts';

export type PaletteCommand={id:string;name:string;label:string;aliases:readonly string[]};
export const paletteCommands:PaletteCommand[]=[
 {id:'block',name:'BLOCK',label:'Créer un bloc',aliases:['B','BLOC']},
 {id:'insert',name:'INSERT',label:'Insérer un bloc',aliases:['I','INSERER','INSÉRER']},
 {id:'explode',name:'EXPLODE',label:'Décomposer un bloc',aliases:['X','DECOMPOS','DÉCOMPOS']},
 {id:'bedit',name:'BEDIT',label:'Éditer un bloc',aliases:['BE','MODIFBLOC']},
 {id:'bclose',name:'BCLOSE',label:'Fermer l’éditeur de bloc',aliases:['FERMERBLOC']},
 ...commands.filter(([id])=>!['block','insert','explode','bedit','bclose'].includes(id)).map(([id,label])=>draftingCommands.find(c=>c.id===id)||(id==='scale'?{id,name:'SCALE',label,aliases:['SC','ECHELLE']}:undefined)||{id,name:id.toUpperCase(),label,aliases:[]}),
 {id:'imageattach',name:'IMAGEATTACH',label:'Attacher une image',aliases:['IAT','ATTACHERIMAGE']},
 {id:'pdfattach',name:'PDFATTACH',label:'Attacher un PDF',aliases:['ATTACHERPDF']},
 {id:'referenceclip',name:'CLIP',label:'Délimiter une référence',aliases:['IMAGECLIP','PDFCLIP','DELIMITER']},
 {id:'referenceadjust',name:'PDFADJUST',label:'Régler une référence',aliases:['IMAGEADJUST']},
 {id:'references',name:'EXTERNALREFERENCES',label:'Références',aliases:['XREF','REFERENCES']},
 {id:'zoom',name:'ZOOM',label:'Navigation du dessin',aliases:['Z']},
 {id:'settings',name:'PARAMETRES',label:'Paramètres de l’application',aliases:['CONFIGURATION']},
 {id:'properties',name:'PROPRIETES',label:'Afficher / masquer la barre de droite',aliases:['BARRE','SIDEBAR']},
 {id:'addLayout',name:'PRESENTATION',label:'Ajouter une présentation',aliases:['LAYOUT']},
 ...Object.entries({start:'Guide de démarrage',hatch:'Hachures — guide en 2 minutes',draw:'Dessiner et modifier un plan',grid:'Grille et accrochage',paper:'Espace papier et PDF',formats:'Formats et limites',about:'À propos de JLG CAD'}).map(([id,label])=>({id:'help:'+id,name:'AIDE '+id.toUpperCase(),label,aliases:[]})),
];
const normalize=(value:string)=>value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
const names=(c:PaletteCommand,bindings:Bindings)=>[c.name,...c.aliases,...(bindings[c.id]||[]).filter(k=>/^[A-Z]+$/.test(k)),c.label,translate(c.label,'en'),...(commandNames[c.id]||[])].map(normalize);

// Ordered subsequence matching: exact aliases and prefixes always win.
export function fuzzyScore(query:string,value:string):number{
 const q=normalize(query),text=normalize(value);
 if(!q)return 0;
 if(text===q)return 10000;
 if(text.startsWith(q))return 8000-text.length;
 let cursor=0,first=-1,last=-1,bonus=0;
 for(const char of q){const index=text.indexOf(char,cursor);if(index<0)return -1;if(first<0)first=index;if(index===0||text[index-1]===' ')bonus+=30;if(index===last+1)bonus+=10;last=index;cursor=index+1;}
 return 1000+bonus-(last-first-q.length+1)*5-first-text.length;
}
export function paletteSuggestions(text:string,bindings:Bindings={},showAll=false){
 if(!text.trim()&&!showAll)return [];
 return paletteCommands.map(command=>({command,score:Math.max(...names(command,bindings).map(value=>fuzzyScore(text,value)))})).filter(c=>c.score>=0).sort((a,b)=>b.score-a.score).map(c=>c.command);
}
export function resolvePaletteCommand(text:string,bindings:Bindings={}){
 const q=normalize(text);return q?paletteCommands.find(c=>names(c,bindings).includes(q)):undefined;
}

export function rememberCommand(history:readonly string[],id:string){
 return [id,...history.filter(previous=>previous!==id)].slice(0,2);
}

export function groupPaletteCommands<T extends {id:string;name:string}>(matches:T[],history:readonly string[],query:string){
 const recent=[...new Set(history)].slice(0,2).flatMap(id=>{const command=matches.find(c=>c.id===id);return command?[command]:[];});
 const others=matches.filter(c=>!recent.some(r=>r.id===c.id));
 // Keep relevance ordering while searching; the full catalogue is alphabetical.
 if(!query.trim())others.sort((a,b)=>a.name.localeCompare(b.name,'fr'));
 return {commands:[...recent,...others],separatorIndex:recent.length&&others.length?recent.length:-1};
}
