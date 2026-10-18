import {zipSync,strToU8} from 'fflate';
import type {Drawing} from './model';
import {parseDrawing} from './model';
import {exportReferenceShapes} from './references';
import {dataBytes} from './reference-files';
import {toModernDxf} from './dxf-modern';

export function transmissionName(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]/g,'_').replace(/^\.+/,'').slice(0,100)||'dessin';}
export function transmitDrawing(input:Drawing){
 for(const s of input.shapes)if(s.type==='reference'&&!input.references?.some(r=>r.id===s.sourceId&&r.pages.some(p=>p.page===s.page)))throw new Error('Référence manquante : '+s.sourceId+'. Remplacez la source ou détachez la référence.');
 const doc=parseDrawing(JSON.stringify(input)),shapes=exportReferenceShapes(doc),used=new Set(shapes.filter(s=>s.type==='reference').map(s=>s.sourceId)),sources=(doc.references||[]).filter(r=>used.has(r.id));
 const entries:Record<string,Uint8Array>={},paths=new Map<string,string>(),names=new Set<string>(),name=transmissionName(doc.name);
 for(const source of sources){const extension=source.kind==='pdf'?'.pdf':source.data.startsWith('data:image/png')?'.png':'.jpg';const base=transmissionName(source.name.replace(/\.[^.]+$/,''));let file=base+extension,n=2;while(names.has(file.toLowerCase()))file=base+'_'+n+++extension;names.add(file.toLowerCase());const path='references/'+file;entries[path]=dataBytes(source.data);paths.set(source.id,path);}
 entries[name+'.dxf']=strToU8(toModernDxf(shapes,doc.layers,'mm',doc.blocks,sources,paths));
 const report=['JLGCAD — Dossier de transmission',`Dessin : ${doc.name}`,'Extraire tout le ZIP dans un dossier puis ouvrir le DXF.','DXF : R2010 avec références ; unités : millimètres.','Les présentations ne sont pas exportées en DXF.','Les sources masquées ou déchargées restent incluses.',...sources.map(s=>`${paths.get(s.id)} — ${s.loaded?'chargée':'déchargée'}`),'','Compatibilité : le cadre est un réglage global AutoCAD ; les réglages individuels JLGCAD peuvent différer.','Les sous-jacents PDF restent des PDF ; aucune conversion en image.','Les pages PDF pivotées ou recadrées doivent être vérifiées dans le logiciel destinataire.'];
 entries['transmission.txt']=strToU8(report.join('\r\n'));
 return{name:name+'.zip',bytes:zipSync(entries,{level:6}),entries};
}
