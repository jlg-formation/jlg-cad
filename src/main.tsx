import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MousePointer2, Minus, Square, Circle, Hand, Magnet, Grid2X2, Undo2, Redo2, FolderOpen, Download, Save, Trash2, Maximize, Plus, Layers, Type, PanelsTopLeft, FileText } from 'lucide-react';
import { documentOf, parseDrawing, toDxf, bounds, modelToPaper, paperToModel, paperSize, newLayout, fitViewport, type Drawing, type Layout, type Point, type Shape, type PaperItem, type Viewport } from './model';
import './style.css';
import './paper.css';

type Tool = Shape['type'] | 'select' | 'pan' | 'text' | 'viewport';
type View = {x:number;y:number;scale:number};
type Gesture = { start:Point; screen:Point; original?:PaperItem; pan?:View; viewport?:Viewport; resize?:boolean };
const labels = { select:'Sélection', line:'Ligne', rect:'Rectangle', circle:'Cercle', pan:'Déplacement', text:'Texte', viewport:'Fenêtre de vue' };
const demo: Shape[] = [ {id:'demo1',type:'rect',a:{x:180,y:140},b:{x:620,y:430},color:'#b5ddd6'}, {id:'demo2',type:'rect',a:{x:200,y:160},b:{x:600,y:410},color:'#b5ddd6'}, {id:'demo3',type:'line',a:{x:440,y:160},b:{x:440,y:410},color:'#b5ddd6'}, {id:'demo4',type:'line',a:{x:200,y:300},b:{x:440,y:300},color:'#b5ddd6'}, {id:'demo5',type:'circle',a:{x:520,y:285},b:{x:565,y:285},color:'#e6b776'} ];
function load(){try{return parseDrawing(localStorage.getItem('jlg-cad')||'');}catch{return documentOf('Plan d’atelier',demo);}}
const id=()=>crypto.randomUUID();
const translate=(item:PaperItem,dx:number,dy:number):PaperItem=>({...item,a:{x:item.a.x+dx,y:item.a.y+dy},b:{x:item.b.x+dx,y:item.b.y+dy}});

