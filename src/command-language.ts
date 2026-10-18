import {useSyncExternalStore} from 'react';
import {t,type Language} from './i18n';
export const commandLanguageStorageKey='jlg-cad-command-language';
export function readCommandLanguage(raw:string|null):Language{return raw==='fr'?'fr':'en';}
let language:Language='en';
try{language=readCommandLanguage(localStorage.getItem(commandLanguageStorageKey));}catch{/* English command names are the default. */}
const listeners=new Set<()=>void>();
export function getCommandLanguage(){return language;}
export function setCommandLanguage(next:Language){if(next===language)return;language=next;try{localStorage.setItem(commandLanguageStorageKey,next);}catch{/* The session remains usable without storage. */}listeners.forEach(listener=>listener());}
export function useCommandLanguage(){return useSyncExternalStore(listener=>{listeners.add(listener);return()=>{listeners.delete(listener);};},getCommandLanguage,()=> 'en' as Language);}
// Display names only. Command IDs, aliases, bindings and saved drawings remain independent.
export const commandNames:Record<string,readonly [string,string]>={
 block:['BLOC','BLOCK'],insert:['INSERER','INSERT'],explode:['DECOMPOS','EXPLODE'],bedit:['MODIFBLOC','BEDIT'],bclose:['FERMERBLOC','BCLOSE'],
 line:['LIGNE','LINE'],polyline:['POLYLIGNE','PLINE'],rect:['RECTANGLE','RECTANG'],circle:['CERCLE','CIRCLE'],arc:['ARC','ARC'],bezier:['BÉZIER','BEZIER'],
 move:['DÉPLACER','MOVE'],copy:['COPIER','COPY'],offset:['DÉCALER','OFFSET'],trim:['AJUSTER','TRIM'],extend:['PROLONGER','EXTEND'],scale:['ECHELLE','SCALE'],rotate:['ROTATION','ROTATE'],mirror:['MIROIR','MIRROR'],join:['JOINDRE','JOIN'],fillet:['RACCORD','FILLET'],
 delete:['EFFACER','ERASE'],undo:['ANNULER','UNDO'],redo:['RÉTABLIR','REDO'],pan:['PANORAMIQUE','PAN'],zoom:['ZOOM','ZOOM'],select:['SÉLECTION','SELECT'],
alignedDimension:['COTALIGNEE','DIMALIGNED'],angularDimension:['COTANGULAIRE','DIMANGULAR'],arcDimension:['COTARC','DIMARC'],radius:['COTRAYON','DIMRADIUS'],ordinate:['COTORDONNEE','DIMORDINATE'],jogged:['COTRACCOURCI','DIMJOGGED'],
 hatch:['HACHURES','HATCH'],dimension:['COTATION','DIMENSION'],linearDimension:['COTLIN','DIMLINEAR'],diameter:['COTDIA','DIMDIAMETER'],measure:['DISTANCE','DIST'],text:['TEXTE','TEXT'],viewport:['FENÊTRE','VIEWPORT'],
 copyClip:['COPIERCLIP','COPYCLIP'],cutClip:['COUPERCLIP','CUTCLIP'],pasteClip:['COLLERCLIP','PASTECLIP'],copyBase:['COPIERBASE','COPYBASE'],
 new:['NOUVEAU','NEW'],open:['OUVRIR','OPEN'],save:['SAUVEGARDER','SAVE'],properties:['PROPRIÉTÉS','PROPERTIES'],settings:['OPTIONS','OPTIONS'],addLayout:['PRÉSENTATION','LAYOUT'],
};
export function commandName(id:string,fallback='',lang:Language=language){const names=commandNames[id];return names?names[lang==='fr'?0:1]:t(fallback);}
export function repeatCommandName(id:string){return t('Répéter')+' '+commandName(id);}
if(typeof window!=='undefined')window.addEventListener('storage',event=>{if(event.key===commandLanguageStorageKey){const next=readCommandLanguage(event.newValue);if(next!==language){language=next;listeners.forEach(listener=>listener());}}});
