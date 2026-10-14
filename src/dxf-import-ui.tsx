import {useEffect,useMemo,useRef,useState} from 'react';
import {bounds,type Drawing} from './model';
import {importDxf,inspectDxf,dxfUnits,type DxfImport,type DxfUnit} from './dxf-import';

export function DxfImportDialog({text,name,changed,onBackup,onCancel,onImport}:{text:string;name:string;changed:boolean;onBackup:()=>void;onCancel:()=>void;onImport:(result:DxfImport)=>void}){
 const ref=useRef<HTMLDialogElement>(null),info=useMemo(()=>inspectDxf(text),[text]);
 const [unit,setUnit]=useState<DxfUnit|''>(info.unit||''),[result,setResult]=useState<DxfImport|null>(null),[error,setError]=useState('');
 useEffect(()=>{ref.current?.showModal();},[]);
 const analyze=()=>{setResult(null);setError('');try{if(!unit)throw new Error('Choisissez une unité.');setResult(importDxf(text,name,unit===info.unit?undefined:unit));}catch(e){setError((e as Error).message);}};
 return <dialog ref={ref} className="help-dialog dxf-import-dialog" aria-label="Importer un DXF" onCancel={e=>{e.preventDefault();onCancel();}} onKeyDown={e=>e.stopPropagation()}>
  <h2>Importer un DXF</h2><p>{name} · version {info.version} · espace objet 2D</p>
  <label>Unité du fichier <select aria-label="Unité du DXF" value={unit} onChange={e=>{setUnit(e.target.value as DxfUnit);setResult(null);setError('');}}><option value="">Choisir une unité…</option>{Object.keys(dxfUnits).map(u=><option key={u} value={u}>{({mm:'Millimètres',cm:'Centimètres',m:'Mètres',in:'Pouces',ft:'Pieds'} as Record<string,string>)[u]}</option>)}</select></label>
  <p>{info.unit?'Unité indiquée dans le DXF, modifiable si nécessaire.':'Unité absente ou non prise en charge : choisissez-la avant de continuer.'}{unit&&` 1 unité DXF = ${dxfUnits[unit]} mm.`}</p>
  <button disabled={!unit} onClick={analyze}>Analyser le fichier</button>
  {error&&<p role="alert">{error}</p>}
  {result&&<><h3>Bilan de l’import</h3><p>{result.report.objects} objets éditables · {result.drawing.layers.length} calques · {result.report.blocks} blocs décomposés</p><DrawingExtent drawing={result.drawing}/>
   {Object.keys(result.report.skipped).length>0&&<><h4>Éléments non importés</h4><ul>{Object.entries(result.report.skipped).map(([type,count])=><li key={type}>{type} : {count}</li>)}</ul></>}
   {result.report.warnings.length>0&&<><h4>Conversions et limites</h4><ul>{result.report.warnings.map(w=><li key={w}>{w}</li>)}</ul></>}
   <p>Le résultat sera à sauvegarder en .jlgcad. Les présentations et la structure des blocs ne sont pas conservées.</p>
  </>}
  {changed&&<p>Le dessin actuel contient des modifications non sauvegardées. <button onClick={onBackup}>Télécharger une sauvegarde du dessin actuel</button></p>}
  <div className="new-actions"><button autoFocus onClick={onCancel}>Annuler</button><button disabled={!result?.report.objects} onClick={()=>result&&onImport(result)}>{changed?'Remplacer par le dessin importé':'Ouvrir le dessin importé'}</button></div>
 </dialog>;
}
function DrawingExtent({drawing}:{drawing:Drawing}){
 if(!drawing.shapes.length)return <p>Aucun objet compatible : le dessin actuel sera conservé.</p>;
 const boxes=drawing.shapes.map(bounds),width=Math.max(...boxes.map(b=>b.x+b.width))-Math.min(...boxes.map(b=>b.x)),height=Math.max(...boxes.map(b=>b.y+b.height))-Math.min(...boxes.map(b=>b.y));
 return <p>Enveloppe du dessin : {width.toLocaleString('fr-FR',{maximumFractionDigits:2})} × {height.toLocaleString('fr-FR',{maximumFractionDigits:2})} mm. Les textes sont mesurés approximativement. Vérifiez que ces dimensions correspondent au plan attendu.</p>;
}
