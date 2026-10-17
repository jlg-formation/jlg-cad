import {useLayoutEffect,useRef,useState} from 'react';
import {CopyResultIcon,CloseIcon} from './cad-icons';
import {t} from './i18n';
import './measurement-result.css';

export function MeasurementResult({result,anchor,onClose}:{result:string;anchor:{x:number;y:number};onClose:()=>void}){
 const [feedback,setFeedback]=useState('');
 const panel=useRef<HTMLElement>(null);
 const [position,setPosition]=useState({left:8,top:8});
 useLayoutEffect(()=>{
  const element=panel.current,parent=element?.parentElement;
  if(!element||!parent)return;
  const place=()=>{
   const gap=12,margin=8,width=element.offsetWidth,height=element.offsetHeight;
   const x=anchor.x+gap+width<=parent.clientWidth-margin?anchor.x+gap:anchor.x-gap-width;
   const y=anchor.y+gap+height<=parent.clientHeight-margin?anchor.y+gap:anchor.y-gap-height;
   setPosition({left:Math.max(margin,Math.min(x,parent.clientWidth-width-margin)),top:Math.max(margin,Math.min(y,parent.clientHeight-height-margin))});
  };
  place();
  const observer=new ResizeObserver(place);observer.observe(parent);observer.observe(element);
  return()=>observer.disconnect();
 },[anchor.x,anchor.y]);
 const copy=async()=>{
  try{await navigator.clipboard.writeText(result);setFeedback(t('Résultat copié.'));}
  catch{setFeedback(t('Impossible de copier le résultat.'));}
 };
 return <section ref={panel} style={position} className="measurement-result" role="region" aria-label={t('Résultat de la mesure')} onPointerDown={e=>e.stopPropagation()} onKeyDown={e=>e.stopPropagation()}>
  <div className="measurement-result-header"><strong>{t('Résultat de la mesure')}</strong><div>
   <button type="button" aria-label={t('Copier le résultat')} title={t('Copier le résultat')} onClick={copy}><CopyResultIcon size={16}/></button>
   <button type="button" aria-label={t('Fermer')} title={t('Fermer')} onClick={onClose}><CloseIcon size={16}/></button>
  </div></div>
  <output aria-live="polite" aria-atomic="true">{result}</output>
  <span className="measurement-feedback" role="status">{feedback}</span>
 </section>;
}
