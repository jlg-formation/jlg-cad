import {useEffect,useRef,useState,useId,type ReactNode} from 'react';
import {labels} from './architecture';
import {commandName} from './command-language';
import {getLanguage,t} from './i18n';
import {toolHelp,type HelpState} from './tool-help';

export type SidebarSectionId='help'|'settings'|'selection'|'layers'|'objects'|'layout';
export function readSectionOpen(id:SidebarSectionId,raw:string|null){
 return raw==='true'?true:raw==='false'?false:id!=='objects';
}

export function SidebarSection({id,title,count,children}:{id:SidebarSectionId;title:string;count?:number;children:ReactNode}){
 const key='jlg-cad-sidebar-'+id,contentId=useId();
 const [open,setOpen]=useState(()=>{try{return readSectionOpen(id,localStorage.getItem(key));}catch{return readSectionOpen(id,null);}});
 const toggle=()=>{const next=!open;setOpen(next);try{localStorage.setItem(key,String(next));}catch{/* The section still works without storage. */}};
 return <section className="sidebar-section" data-section={id}>
  <h3><button type="button" className="sidebar-section-heading" aria-expanded={open} aria-controls={contentId} onClick={toggle}>
   <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" className={open?'expanded':''}><path d="m4 2 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>
   <span>{title}</span>{count!==undefined&&<span className="sidebar-section-count">{count}</span>}
  </button></h3>
  <div id={contentId} className="sidebar-section-content" hidden={!open}>{children}</div>
 </section>;
}

export function ToolHeading({tool}:{tool:HelpState['tool']}){
 const ref=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{const panel=ref.current?.closest('aside');if(panel)panel.scrollTop=0;},[tool]);
 return <h2 ref={ref} className="sidebar-tool-title">{commandName(tool,labels[tool])}</h2>;
}

export function ToolHelp({state,shortcut}:{state:HelpState;shortcut:(id:string)=>string}){
 const help=toolHelp(state,getLanguage());
 const count=state.tool==='hatch'?state.hatchCount:state.tool==='select'||state.tool==='join'||state.tool==='move'||state.tool==='copy'?state.selection:undefined;
 return <section className="tool-help" aria-label={t('Aide de l’outil')}>
  <p className="tool-description">{help.description}</p>
  <p className="tool-instruction" role="status" aria-live="polite" aria-atomic="true">{help.instruction}</p>
  {count!==undefined&&count>0&&<p>{t(state.tool==='select'?'Objets sélectionnés : ':'Objets retenus : ')}{count}</p>}
  {!!state.nodes&&<p>{t('Sommets placés : ')}{state.nodes}{state.closed?' · '+t('Contour fermé'):''}</p>}
  {state.tool==='select'&&!state.selection&&state.lasso&&<p>{t('Maintenez et glissez dans le vide pour sélectionner au lasso.')}</p>}
  {(state.tool==='trim'||state.tool==='extend')&&<p>{state.boundaries?`${state.boundaries} ${t('limite(s) choisie(s)')}`:t('Mode rapide : toutes les formes visibles')}</p>}
  <ul className="tool-hints">{help.hints.map((hint,i)=>{const key=hint.key==='literal'?hint.literal:shortcut(hint.key);return key?<li key={i}><kbd>{key}</kbd><span>{hint.text}</span></li>:null;})}</ul>
 </section>;
}
