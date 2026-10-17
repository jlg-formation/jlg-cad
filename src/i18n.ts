import {useSyncExternalStore} from 'react';
import english from './locales/en.json';
export type Language='fr'|'en';
export const languageStorageKey='jlg-cad-language';
export function readLanguage(raw:string|null):Language{return raw==='en'?'en':'fr';}
let language:Language='fr';
try{language=readLanguage(localStorage.getItem(languageStorageKey));}catch{/* French remains available when storage is blocked. */}
const listeners=new Set<()=>void>();
export function getLanguage(){return language;}
export function setLanguage(next:Language){if(next===language)return;language=next;try{localStorage.setItem(languageStorageKey,next);}catch{/* The choice still applies for this session. */}if(typeof document!=='undefined')document.documentElement.lang=next;listeners.forEach(listener=>listener());}
export function useLanguage(){return useSyncExternalStore(listener=>{listeners.add(listener);return()=>{listeners.delete(listener);};},getLanguage,()=> 'fr' as Language);}
export function translate(text:string,lang:Language):string{
 if(lang==='fr')return text;
 const exact=(english as Record<string,string>)[text];if(exact!==undefined)return exact;
 for(const separator of [' — ',' · '])if(text.includes(separator))return text.split(separator).map(part=>translate(part,lang)).join(separator);
 const prefixes:Record<string,string>={'Masquer ':'Hide ','Afficher ':'Show ','Verrouiller ':'Lock ','Déverrouiller ':'Unlock ','Supprimer le calque ':'Delete layer ','Nom du calque ':'Layer name ','Couleur du calque ':'Layer color ','Modifier ':'Edit ','Retirer ':'Remove ','Ajouter un raccourci pour ':'Add shortcut for '};
 for(const [prefix,replacement]of Object.entries(prefixes))if(text.startsWith(prefix))return replacement+text.slice(prefix.length);
 return text;
}
export function t(text:string|undefined):string{if(!text)return '';if(language==='en'&&text.startsWith('Répéter '))return 'Repeat '+t(text.slice(8));return translate(text,language);}
if(typeof document!=='undefined')document.documentElement.lang=language;
if(typeof window!=='undefined')window.addEventListener('storage',event=>{if(event.key===languageStorageKey){const next=readLanguage(event.newValue);if(next!==language){language=next;document.documentElement.lang=next;listeners.forEach(listener=>listener());}}});
