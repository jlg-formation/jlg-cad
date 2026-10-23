import {useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ReferencesIcon,AttachPdfIcon,AttachImageIcon} from './cad-icons';
import {t} from './i18n';

const entries=[
 {id:'pdfattach',label:'Attacher un PDF…',description:'Placer une ou plusieurs pages PDF en fond de dessin.',command:'PDFATTACH',Icon:AttachPdfIcon},
 {id:'imageattach',label:'Attacher une image…',description:'Placer une image en fond de dessin.',command:'IAT',Icon:AttachImageIcon},
] as const;

export function ReferenceMenu({onAction}:{onAction:(id:string)=>void}){
 const [position,setPosition]=useState<{right:number;top:number}|null>(null);
 const trigger=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDivElement>(null),scope=useId();
 useEffect(()=>{
  if(!position)return;
  const close=(e:PointerEvent)=>{if(!trigger.current?.contains(e.target as Node)&&!menu.current?.contains(e.target as Node))setPosition(null);};
  const hide=()=>setPosition(null);
  document.addEventListener('pointerdown',close);window.addEventListener('resize',hide);window.addEventListener('scroll',hide,true);
  return()=>{document.removeEventListener('pointerdown',close);window.removeEventListener('resize',hide);window.removeEventListener('scroll',hide,true);};
 },[position]);
 const open=(last=false)=>{
  const rect=trigger.current!.getBoundingClientRect();setPosition({right:Math.max(8,window.innerWidth-rect.right),top:rect.bottom+6});
  requestAnimationFrame(()=>{const items=menu.current?.querySelectorAll<HTMLButtonElement>('button');items?.[last?entries.length-1:0]?.focus();});
 };
 return <><button type="button" ref={trigger} className="other-tools-trigger reference-menu-trigger" aria-label={t('Références')} title={t('Références')} aria-haspopup="menu" aria-expanded={!!position} aria-controls={position?scope:undefined} onClick={()=>position?setPosition(null):open()} onKeyDown={e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();e.stopPropagation();open(e.key==='ArrowUp');}}}>
  <ReferencesIcon size={18}/><svg className="other-tools-chevron" width="7" height="5" viewBox="0 0 7 5" aria-hidden="true"><path d="m1 1 2.5 2.5L6 1" fill="none" stroke="currentColor"/></svg>
 </button>{position&&createPortal(<div ref={menu} id={scope} className="other-tools-menu reference-tools-menu" role="menu" aria-label={t('Références')} style={position} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node)&&e.relatedTarget!==trigger.current)setPosition(null);}} onKeyDown={e=>{
  e.stopPropagation();const items=Array.from(menu.current!.querySelectorAll<HTMLButtonElement>('button')),index=items.indexOf(document.activeElement as HTMLButtonElement);
  if(e.key==='Escape'){e.preventDefault();setPosition(null);trigger.current?.focus();}
  else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();items[e.key==='Home'?0:e.key==='End'?items.length-1:(index+(e.key==='ArrowDown'?1:items.length-1))%items.length].focus();}
 }}>{entries.map(({id,label,description,command,Icon})=><button type="button" key={id} role="menuitem" title={t(description)+' — '+command+' ↵'} onClick={()=>{setPosition(null);trigger.current?.focus();onAction(id);}}><Icon size={24}/><span>{t(label)}</span><kbd>{command} ↵</kbd></button>)}</div>,document.body)}</>;
}
