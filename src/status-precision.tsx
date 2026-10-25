import {t} from './i18n';
import React,{useEffect,useRef,useState} from 'react';
import type {Settings} from './architecture';
import type {Snap} from './geometry';
import {statusTooltip,type Bindings} from './shortcuts';

export const objectSnapKinds:Snap['kind'][]=['Extrémité','Milieu','Centre','Intersection','Alignement des cotations'];
export function StatusPrecision({bindings,settings,setSettings,kinds,setKinds}:{bindings:Bindings;settings:Settings;setSettings:React.Dispatch<React.SetStateAction<Settings>>;kinds:Snap['kind'][];setKinds:React.Dispatch<React.SetStateAction<Snap['kind'][]>>}){
 const [menu,setMenu]=useState<'osnap'|'polar'|null>(null),root=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(!menu)return;
  const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setMenu(null);};
  const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();setMenu(null);root.current?.querySelector<HTMLButtonElement>(`[data-control="${menu}"]`)?.focus();}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
 },[menu]);
 return <div className="status-precision" ref={root} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setMenu(null);}}>
 <div className="status-split">
 <button className={`status-mode ${settings.polarEnabled?'enabled':''}`} aria-label={t("Guidage polaire")} aria-pressed={settings.polarEnabled} title={t(statusTooltip(bindings,'polar','Guidage polaire',settings.polarEnabled)+' · '+settings.polarAngle.toLocaleString('fr-FR')+'°')} onClick={()=>{setMenu(null);setSettings(s=>({...s,polarEnabled:!s.polarEnabled,ortho:s.polarEnabled?s.ortho:false}));}}><svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" aria-hidden="true"><circle cx="10" cy="13" r="8"/><path d="M22 13H10L20 3"/></svg></button>
 <button data-control="polar" className="status-mode status-menu-arrow" aria-label={t("Réglages du guidage polaire")} aria-expanded={menu==='polar'} title={t("Réglages du guidage polaire")} onClick={()=>setMenu(menu==='polar'?null:'polar')}>▾</button>
 </div>
 <div className="status-split">
 <button className={`status-mode ${settings.osnap?'enabled':''}`} aria-label={t("Accrochage objet")} aria-pressed={settings.osnap} title={t(statusTooltip(bindings,'osnap','Accrochage objet',settings.osnap))} onClick={()=>{setMenu(null);setSettings(s=>({...s,osnap:!s.osnap}));}}><svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M7 5h14v16H5V7"/><rect x="2" y="2" width="5" height="5"/></svg></button>
 <button data-control="osnap" className="status-mode status-menu-arrow" aria-label={t("Réglages des accrochages aux objets")} aria-expanded={menu==='osnap'} title={t("Réglages accrochage objet")} onClick={()=>setMenu(menu==='osnap'?null:'osnap')}>▾</button>
 </div>
 {menu&&<div className="status-precision-menu" role="group" aria-label={t(menu==='osnap'?'Options OSnap':'Angles du guidage polaire')}>
 <strong>{menu==='osnap'?'Accrochages aux objets':t("Guidage polaire")}</strong>
 {menu==='osnap'?<>{objectSnapKinds.map(kind=><label key={kind}><input type="checkbox" checked={kinds.includes(kind)} onChange={e=>{const enabled=e.target.checked;setKinds(current=>enabled?[...current,kind]:current.filter(k=>k!==kind));}}/>{t(kind)}</label>)}</>:<>{[90,45,30,22.5,18,15,10,5].map(angle=><label key={angle}><input type="radio" name="status-polar-angle" checked={settings.polarAngle===angle} onChange={()=>{setSettings(s=>({...s,polarAngle:angle}));setMenu(null);root.current?.querySelector<HTMLButtonElement>('[data-control="polar"]')?.focus();}}/>{angle.toLocaleString('fr-FR')+'°'}</label>)}</>}
 </div>}
 </div>;
}
