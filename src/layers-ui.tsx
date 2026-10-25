import {useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {Drawing,Layer,PaperItem} from './model';
import {appearance,layerDefaults,lineWeights,lineTypes,onLayer,usedLayer,type LineType} from './layers';
import {t} from './i18n';
import {LayersIcon,LayerPropertiesIcon,LockIcon,HiddenIcon} from './cad-icons';
import './layers.css';

export function LayerTools({doc,current,onCurrent,onConfigure}:{doc:Drawing;current:string;onCurrent:(id:string)=>void;onConfigure:()=>void}){
 const layer=doc.layers.find(l=>l.id===current)||doc.layers[0];
 const [position,setPosition]=useState<{left:number;top:number;maxHeight:number}|null>(null);
 const trigger=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDivElement>(null),root=useRef<HTMLSpanElement>(null),scope=useId();
 useEffect(()=>{setPosition(null);},[doc,current]);
 useEffect(()=>{
  if(!position)return;
  const close=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node)&&!menu.current?.contains(e.target as Node))setPosition(null);};
  const hide=(e:Event)=>{if(!menu.current?.contains(e.target as Node))setPosition(null);};
  document.addEventListener('pointerdown',close);window.addEventListener('resize',hide);window.addEventListener('scroll',hide,true);
  return()=>{document.removeEventListener('pointerdown',close);window.removeEventListener('resize',hide);window.removeEventListener('scroll',hide,true);};
 },[position]);
 const open=(last=false)=>{
  const rect=trigger.current!.getBoundingClientRect(),width=Math.min(264,window.innerWidth-16);
  setPosition({left:Math.max(8,Math.min(rect.left,window.innerWidth-width-8)),top:rect.bottom+6,maxHeight:Math.max(80,window.innerHeight-rect.bottom-14)});
  requestAnimationFrame(()=>{const buttons=menu.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');(last?buttons?.[buttons.length-1]:menu.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]:not(:disabled)')||buttons?.[0])?.focus();});
 };
 const close=()=>{setPosition(null);trigger.current?.focus({preventScroll:true});};
 const configure=()=>{close();onConfigure();};
 return <span className="layer-tools" ref={root}>
  <button type="button" ref={trigger} className={'other-tools-trigger layer-current-trigger'+(position?' active':'')} aria-label={t('Calques — courant : ')+layer.name} title={t('Calques — courant : ')+layer.name} aria-haspopup="menu" aria-expanded={!!position} aria-controls={position?scope:undefined} onClick={()=>position?setPosition(null):open()} onKeyDown={e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();e.stopPropagation();open(e.key==='ArrowUp');}}}>
   <LayersIcon size={18}/><span className="layer-swatch" style={{background:layer.color}}/><span className="layer-current-name">{layer.name}</span><svg className="other-tools-chevron" width="7" height="5" viewBox="0 0 7 5" fill="none" stroke="currentColor" aria-hidden="true"><path d="m1 1 2.5 2.5L6 1"/></svg>
  </button>
  {position&&createPortal(<div ref={menu} id={scope} className="other-tools-menu layer-tools-menu" role="menu" aria-label={t('Calques')} style={position} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setPosition(null);}} onKeyDown={e=>{
   e.stopPropagation();const buttons=Array.from(menu.current!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')),index=buttons.indexOf(document.activeElement as HTMLButtonElement);
   if(e.key==='Escape'){e.preventDefault();close();}
   else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(index+(e.key==='ArrowDown'?1:buttons.length-1))%buttons.length]?.focus();}
  }}>
   <div className="layer-menu-list">{doc.layers.map(l=><button key={l.id} type="button" role="menuitemradio" aria-checked={l.id===layer.id} disabled={!l.visible||l.locked} title={l.name+(!l.visible?' — '+t('Masqué'):l.locked?' — '+t('Verrouillé'):'')} onClick={()=>{close();onCurrent(l.id);}}>
    <span className="layer-menu-check" aria-hidden="true">{l.id===layer.id&&<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"><path d="m3 8 3 3 7-7"/></svg>}</span><span className="layer-swatch" style={{background:l.color}}/><span className="layer-menu-name">{l.name}</span>{!l.visible?<HiddenIcon size={14}/>:l.locked?<LockIcon size={14}/>:null}
   </button>)}</div>
   <div className="menu-separator" role="separator"/><button type="button" role="menuitem" onClick={configure}><LayerPropertiesIcon size={24}/><span>{t('Configurer les calques…')}</span></button>
  </div>,document.body)}
 </span>;
}

