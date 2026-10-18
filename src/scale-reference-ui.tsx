import type {CSSProperties} from 'react';
import type {Point,Viewport} from './model';
import {modelToPaper} from './model';
import {t} from './i18n';
import {displayDistance,type LengthUnit} from './drafting';
import {scaleReferenceGuides,type ScaleReferenceSession} from './scale-reference';

export function ScaleEntry({session,value,placeholder,onValue,onSubmit,onCancel,onReference,onPoints,style,unit}: {
 session:ScaleReferenceSession|null;value:string;placeholder:string;onValue:(value:string)=>void;onSubmit:()=>void;onCancel:()=>void;onReference:()=>void;onPoints:()=>void;style:CSSProperties;unit:LengthUnit;
}){
 const label=!session?'Facteur d’échelle':session.phase==='reference'||session.phase==='referenceEnd'?'Longueur de référence':'Nouvelle longueur';
 const defaultLength=session?(session.phase==='reference'?session.defaultReference:session.phase==='length'?session.defaultTarget:undefined):undefined;
 return <div className="dynamic-length scale-entry" role="group" aria-label={t(label)} style={style}>
  <label>{t(label)}<input aria-label={t(label)} inputMode="text" value={value} placeholder={defaultLength===undefined?placeholder:displayDistance(defaultLength,unit)} onChange={e=>onValue(e.target.value)} onKeyDown={e=>{
   if(e.key==='Enter'||e.key===' '&&/^(R|REFERENCE|P|POINTS|C|COPY)$/i.test(value.trim())){e.preventDefault();e.stopPropagation();onSubmit();}
   if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onCancel();}
  }}/>{session&&<span>{unit}</span>}</label>
  {!session&&<button type="button" onClick={onReference}>{t('R — Référence')}</button>}
  {session?.phase==='length'&&<button type="button" onClick={onPoints}>{t('P — Points')}</button>}
  <small>{t('Entrée : valider · Échap : annuler')}</small>
 </div>;
}
export function ScaleReferenceGuide({session,base,pointer,scale,viewport}:{session:ScaleReferenceSession|null;base?:Point;pointer:Point;scale:number;viewport?:Viewport}){
 if(!session||!base)return null;
 const project=(p:Point)=>viewport?modelToPaper(p,viewport):p,anchor=project(base);
 return <g pointerEvents="none" aria-label={t('Repères de mise à l’échelle')}>
  <circle cx={anchor.x} cy={anchor.y} r={4/scale} fill="none" stroke="#299b88" strokeWidth={1/scale}/>
  {scaleReferenceGuides(session,base,pointer).map(([a,b],i)=>{const p=project(a),q=project(b);return <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="#e6b776" strokeDasharray={`${5/scale} ${3/scale}`} strokeWidth={1/scale}/>;})}
 </g>;
}