function App() {
 const [doc,setDoc]=useState<Drawing>(load),[layoutId,setLayoutId]=useState<string|null>(null),[viewportId,setViewportId]=useState<string|null>(null);
 const [tool,setTool]=useState<Tool>('select'),[selected,setSelected]=useState<string|null>(null),[draft,setDraft]=useState<PaperItem|null>(null),[snap,setSnap]=useState(true),[grid,setGrid]=useState(true),[color,setColor]=useState('#b5ddd6'),[view,setView]=useState<View>({x:60,y:35,scale:1}),[cursor,setCursor]=useState<Point>({x:0,y:0}),[message,setMessage]=useState('Prêt à dessiner'),[past,setPast]=useState<Drawing[]>([]),[future,setFuture]=useState<Drawing[]>([]);
 const svg=useRef<SVGSVGElement>(null),input=useRef<HTMLInputElement>(null),gesture=useRef<Gesture|null>(null),draftRef=useRef<PaperItem|null>(null);
 const layout=doc.layouts.find(l=>l.id===layoutId);
 const viewport=layout?.items.find((s):s is Viewport=>s.type==='viewport'&&s.id===viewportId);
 const paper=!!layout&&!viewport;
 const items:PaperItem[]=paper?layout!.items:doc.shapes;
 const active=items.find(s=>s.id===selected);
 const setPreview=(s:PaperItem|null)=>{draftRef.current=s;setDraft(s);};
 const commit=(next:Drawing)=>{setPast(p=>[...p.slice(-99),doc]);setFuture([]);setDoc(next);};
 const clear=()=>{setSelected(null);setPreview(null);gesture.current=null;};
 const updateLayout=(patch:Partial<Layout>)=>{if(layout)commit({...doc,layouts:doc.layouts.map(l=>l.id===layout.id?{...l,...patch}:l)});};
 const put=(next:PaperItem[])=>{if(paper)updateLayout({items:next});else commit({...doc,shapes:next as Shape[]});};
 const edit=(s:PaperItem)=>put(items.map(i=>i.id===s.id?s:i));
 const editViewport=(s:Viewport)=>{if(layout)updateLayout({items:layout.items.map(i=>i.id===s.id?s:i)});};
 const remove=()=>{if(selected){put(items.filter(s=>s.id!==selected));setSelected(null);}};
 const undo=()=>{if(past.length){setFuture(f=>[doc,...f]);setDoc(past[past.length-1]);setPast(p=>p.slice(0,-1));clear();}};
 const redo=()=>{if(future.length){setPast(p=>[...p,doc]);setDoc(future[0]);setFuture(f=>f.slice(1));clear();}};
 useEffect(()=>{try{localStorage.setItem('jlg-cad',JSON.stringify(doc));}catch{setMessage('Stockage local indisponible : sauvegardez un fichier.');}},[doc]);
 useEffect(()=>{if(layoutId&&!doc.layouts.some(l=>l.id===layoutId)){setLayoutId(null);setViewportId(null);}if(viewportId&&!viewport)setViewportId(null);},[doc,layoutId,viewportId,viewport]);
 const download=(text:string,extension:string)=>{const url=URL.createObjectURL(new Blob([text],{type:'application/octet-stream'}));const a=document.createElement('a');a.href=url;a.download=(doc.name.replace(/[\\/:*?"<>|]/g,'_')||'dessin')+extension;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('Fichier téléchargé');};
 const pdf=async(all=false)=>{try{const {createPdf}=await import('./pdf');createPdf(doc,all?doc.layouts:layout?[layout]:[]).save(`${doc.name.replace(/[\\/:*?"<>|]/g,'_') || 'dessin'}${all?'':' - '+layout!.name}.pdf`);setMessage('PDF exporté — imprimer à 100 % pour respecter les échelles');}catch(err){setMessage(err instanceof Error?err.message:'Export impossible');}};
 const switchSpace=(l:string|null)=>{clear();setViewportId(null);setTool('select');setLayoutId(l);setColor(l?'#17242a':'#b5ddd6');if(!l)setView({x:60,y:35,scale:1});};
 const fit=()=>{
   if(!svg.current)return;let minX=0,minY=0,maxX=800,maxY=550;
   if(layout){const size=paperSize(layout);maxX=size.x;maxY=size.y;}
   else if(doc.shapes.length){const boxes=doc.shapes.map(bounds);minX=Math.min(...boxes.map(r=>r.x));minY=Math.min(...boxes.map(r=>r.y));maxX=Math.max(...boxes.map(r=>r.x+r.width));maxY=Math.max(...boxes.map(r=>r.y+r.height));}
   const r=svg.current.getBoundingClientRect(),scale=Math.max(.02,Math.min(10,(r.width-100)/Math.max(1,maxX-minX),(r.height-110)/Math.max(1,maxY-minY)));
   setView({scale,x:r.width/2-(minX+maxX)/2*scale,y:r.height/2-(minY+maxY)/2*scale});
 };
 useEffect(()=>{if(layout)fit();},[layoutId,layout?.format,layout?.orientation]);
 const chooseTool=(t:Tool)=>{setTool(t);setPreview(null);gesture.current=null;};
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.target as HTMLElement).matches('input,textarea,select'))return;
   if(e.key==='Escape'){clear();setViewportId(null);setTool('select');}
   if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();remove();}
   if(e.ctrlKey||e.metaKey){if(e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();}if(e.key.toLowerCase()==='s'){e.preventDefault();download(JSON.stringify(doc,null,2),'.jlgcad');}}
   else {const t:Record<string,Tool>={v:'select',l:'line',r:'rect',c:'circle',h:'pan',t:'text',f:'viewport'};if(t[e.key.toLowerCase()]&&(paper||!['text','viewport'].includes(t[e.key.toLowerCase()])))chooseTool(t[e.key.toLowerCase()]);}
 };window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);});
 const screen=(e:{clientX:number;clientY:number})=>{const r=svg.current!.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};};
 const sheetPoint=(p:Point)=>({x:(p.x-view.x)/view.scale,y:(p.y-view.y)/view.scale});
 const world=(p:Point,magnet=true)=>{const p0=sheetPoint(p),w=viewport?paperToModel(p0,viewport):p0,step=paper?1:10;return snap&&magnet?{x:Math.round(w.x/step)*step,y:Math.round(w.y/step)*step}:w;};
 const inViewport=(p:Point)=>{if(!viewport)return true;const r=bounds(viewport),w=sheetPoint(p);return w.x>=r.x&&w.x<=r.x+r.width&&w.y>=r.y&&w.y<=r.y+r.height;};
 const down=(e:React.PointerEvent<SVGSVGElement>)=>{
   if(e.button!==0&&e.button!==1)return;const p=screen(e),w=world(p);if(viewport&&!inViewport(p))return;
   svg.current!.setPointerCapture(e.pointerId);
   if(tool==='pan'||e.button===1){if(viewport){if(viewport.locked){setMessage('Fenêtre verrouillée : déverrouillez son cadrage dans les propriétés.');return;}gesture.current={start:w,screen:p,viewport};}else gesture.current={start:w,screen:p,pan:view};return;}
   const target=e.target as Element;
   if(tool==='select'){const itemId=target.closest('[data-id]')?.getAttribute('data-id')||null;setSelected(itemId);const original=items.find(s=>s.id===itemId);gesture.current=original?{start:w,screen:p,original,resize:target.hasAttribute('data-resize')}:null;return;}
   if(paper&&tool==='text'){const text:PaperItem={id:id(),type:'text',a:w,b:w,color,text:'Texte',height:3};put([...items,text]);setSelected(text.id);setTool('select');return;}
   if(tool==='text'||(!paper&&tool==='viewport'))return;
   const next:PaperItem=tool==='viewport'?{id:id(),type:'viewport',a:w,b:w,color:'#17242a',center:{x:400,y:285},denominator:10,locked:false,printBorder:false}:{id:id(),type:tool,a:w,b:w,color};
   setPreview(next);gesture.current={start:w,screen:p};
 };
 const move=(e:React.PointerEvent<SVGSVGElement>)=>{
   const p=screen(e),w=world(p);setCursor(w);const g=gesture.current;if(!g)return;
   if(g.pan)setView({...g.pan,x:g.pan.x+p.x-g.screen.x,y:g.pan.y+p.y-g.screen.y});
   else if(g.viewport)setPreview({...g.viewport,center:{x:g.viewport.center.x-(p.x-g.screen.x)/view.scale*g.viewport.denominator,y:g.viewport.center.y-(p.y-g.screen.y)/view.scale*g.viewport.denominator}});
   else if(g.original){setPreview(g.resize?{...g.original,b:w}:translate(g.original,w.x-g.start.x,w.y-g.start.y));}
   else if(draftRef.current)setPreview({...draftRef.current,b:w});
 };
 const up=()=>{
   const s=draftRef.current,g=gesture.current;
   if(s&&g?.viewport&&s.type==='viewport')editViewport(s);
   else if(s&&(s.type==='text'||Math.hypot(s.b.x-s.a.x,s.b.y-s.a.y)>.01)&&(s.type!=='viewport'||(bounds(s).width>=1&&bounds(s).height>=1))){put(g?.original?items.map(i=>i.id===s.id?s:i):[...items,s.type==='viewport'?fitViewport(s,doc.shapes):s]);setSelected(s.id);}
   setPreview(null);gesture.current=null;
 };
 const wheel=(e:React.WheelEvent)=>{
   if(gesture.current)return;const p=screen(e);
   if(viewport){if(!inViewport(p)||viewport.locked)return;const old=paperToModel(sheetPoint(p),viewport),denominator=Math.max(.01,Math.min(10000,viewport.denominator*Math.exp(e.deltaY*.001))),r=bounds(viewport),s=sheetPoint(p);editViewport({...viewport,denominator,center:{x:old.x-(s.x-r.x-r.width/2)*denominator,y:old.y-(s.y-r.y-r.height/2)*denominator}});}
   else {const w=sheetPoint(p),scale=Math.max(.02,Math.min(30,view.scale*Math.exp(-e.deltaY*.001)));setView({scale,x:p.x-w.x*scale,y:p.y-w.y*scale});}
 };
 const doubleClick=(e:React.MouseEvent)=>{
   if(!layout)return;
   const p=sheetPoint(screen(e));
   const vpId=(e.target as Element).closest('[data-viewport]')?.getAttribute('data-viewport') || [...layout.items].reverse().find(s=>{if(s.type!=='viewport')return false;const r=bounds(s);return p.x>=r.x&&p.x<=r.x+r.width&&p.y>=r.y&&p.y<=r.y+r.height;})?.id;
   clear();setTool('select');setViewportId(vpId||null);setMessage(vpId?'Objet dans la fenêtre — double-clic hors du cadre pour revenir au papier':'Espace papier');
 };
 const geometry=(s:PaperItem,options:{model?:boolean;preview?:boolean;displayColor?:string;inert?:boolean}={})=>{
   const chosen=selected===s.id&&(!layout||paper||options.model);
   const common={'data-id':(!layout||paper||viewport&&options.model)?s.id:undefined,stroke:options.preview?'#d49a41':chosen?'#299b88':options.displayColor||s.color,strokeWidth:layout?.25:1.4,vectorEffect:layout?undefined:'non-scaling-stroke' as const,fill:'none',style:{pointerEvents:options.preview||options.inert?'none' as const:'stroke' as const}};
   if(s.type==='text')return <text key={s.id} data-id={s.id} x={s.a.x} y={s.a.y} fill={chosen?'#299b88':options.displayColor||s.color} fontSize={s.height} fontFamily="Arial, sans-serif" dominantBaseline="text-before-edge" style={{pointerEvents:options.inert?'none':'all'}}>{s.text.split('\n').map((line,i)=><tspan key={i} x={s.a.x} dy={i?`${s.height*1.2}`:0}>{line||' '}</tspan>)}</text>;
   if(s.type==='viewport')return null;
   const r=bounds(s);
   const element=s.type==='line'?<line {...common} x1={s.a.x} y1={s.a.y} x2={s.b.x} y2={s.b.y}/>:s.type==='rect'?<rect {...common} x={r.x} y={r.y} width={r.width} height={r.height}/>:<circle {...common} cx={s.a.x} cy={s.a.y} r={r.width/2}/>;
   return <g key={s.id}>{element}{!options.preview&&!options.inert&&React.cloneElement(element,{stroke:'transparent',strokeWidth:7/view.scale,vectorEffect:undefined})}</g>;
 };
 const modelShapes=doc.shapes.filter(s=>s.id!==(viewport||!layout?draft?.id:null));
 const renderViewport=(original:Viewport)=>{
   const v=draft?.type==='viewport'&&draft.id===original.id?draft:original,r=bounds(v),isActive=viewportId===v.id;
   const origin=modelToPaper({x:0,y:0},v),step=10*2**Math.ceil(Math.log2(Math.max(.01,v.denominator)/2));
   return <g key={v.id} data-viewport={v.id}><defs><pattern id={`grid-${v.id}`} width={step/v.denominator} height={step/v.denominator} patternUnits="userSpaceOnUse" x={origin.x} y={origin.y}><circle r=".18" fill="#bdc9c2"/></pattern><clipPath id={`clip-${v.id}`}><rect x={r.x} y={r.y} width={r.width} height={r.height}/></clipPath></defs><g clipPath={`url(#clip-${v.id})`}><rect data-id={paper?v.id:undefined} x={r.x} y={r.y} width={r.width} height={r.height} fill="transparent"/>{isActive&&grid&&<rect x={r.x} y={r.y} width={r.width} height={r.height} fill={`url(#grid-${v.id})`} pointerEvents="none"/>}
   {modelShapes.map(s=>geometry({...s,a:modelToPaper(s.a,v),b:modelToPaper(s.b,v)},{model:isActive,inert:!isActive,displayColor:layout!.monochrome?'#17242a':s.color}))}
   {isActive&&draft&&draft.type!=='viewport'&&geometry({...draft,a:modelToPaper(draft.a,v),b:modelToPaper(draft.b,v)},{model:true,preview:true})}</g>
   <rect data-id={paper?v.id:undefined} x={r.x} y={r.y} width={r.width} height={r.height} fill="none" stroke={isActive?'#299b88':selected===v.id?'#299b88':'#a3adb3'} strokeDasharray={v.printBorder?undefined:'2 1'} strokeWidth={isActive?.65:.3} style={{pointerEvents:'stroke'}}/>
   {paper&&selected===v.id&&<rect data-id={v.id} data-resize="true" x={v.b.x-1.5} y={v.b.y-1.5} width="3" height="3" fill="#299b88" style={{cursor:'nwse-resize'}}/>}</g>;
 };
 const numeric=(label:string,value:number,change:(value:number)=>void,min?:number,max?:number)=><label className="property-row">{label}<input aria-label={label} type="number" step="any" min={min} max={max} value={Number(value.toFixed(3))} onChange={e=>{if(!e.target.value)return;const v=Number(e.target.value);if(Number.isFinite(v)&&(min===undefined||v>=min)&&(max===undefined||v<=max))change(v);}}/></label>;
 const viewportProperties=(v:Viewport)=><><div className="section-label">FENÊTRE DE VUE</div>{numeric('Échelle 1 :',v.denominator,n=>editViewport({...v,denominator:n}),.01,10000)}<div className="scale-presets">{[1,2,5,10,20,50,100].map(n=><button key={n} onClick={()=>editViewport({...v,denominator:n})}>1:{n}</button>)}</div><label className="property-row">Verrouiller la vue<input type="checkbox" checked={v.locked} onChange={e=>editViewport({...v,locked:e.target.checked})}/></label><label className="property-row">Imprimer le cadre<input type="checkbox" checked={v.printBorder} onChange={e=>editViewport({...v,printBorder:e.target.checked})}/></label>{numeric('Centre X',v.center.x,n=>editViewport({...v,center:{...v.center,x:n}}))}{numeric('Centre Y',v.center.y,n=>editViewport({...v,center:{...v.center,y:n}}))}<button className="wide" disabled={v.locked} onClick={()=>editViewport(fitViewport(v,doc.shapes))}>Cadrer les objets</button><button className="wide" onClick={()=>{clear();setViewportId(viewportId?null:v.id);setTool(viewportId?'select':'pan');}}>{viewportId?'Revenir au papier':'Activer / cadrer la vue'}</button></>;
 const addLayout=()=>{const l=newLayout(id(),`Présentation ${doc.layouts.length+1}`);commit({...doc,layouts:[...doc.layouts,l]});switchSpace(l.id);};
 const cartouche=()=>{if(!layout)return;const size=paperSize(layout),x=size.x-110,y=size.y-35;updateLayout({items:[...layout.items,{id:id(),type:'rect',a:{x,y},b:{x:size.x-10,y:size.y-10},color:'#17242a'},{id:id(),type:'text',a:{x:x+4,y:y+4},b:{x:x+4,y:y+4},text:doc.name,height:4,color:'#17242a'},{id:id(),type:'text',a:{x:x+4,y:y+13},b:{x:x+4,y:y+13},text:`${layout.name} · ${new Date().toLocaleDateString('fr-FR')}`,height:2.5,color:'#17242a'}]});};
 const size=layout?paperSize(layout):null;
 return <div className="app"><header><div className="brand"><span className="brand-icon">J</span> JLG<span className="muted">CAD</span></div><div className="filename"><input aria-label="Nom du dessin" value={doc.name} onChange={e=>commit({...doc,name:e.target.value})}/><span>.jlgcad</span></div><button title="Nouveau projet" onClick={()=>{commit(documentOf('Sans titre',[]));switchSpace(null);}}><Plus size={16}/> Nouveau</button><button onClick={()=>input.current?.click()}><FolderOpen size={16}/> Ouvrir</button><button onClick={()=>download(JSON.stringify(doc,null,2),'.jlgcad')}><Save size={16}/> Sauvegarder</button><button onClick={()=>download(toDxf(doc.shapes),'.dxf')}><Download size={16}/> DXF</button><button disabled={!layout} className="primary" onClick={()=>pdf()}><FileText size={16}/> PDF</button></header>
 <input hidden type="file" ref={input} accept=".jlgcad,.json" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;try{commit(parseDrawing(await f.text()));switchSpace(null);setMessage('Projet ouvert');}catch(err){setMessage(err instanceof Error?err.message:'Ouverture impossible');}e.target.value='';}}/>
 <div className="workspace"><aside className="tools"><div className="section-label">DESSIN</div>{([[ 'select',MousePointer2,'V'],['line',Minus,'L'],['rect',Square,'R'],['circle',Circle,'C'],['pan',Hand,'H'],['text',Type,'T'],['viewport',PanelsTopLeft,'F']] as const).filter(([t])=>paper||!['text','viewport'].includes(t)).map(([t,Icon,key])=><button title={`${labels[t]} (${key})`} aria-label={labels[t]} key={t} className={tool===t?'active':''} onClick={()=>chooseTool(t)}><Icon size={21}/></button>)}<div className="divider"/><button aria-label="Annuler" disabled={!past.length} onClick={undo}><Undo2 size={20}/></button><button aria-label="Rétablir" disabled={!future.length} onClick={redo}><Redo2 size={20}/></button><button aria-label="Supprimer la sélection" disabled={!selected} onClick={remove}><Trash2 size={19}/></button><div className="tool-bottom">{paper?'PAPIER':'OBJET'}</div></aside>
 <main><div className="canvas-top"><span><span className="live-dot"/>{viewport?'OBJET DANS LA FENÊTRE':paper?'ESPACE PAPIER':'ESPACE OBJET'}</span><span>{layout?`${layout.format} · ${layout.orientation==='landscape'?'Paysage':'Portrait'}`:'Vue de dessus'} / Millimètres</span></div>
 <svg ref={svg} aria-label="Zone de dessin" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>{gesture.current=null;setPreview(null);}} onWheel={wheel} onDoubleClick={doubleClick} style={{cursor:tool==='pan'?'grab':tool==='select'?'default':'crosshair'}}><defs><pattern id="grid" width={(paper?10:20)*view.scale} height={(paper?10:20)*view.scale} patternUnits="userSpaceOnUse" x={view.x} y={view.y}><circle cx="0" cy="0" r=".8" fill="#39464e"/></pattern>{size&&<><pattern id="paper-grid" width="10" height="10" patternUnits="userSpaceOnUse"><circle r=".18" fill="#bdc9c2"/></pattern><clipPath id="sheet"><rect width={size.x} height={size.y}/></clipPath></>}</defs>{grid&&!layout&&<rect width="100%" height="100%" fill="url(#grid)"/>}
 <g transform={`translate(${view.x},${view.y}) scale(${view.scale})`}>{size?<><rect className="paper-sheet" width={size.x} height={size.y} fill="#fffdf8"/>{grid&&paper&&<rect width={size.x} height={size.y} fill="url(#paper-grid)" pointerEvents="none"/>}<rect x="5" y="5" width={size.x-10} height={size.y-10} fill="none" stroke="#dce0dc" strokeDasharray="1 1" strokeWidth=".2" pointerEvents="none"/><g clipPath="url(#sheet)">{layout!.items.filter(s=>s.type==='viewport').map(s=>renderViewport(s as Viewport))}{layout!.items.filter(s=>s.type!=='viewport'&&s.id!==draft?.id).map(s=>geometry(s,{inert:!!viewport,displayColor:layout!.monochrome?'#17242a':s.color}))}{paper&&draft&&(draft.type!=='viewport'||!layout!.items.some(s=>s.id===draft.id))&&(draft.type==='viewport'?renderViewport(draft):geometry(draft,{preview:true}))}</g></>:<><path d="M -20 0 H 30 M 0 -30 V 20" stroke="#657680" strokeWidth="1" vectorEffect="non-scaling-stroke"/>{modelShapes.map(s=>geometry(s))}{draft&&geometry(draft,{preview:true})}</>}</g></svg>
 <div className="canvas-help">{viewport?'Objet partagé · H : cadrer · Échap : papier':paper?'Double-clic dans une fenêtre : objet · Texte et formes en mm papier':tool==='select'?'Sélectionnez et déplacez une forme':'Glissez pour tracer · Échap pour quitter'}</div><div className="zoom"><button aria-label="Dézoomer" onClick={()=>setView(v=>({...v,scale:Math.max(.02,v.scale/1.2)}))}><Minus size={15}/></button><span>{Math.round(view.scale*100)}%</span><button aria-label="Zoomer" onClick={()=>setView(v=>({...v,scale:Math.min(30,v.scale*1.2)}))}><Plus size={15}/></button><button aria-label="Cadrer le dessin" onClick={fit}><Maximize size={16}/></button></div></main>
 <aside className="properties"><div className="panel-heading">Propriétés <span>↗</span></div><div className="section-label">OUTIL ACTIF</div><h2>{labels[tool]}</h2><p>{tool==='viewport'?'Glissez sur la feuille pour créer une fenêtre sur le dessin.':tool==='text'?'Cliquez sur la feuille puis modifiez le texte ci-dessous.':viewport?'Vous éditez le dessin partagé. Verrouiller la vue protège son cadrage.':'Sélectionnez un objet pour modifier ses propriétés.'}</p>
 {layout&&!active&&!viewport&&<><div className="section-label">PRÉSENTATION</div><input className="wide-input" aria-label="Nom de présentation" value={layout.name} onChange={e=>updateLayout({name:e.target.value})}/><label className="property-row">Format<select aria-label="Format papier" value={layout.format} onChange={e=>updateLayout({format:e.target.value as Layout['format']})}><option>A4</option><option>A3</option></select></label><label className="property-row">Orientation<select aria-label="Orientation" value={layout.orientation} onChange={e=>updateLayout({orientation:e.target.value as Layout['orientation']})}><option value="landscape">Paysage</option><option value="portrait">Portrait</option></select></label><label className="property-row">Noir et blanc<input type="checkbox" checked={layout.monochrome} onChange={e=>updateLayout({monochrome:e.target.checked})}/></label><button className="wide" onClick={cartouche}>Ajouter un cartouche</button><button className="wide" onClick={()=>pdf(true)}>PDF de toutes les présentations</button><button className="delete wide" onClick={()=>{commit({...doc,layouts:doc.layouts.filter(l=>l.id!==layout.id)});switchSpace(null);}}>Supprimer la présentation</button></>}
 <div className="section-label">APPARENCE</div><label className="property-row">Couleur<input aria-label="Couleur" type="color" value={active?.color||color} onChange={e=>{setColor(e.target.value);if(active)edit({...active,color:e.target.value});}}/></label>
 {active&&<><div className="section-label">{labels[active.type].toUpperCase()}</div>{numeric('Position X',active.a.x,n=>edit(translate(active,n-active.a.x,0)))}{numeric('Position Y',active.a.y,n=>edit(translate(active,0,n-active.a.y)))}
 {active.type==='text'?<><label className="text-label">Contenu<textarea aria-label="Texte" value={active.text} onChange={e=>edit({...active,text:e.target.value})}/></label>{numeric('Hauteur (mm)',active.height,n=>edit({...active,height:n}),.5,100)}</>:active.type==='circle'?numeric('Rayon',bounds(active).width/2,n=>edit({...active,b:{x:active.a.x+n,y:active.a.y}}),.01):<>{numeric('Largeur',Math.abs(active.b.x-active.a.x),n=>edit({...active,b:{...active.b,x:active.a.x+n}}),active.type==='viewport'?1:0)}{numeric('Hauteur',Math.abs(active.b.y-active.a.y),n=>edit({...active,b:{...active.b,y:active.a.y+n}}),active.type==='viewport'?1:0)}</>}
 {active.type==='viewport'&&viewportProperties(active)}<button className="delete" onClick={remove}><Trash2 size={14}/> Supprimer l’objet</button></>}
 {viewport&&viewportProperties(viewport)}
 <div className="section-label">AIDES AU DESSIN</div><button className={`toggle ${grid?'enabled':''}`} onClick={()=>setGrid(!grid)}><Grid2X2 size={16}/> Grille <span>{grid?'ON':'OFF'}</span></button><button className={`toggle ${snap?'enabled':''}`} onClick={()=>setSnap(!snap)}><Magnet size={16}/> Aimantation <span>{snap?`${paper?1:10} mm`:'OFF'}</span></button>
 <div className="objects"><div className="panel-heading"><span><Layers size={15}/> {paper?'Objets papier':'Objets du dessin'}</span><span>{items.length}</span></div><div className="object-list">{items.length===0?<p>{paper?'Feuille vide : ajoutez du texte, des formes ou des fenêtres.':'Aucun objet.'}</p>:items.map((s,i)=><button key={s.id} className={selected===s.id?'chosen':''} onClick={()=>{setSelected(s.id);chooseTool('select');}}><span style={{color:s.color}}>{s.type==='text'?'T':s.type==='viewport'?'▣':s.type==='circle'?'○':s.type==='rect'?'□':'╱'}</span>{labels[s.type]}<small>{String(i+1).padStart(2,'0')}</small></button>)}</div></div></aside></div>
 <nav className="layout-tabs" aria-label="Espaces du projet"><button className={!layout?'current':''} onClick={()=>switchSpace(null)}>Objet</button>{doc.layouts.map(l=><button key={l.id} className={layout?.id===l.id?'current':''} onClick={()=>switchSpace(l.id)}>{l.name}</button>)}<button aria-label="Ajouter une présentation" title="Ajouter une présentation" onClick={addLayout}><Plus size={16}/> Présentation</button>{viewport&&<button className="return-paper" onClick={()=>{clear();setViewportId(null);setTool('select');}}>Revenir au papier</button>}</nav>
 <footer><span><span className="live-dot"/> {message}</span><span className="coordinates">X {cursor.x.toFixed(1)} / Y {(paper?cursor.y:-cursor.y).toFixed(1)} mm</span><span>{paper?'PAPIER':viewport?'OBJET · FENÊTRE':'OBJET'}</span></footer></div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