export function LayerSelect({doc,value,onChange,label='Calque courant',available=false}:{doc:Drawing;value:string;onChange:(id:string)=>void;label?:string;available?:boolean}){
 return <label className="layer-select">{t(label)}<select aria-label={t(label)} value={value} onChange={e=>onChange(e.target.value)}>{doc.layers.map(l=><option key={l.id} value={l.id} disabled={available&&(!l.visible||l.locked)}>{l.name}</option>)}</select><span className="layer-swatch" style={{background:doc.layers.find(l=>l.id===value)?.color}}/></label>;
}
export function LayerManager({doc,current,onApply,onClose}:{doc:Drawing;current:string;onApply:(layers:Layer[])=>void;onClose:()=>void}){
 const [layers,setLayers]=useState(()=>doc.layers.map(l=>({...layerDefaults,...l}))),[error,setError]=useState('');
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;dialog.current?.showModal();return()=>previous?.focus();},[]);
 const patch=(id:string,value:Partial<Layer>)=>setLayers(ls=>ls.map(l=>l.id===id?{...l,...value}:l));
 const apply=()=>{
  const names=layers.map(l=>l.name.trim().toLocaleUpperCase());
  if(names.some(n=>!n||n.length>255||/[<>/\\":;?*|=\x00-\x1f]/.test(n))||new Set(names).size!==names.length){setError('Chaque calque doit avoir un nom valide et unique.');return;}
  if(layers.some(l=>!Number.isFinite(l.lineweight)||l.lineweight<0||l.lineweight>2.11||!Number.isFinite(l.transparency)||l.transparency<0||l.transparency>90)){setError('Vérifiez les épaisseurs (0 à 2,11 mm) et la transparence (0 à 90 %).');return;}
  onApply(layers.map(l=>({...l,name:l.name.trim()})));onClose();
 };
 return createPortal(<dialog ref={dialog} className="layer-dialog" aria-labelledby="layer-manager-title" onCancel={onClose}>
  <form onSubmit={e=>{e.preventDefault();apply();}}>
   <header><h2 id="layer-manager-title">{t('Configurer les calques')}</h2><button type="button" aria-label={t('Fermer')} onClick={onClose}>×</button></header>
   <p>{t('Les propriétés « Du calque » des objets suivent automatiquement ces réglages.')}</p>
   <div className="layer-table-scroll"><table><thead><tr>{['Nom','Couleur','Type de trait','Épaisseur (mm)','Visible','Verrouillé','Imprimable','Transparence (%)','Description',''].map((name,i)=><th key={i} scope="col">{t(name)}</th>)}</tr></thead>
    <tbody>{layers.map(l=><tr key={l.id}>
     <td><input aria-label={t('Nom du calque')+' '+l.name} value={l.name} maxLength={255} disabled={l.id==='0'} onChange={e=>patch(l.id,{name:e.target.value})}/>{current===l.id&&<small>{t('Courant')}</small>}</td>
     <td><input type="color" aria-label={t('Couleur du calque')+' '+l.name} value={l.color} onChange={e=>patch(l.id,{color:e.target.value})}/></td>
     <td><select aria-label={t('Type de trait')+' '+l.name} value={l.linetype} onChange={e=>patch(l.id,{linetype:e.target.value as LineType})}>{Object.entries(lineTypes).map(([v,n])=><option key={v} value={v}>{t(n)}</option>)}</select></td>
     <td><select aria-label={t('Épaisseur (mm)')+' '+l.name} value={l.lineweight} onChange={e=>patch(l.id,{lineweight:Number(e.target.value)})}>{[...new Set([...lineWeights,l.lineweight])].sort((a,b)=>a-b).map(n=><option key={n} value={n}>{n.toFixed(2)}</option>)}</select></td>
     {(['visible','locked','printable'] as const).map((k,i)=><td key={k}><input type="checkbox" aria-label={t(['Visible','Verrouillé','Imprimable'][i])+' '+l.name} checked={l[k]} onChange={e=>patch(l.id,{[k]:e.target.checked})}/></td>)}
     <td><input type="number" aria-label={t('Transparence (%)')+' '+l.name} min={0} max={90} required value={l.transparency} onChange={e=>patch(l.id,{transparency:e.target.valueAsNumber})}/></td>
     <td><input aria-label={t('Description')+' '+l.name} maxLength={255} value={l.description} onChange={e=>patch(l.id,{description:e.target.value})}/></td>
     <td><button type="button" aria-label={t('Supprimer le calque')+' '+l.name} title={t('Seuls les calques vides, autres que 0 et le calque courant, peuvent être supprimés.')} disabled={l.id==='0'||l.id===current||usedLayer(doc,l.id)} onClick={()=>setLayers(ls=>ls.filter(x=>x.id!==l.id))}>{t('Supprimer')}</button></td>
    </tr>)}</tbody></table></div>
   {error&&<p role="alert">{t(error)}</p>}
   <footer><button type="button" disabled={layers.length>=200} onClick={()=>{let n=layers.length+1;while(layers.some(l=>l.name===`Calque ${n}`))n++;setLayers(ls=>[...ls,{...layerDefaults,id:crypto.randomUUID(),name:`Calque ${n}`,color:'#ffffff',visible:true,locked:false}]);}}>{t('Ajouter un calque')}</button><span/><button type="button" onClick={onClose}>{t('Annuler')}</button><button type="submit">{t('Appliquer')}</button></footer>
  </form>
 </dialog>,document.body);
}

export function ObjectAppearance({doc,shape,onChange,disabled=false}:{doc:Drawing;shape:PaperItem;onChange:(s:PaperItem)=>void;disabled?:boolean}){
 const resolved=appearance(shape,doc.layers);
 return <fieldset className="object-appearance" disabled={disabled}>
  <LayerSelect doc={doc} value={shape.layerId||'0'} label="Calque de l’objet" onChange={id=>onChange(onLayer(shape,id))}/>
  <label>{t('Couleur')}<select aria-label={t('Source de la couleur')} value={shape.colorByLayer?'layer':'object'} onChange={e=>onChange({...shape,colorByLayer:e.target.value==='layer',color:resolved.color})}><option value="layer">{t('Du calque')}</option><option value="object">{t('Individuelle')}</option></select><input type="color" aria-label={t('Couleur')} value={resolved.color} onChange={e=>onChange({...shape,colorByLayer:false,color:e.target.value})}/></label>
  <label>{t('Type de trait')}<select aria-label={t('Type de trait')} value={shape.linetype??'layer'} onChange={e=>onChange({...shape,linetype:e.target.value==='layer'?undefined:e.target.value as LineType})}><option value="layer">{t('Du calque')}</option>{Object.entries(lineTypes).map(([v,n])=><option key={v} value={v}>{t(n)}</option>)}</select></label>
  {(['lineweight','transparency'] as const).map((k,i)=><label key={k}>{t(i?'Transparence (%)':'Épaisseur (mm)')}<select aria-label={t(i?'Source de la transparence':'Source de l’épaisseur')} value={shape[k]===undefined?'layer':'object'} onChange={e=>onChange({...shape,[k]:e.target.value==='layer'?undefined:resolved[k]})}><option value="layer">{t('Du calque')}</option><option value="object">{t('Individuelle')}</option></select>{k==='lineweight'&&shape.lineweight!==undefined?<select aria-label={t('Épaisseur (mm)')} value={shape.lineweight} onChange={e=>onChange({...shape,lineweight:Number(e.target.value)})}>{[...new Set([...lineWeights,shape.lineweight])].sort((a,b)=>a-b).map(n=><option key={n} value={n}>{n.toFixed(2)}</option>)}</select>:shape[k]!==undefined&&<input type="number" aria-label={t(i?'Transparence (%)':'Épaisseur (mm)')} min={0} max={i?90:2.11} step={i?1:.01} value={shape[k]} onChange={e=>{const n=e.target.valueAsNumber;if(Number.isFinite(n)&&n>=0&&n<=(i?90:2.11))onChange({...shape,[k]:n});}}/>}</label>)}
 </fieldset>;
}
