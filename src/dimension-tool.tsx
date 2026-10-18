import {useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {DimensionIcon,LinearDimensionIcon,DiameterDimensionIcon,AlignedDimensionIcon,AngularDimensionIcon,ArcLengthDimensionIcon,RadiusDimensionIcon,OrdinateDimensionIcon,JoggedDimensionIcon} from './cad-icons';
import {commandName} from './command-language';
import {t} from './i18n';
import {toolTooltip} from './tool-tooltip';
import type {Tool} from './architecture';
export const dimensionTools=['linearDimension','alignedDimension','angularDimension','arcDimension','radius','diameter','ordinate','jogged','dimension'] as const;
type DimensionTool=typeof dimensionTools[number];
export const isDimensionTool=(tool:Tool):tool is DimensionTool=>dimensionTools.includes(tool as DimensionTool);
export const dimensionToolIcons={dimension:DimensionIcon,linearDimension:LinearDimensionIcon,diameter:DiameterDimensionIcon,alignedDimension:AlignedDimensionIcon,angularDimension:AngularDimensionIcon,arcDimension:ArcLengthDimensionIcon,radius:RadiusDimensionIcon,ordinate:OrdinateDimensionIcon,jogged:JoggedDimensionIcon};
const labels:Record<DimensionTool,string>={dimension:'Cotation',linearDimension:'Cotation linéaire',diameter:'Diamètre',alignedDimension:"Alignée",angularDimension:"Angulaire",arcDimension:"Longueur d’arc",radius:"Rayon",ordinate:"Ordonnée",jogged:"Rayon raccourci"};
export function DimensionToolButton({tool,onTool,shortcut}:{tool:Tool;onTool:(tool:Tool)=>void;shortcut:(id:string)=>string}) {
 const [last,setLast]=useState<DimensionTool>(()=>isDimensionTool(tool)?tool:'dimension');
 const [position,setPosition]=useState<{left:number;top:number}|null>(null);
 const trigger=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDivElement>(null),scope=useId();
 const current=isDimensionTool(tool)?tool:last;
 const CurrentIcon=dimensionToolIcons[current];
 useEffect(()=>{if(isDimensionTool(tool))setLast(tool);setPosition(null);},[tool]);
 useEffect(()=>{
  if(!position)return;
  const close=(event:PointerEvent)=>{if(!trigger.current?.contains(event.target as Node)&&!menu.current?.contains(event.target as Node))setPosition(null);};
  const hide=()=>setPosition(null);
  document.addEventListener('pointerdown',close);window.addEventListener('resize',hide);window.addEventListener('scroll',hide,true);
  return()=>{document.removeEventListener('pointerdown',close);window.removeEventListener('resize',hide);window.removeEventListener('scroll',hide,true);};
 },[position]);
 const open=(lastItem=false)=>{
  const rect=trigger.current!.getBoundingClientRect();setPosition({left:Math.max(8,Math.min(rect.left,window.innerWidth-264)),top:rect.bottom+6});
  requestAnimationFrame(()=>{const buttons=menu.current?.querySelectorAll<HTMLButtonElement>('button');buttons?.[lastItem?dimensionTools.length-1:dimensionTools.indexOf(current)]?.focus();});
 };
 const choose=(next:DimensionTool)=>{setLast(next);setPosition(null);trigger.current?.focus();onTool(next);};
 return <span className={'dimension-split-button'+(isDimensionTool(tool)?' active':'')}>
  <button type="button" className={isDimensionTool(tool)?'active':''} aria-label={commandName(current,labels[current])} title={toolTooltip(current,t(labels[current]),shortcut)} onClick={()=>onTool(current)}><CurrentIcon size={18}/></button>
  <button type="button" ref={trigger} className="dimension-menu-trigger" aria-label={t('Choisir un outil de cotation')} title={t('Choisir un outil de cotation')} aria-haspopup="menu" aria-expanded={!!position} aria-controls={position?scope:undefined} onClick={()=>position?setPosition(null):open()} onKeyDown={e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();e.stopPropagation();open(e.key==='ArrowUp');}}}><svg width="7" height="5" viewBox="0 0 7 5" aria-hidden="true"><path d="m1 1 2.5 2.5L6 1" fill="none" stroke="currentColor"/></svg></button>
  {position&&createPortal(<div ref={menu} id={scope} className="other-tools-menu dimension-tools-menu" role="menu" aria-label={t('Choisir un outil de cotation')} style={position} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setPosition(null);}} onKeyDown={e=>{
   e.stopPropagation();const buttons=Array.from(menu.current!.querySelectorAll<HTMLButtonElement>('button')),index=buttons.indexOf(document.activeElement as HTMLButtonElement);
   if(e.key==='Escape'){e.preventDefault();setPosition(null);trigger.current?.focus();}
   else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();buttons[e.key==='Home'?0:e.key==='End'?dimensionTools.length-1:(index+(e.key==='ArrowDown'?1:dimensionTools.length-1))%dimensionTools.length].focus();}
  }}>{dimensionTools.map(id=>{const Icon=dimensionToolIcons[id];return <button type="button" key={id} role="menuitemradio" aria-checked={current===id} className={current===id?'active':''} onClick={()=>choose(id)} title={toolTooltip(id,t(labels[id]),shortcut)}><Icon size={18}/><span>{t(labels[id])}</span>{shortcut(id)&&<kbd>{shortcut(id)}</kbd>}</button>;})}</div>,document.body)}
 </span>;
}
