import {createPortal} from 'react-dom';
import {BlockIcon,CreateBlockIcon,InsertBlockIcon,EditBlockIcon,ExplodeBlockIcon,CloseBlockIcon} from './cad-icons';
import {toolTooltip} from './tool-tooltip';
import {useEffect,useId,useRef,useState} from 'react';
import {t} from './i18n';
import {commandName} from './command-language';
import {bounds,type BlockDefinition} from './model';
import {svgPath} from './geometry';
import './blocks.css';
const blockMenuLabels:Record<string,string>={block:'Créer un bloc',insert:'Insérer un bloc',bedit:'Éditer un bloc',explode:'Décomposer un bloc',bclose:'Fermer l’éditeur de bloc'};
const blockMenuIcons={block:CreateBlockIcon,insert:InsertBlockIcon,bedit:EditBlockIcon,explode:ExplodeBlockIcon,bclose:CloseBlockIcon};
type BlockAction=keyof typeof blockMenuIcons;
export function BlockMenu({editing,disabled,onAction,shortcut}:{editing:boolean;disabled:boolean;onAction:(action:string)=>void;shortcut:(action:string)=>string}){
 const [position,setPosition]=useState<{left:number;top:number;maxHeight:number}|null>(null);
 const root=useRef<HTMLSpanElement>(null),trigger=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDivElement>(null),scope=useId();
 const actions:BlockAction[]=editing?['bclose']:['block','insert','bedit','explode'];
 useEffect(()=>{setPosition(null);},[editing,disabled]);
 useEffect(()=>{
  if(!position)return;
  const close=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node)&&!menu.current?.contains(e.target as Node))setPosition(null);};
  const hide=()=>setPosition(null);
  document.addEventListener('pointerdown',close);window.addEventListener('resize',hide);window.addEventListener('scroll',hide,true);
  return()=>{document.removeEventListener('pointerdown',close);window.removeEventListener('resize',hide);window.removeEventListener('scroll',hide,true);};
 },[position]);
 const open=(lastItem=false)=>{
  const rect=root.current!.getBoundingClientRect(),width=Math.min(264,window.innerWidth-16);
  setPosition({left:Math.max(8,Math.min(rect.left,window.innerWidth-width-8)),top:rect.bottom+6,maxHeight:Math.max(80,window.innerHeight-rect.bottom-14)});
  requestAnimationFrame(()=>{const buttons=menu.current?.querySelectorAll<HTMLButtonElement>('button');buttons?.[lastItem?actions.length-1:0]?.focus();});
 };
 const choose=(action:BlockAction)=>{setPosition(null);trigger.current?.focus();onAction(action);};
 return <span ref={root} className="block-split-button" role="group" aria-label={t('Blocs')}>
  <button type="button" ref={trigger} className={'other-tools-trigger'+(position?' active':'')} disabled={disabled} aria-label={t('Blocs')} title={t('Blocs')} aria-haspopup="menu" aria-expanded={!!position} aria-controls={position?scope:undefined} onClick={()=>position?setPosition(null):open()} onKeyDown={e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();e.stopPropagation();open(e.key==='ArrowUp');}}}><BlockIcon size={18}/><svg width="7" height="5" viewBox="0 0 7 5" fill="none" stroke="currentColor" aria-hidden="true"><path d="m1 1 2.5 2.5L6 1"/></svg></button>
  {position&&createPortal(<div ref={menu} id={scope} className="other-tools-menu dimension-tools-menu block-tools-menu" role="menu" aria-label={t('Blocs')} style={position} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setPosition(null);}} onKeyDown={e=>{
   e.stopPropagation();const buttons=Array.from(menu.current!.querySelectorAll<HTMLButtonElement>('button')),index=buttons.indexOf(document.activeElement as HTMLButtonElement);
   if(e.key==='Escape'){e.preventDefault();setPosition(null);trigger.current?.focus();}
   else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(index+(e.key==='ArrowDown'?1:buttons.length-1))%buttons.length].focus();}
  }}>{actions.map(action=>{const Icon=blockMenuIcons[action];return <button key={action} type="button" role="menuitem" title={toolTooltip(action,t(blockMenuLabels[action]),shortcut)} onClick={()=>choose(action)}><Icon size={24}/><span>{t(blockMenuLabels[action])}</span><kbd>{shortcut(action)||commandName(action)+' ↵'}</kbd></button>;})}</div>,document.body)}
 </span>;
}
export function BlockPreview({block}:{block:BlockDefinition}){
 const boxes=block.shapes.map(bounds),x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y)),w=Math.max(...boxes.map(b=>b.x+b.width))-x,h=Math.max(...boxes.map(b=>b.y+b.height))-y,pad=Math.max(w,h,1)*.12;
 return <svg className="block-preview" aria-label={block.name} viewBox={`${x-pad} ${y-pad} ${Math.max(w,1)+pad*2} ${Math.max(h,1)+pad*2}`}><g stroke="currentColor" fill="none">{block.shapes.map(s=>s.type==='text'?<text key={s.id} x={s.a.x} y={s.a.y} fontSize={s.height} fill="currentColor" stroke="none">{s.text}</text>:<path key={s.id} d={s.type==='hatch'?s.regions.flatMap(r=>r.loops.map(loop=>'M'+loop.map(p=>`${p.x},${p.y}`).join('L')+'Z')).join(' '):svgPath(s)} vectorEffect="non-scaling-stroke"/>)}</g></svg>;
}
export function BlockDialog({mode,blocks,initialId,onCancel,onSubmit,onImport}:{mode:'block'|'insert'|'bedit';blocks:BlockDefinition[];initialId?:string;onCancel:()=>void;onSubmit:(data:{name:string;definitionId:string;scale:number;angle:number;replace:boolean})=>void;onImport?:(file:File)=>Promise<void>}){
 const ref=useRef<HTMLDialogElement>(null),[name,setName]=useState(''),[definitionId,setId]=useState(initialId||blocks[0]?.id||''),[scale,setScale]=useState('1'),[angle,setAngle]=useState('0'),[replace,setReplace]=useState(true),[error,setError]=useState('');
 useEffect(()=>{ref.current?.showModal();},[]);
 useEffect(()=>{if(!blocks.some(b=>b.id===definitionId))setId(blocks[0]?.id||'');},[blocks]);
 const chosen=blocks.find(b=>b.id===definitionId);
 return <dialog ref={ref} className="help-dialog block-dialog" aria-label={commandName(mode)} onCancel={e=>{e.preventDefault();onCancel();}} onKeyDown={e=>e.stopPropagation()}><form onSubmit={e=>{e.preventDefault();try{onSubmit({name,definitionId,scale:Number(scale.replace(',','.')),angle:Number(angle.replace(',','.')),replace});}catch(err){setError((err as Error).message);}}}>
 <h2>{commandName(mode)}</h2>
 {mode==='block'?<><label>{t('Nom du bloc')}<input autoFocus required maxLength={255} value={name} onChange={e=>setName(e.target.value)}/></label><label className="block-check"><input type="checkbox" checked={replace} onChange={e=>setReplace(e.target.checked)}/>{t('Remplacer les objets par un bloc')}</label><p>{t('Validez puis cliquez le point de base dans le dessin.')}</p></>:<><label>{t('Blocs du dessin')}<select autoFocus value={definitionId} onChange={e=>setId(e.target.value)}>{blocks.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>{chosen&&<BlockPreview block={chosen}/>}<p>{blocks.length?t('Choisissez un bloc dans la liste.'):t('Aucun bloc dans ce dessin. Créez un bloc ou récupérez-en depuis un ancien plan.')}</p>{onImport&&<label>{t('Récupérer des blocs depuis un plan (.jlgcad ou .dxf)')}<input type="file" accept=".jlgcad,.jlcad,.json,.dxf" onChange={async e=>{const file=e.target.files?.[0];if(file)try{await onImport(file);setError('');}catch(err){setError((err as Error).message);}e.target.value='';}}/></label>}{mode==='insert'&&<div className="block-fields"><label>{t('Échelle')}<input required inputMode="decimal" value={scale} onChange={e=>setScale(e.target.value)}/></label><label>{t('Rotation (°)')}<input required inputMode="decimal" value={angle} onChange={e=>setAngle(e.target.value)}/></label></div>}</>}
 {error&&<p role="alert">{t(error)}</p>}<div className="new-actions"><button type="button" onClick={onCancel}>{t('Annuler')}</button><button type="submit" className="primary" disabled={mode!=='block'&&!chosen}>{t(mode==='block'?'Choisir le point de base':mode==='insert'?'Placer dans le dessin':'Ouvrir l’éditeur')}</button></div>
 </form></dialog>;
}
export function CloseBlockDialog({error,onSave,onDiscard,onCancel}:{error?:string;onSave:()=>void;onDiscard:()=>void;onCancel:()=>void}){const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{ref.current?.showModal();},[]);return <dialog ref={ref} className="help-dialog" aria-label={t('Fermer l’éditeur de bloc')} onCancel={e=>{e.preventDefault();onCancel();}} onKeyDown={e=>e.stopPropagation()}><h2>{t('Enregistrer les modifications du bloc ?')}</h2><p>{t('Toutes les insertions de ce bloc seront mises à jour.')}</p>{error&&<p role="alert">{t(error)}</p>}<div className="new-actions"><button onClick={onCancel}>{t('Continuer l’édition')}</button><button onClick={onDiscard}>{t('Abandonner les modifications')}</button><button className="primary" onClick={onSave}>{t('Enregistrer le bloc')}</button></div></dialog>;}
