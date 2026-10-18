import {t} from './i18n';
import {useEffect,useMemo,useRef,useState} from 'react';
import {bounds,type Drawing} from './model';
import {importDxf,inspectDxf,dxfUnits,type DxfImport,type DxfUnit} from './dxf-import';

export function DxfImportDialog({text,name,changed,onBackup,onCancel,onImport}:{text:string;name:string;changed:boolean;onBackup:()=>void;onCancel:()=>void;onImport:(result:DxfImport)=>void}){
 const ref=useRef<HTMLDialogElement>(null),info=useMemo(()=>inspectDxf(text),[text]);
 const [unit,setUnit]=useState<DxfUnit|''>(info.unit||''),[result,setResult]=useState<DxfImport|null>(null),[error,setError]=useState('');
 useEffect(()=>{ref.current?.showModal();},[]);
 const analyze=()=>{setResult(null);setError('');try{if(!unit)throw new Error('Choisissez une unité.');setResult(importDxf(text,name,unit===info.unit?undefined:unit));}catch(e){setError((e as Error).message);}};
 return <dialog ref={ref} className="help-dialog dxf-import-dialog" aria-label={t("Importer un DXF")} onCancel={e=>{e.preventDefault();onCancel();}} onKeyDown={e=>e.stopPropagation()}>
  <h2>{t("Importer un DXF")}</h2><p>{name} {t("· version")} {info.version} {t("· espace objet 2D")}</p>
  <label>{t("Unité du fichier")} <select aria-label={t("Unité du DXF")} value={unit} onChange={e=>{setUnit(e.target.value as DxfUnit);setResult(null);setError('');}}><option value="">{t("Choisir une unité…")}</option>{Object.keys(dxfUnits).map(u=><option key={u} value={u}>{({mm:'Millimètres',cm:'Centimètres',m:'Mètres',in:'Pouces',ft:'Pieds'} as Record<string,string>)[u]}</option>)}</select></label>
  <p>{info.unit?'Unité indiquée dans le DXF, modifiable si nécessaire.':'Unité absente ou non prise en charge : choisissez-la avant de continuer.'}{unit&&` 1 unité DXF = ${dxfUnits[unit]} mm.`}</p>
  <button disabled={!unit} onClick={analyze}>{t("Analyser le fichier")}</button>
  {error&&<p role="alert">{error}</p>}
  {result&&<><h3>{t("Bilan de l’import")}</h3><p>{result.report.objects} {t("objets éditables ·")} {result.drawing.layers.length} {t("calques ·")} {result.report.blocks} {t("insertions de blocs analysées")}</p><DrawingExtent drawing={result.drawing}/>
   {Object.keys(result.report.skipped).length>0&&<><h4>{t("Éléments non importés")}</h4><ul>{Object.entries(result.report.skipped).map(([type,count])=><li key={type}>{type} : {count}</li>)}</ul></>}
   {result.report.warnings.length>0&&<><h4>{t("Conversions et limites")}</h4><ul>{result.report.warnings.map(w=><li key={w}>{w}</li>)}</ul></>}
   <p>{t("Le résultat sera à sauvegarder en .jlgcad. Les présentations et la structure des blocs ne sont pas conservées.")}</p>
  </>}
  {changed&&<p>{t("Le dessin actuel contient des modifications non sauvegardées.")} <button onClick={onBackup}>{t("Télécharger une sauvegarde du dessin actuel")}</button></p>}
  <div className="new-actions"><button autoFocus onClick={onCancel}>{t("Annuler")}</button><button disabled={!result?.report.objects} onClick={()=>result&&onImport(result)}>{changed?'Remplacer par le dessin importé':'Ouvrir le dessin importé'}</button></div>
 </dialog>;
}
function DrawingExtent({drawing}:{drawing:Drawing}){
 if(!drawing.shapes.length)return <p>{t("Aucun objet compatible : le dessin actuel sera conservé.")}</p>;
 const boxes=drawing.shapes.map(bounds),width=Math.max(...boxes.map(b=>b.x+b.width))-Math.min(...boxes.map(b=>b.x)),height=Math.max(...boxes.map(b=>b.y+b.height))-Math.min(...boxes.map(b=>b.y));
 return <p>{t("Enveloppe du dessin :")} {width.toLocaleString('fr-FR',{maximumFractionDigits:2})} {t("×")} {height.toLocaleString('fr-FR',{maximumFractionDigits:2})} {t("mm. Les textes sont mesurés approximativement. Vérifiez que ces dimensions correspondent au plan attendu.")}</p>;
}
