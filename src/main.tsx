import {LayerManager,LayerTools,ObjectAppearance} from './layers-ui';
import {appearance,linePatterns,onLayer} from './layers';
import {dimensionLine} from './dimension-alignment';
import {useDimensionAlignment,DimensionAlignmentGuide} from './dimension-alignment-ui';
import {ReferenceMenu} from './reference-menu';
import {beginScaleReference,scaleOption,scaleReferencePoint,scaleReferenceInput,scaleReferencePreview,scaleReferencePrompt,type ScaleReferenceSession,type ScaleReferenceResult} from './scale-reference';
import {ScaleEntry,ScaleReferenceGuide} from './scale-reference-ui';
import {useReferences} from './reference-ui';
import {ReferenceGraphic} from './reference-graphic';
import {orderDrawing,referenceDisplayed,referenceSource,referenceSnap} from './references';
import {BlockDialog,CloseBlockDialog,BlockMenu} from './blocks-ui';
import {blockCommands,blockName,createBlock,insertBlock,explodeBlocks,redefineBlock} from './blocks';
import {AngularReferenceHighlight} from './angular-reference-highlight';
import {isPaperDimensionTool,dimensionViewport,paperDimensionClick as advancePaperDimension,paperDimensionPreview,paperDimensionSnap,updatePaperDimensionPlacement,type PaperDimensionSession} from './paper-dimensions';
import {isSpecializedDimension,circularDefinition,makeDimension,directedLinearDimension,lineAngleDefinition} from './dimension-kinds';
import {scaleSelection,scaleFactor} from './scale';
import {MeasurementResult} from './measurement-result';
import {ToolHelp,ToolHeading,SidebarSection} from './right-side-bar';
import {toolShortcut} from './tool-tooltip';
import {isRepeatKey,repeatKeys,repeatableHistory} from './repeat-command';
import {isTrimDrag,clipTrimEdge} from './trim-gesture';
import {commandName,useCommandLanguage,setCommandLanguage} from './command-language';
import {t,useLanguage,setLanguage,type Language} from './i18n';
import {ContextMenu,type ContextItem} from './context-menu';
import {applyHatchRegions,initialHatchSelection} from './hatch-session';
import {analyzeBoundaries,pickRegion,selectedRegions,createHatch,defaultHatchStyle,hatchStyleOf,boundaryShape,hatchLines,islandLoops,detachHatch,type BoundaryAnalysis} from './hatch';
import {HatchPanel,HatchFields,HatchGraphic} from './hatch-ui';
import {paletteSuggestions,resolvePaletteCommand,rememberCommand,groupPaletteCommands} from './command-palette';
import {readGrid,gridSnap,displayedGrid,GRID_MAJOR_INTERVALS,type GridSettings} from './grid';
import {GridPattern,GridConfiguration,GridDimension} from './grid-ui';
import {cursorMode} from './cursor';
import {StatusPrecision,objectSnapKinds} from './status-precision';
import {synchronizeDrawing,detachDimension} from './associations';
import React, { useEffect, useRef, useState, useId, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import {CloseIcon, ChevronLeftIcon as ChevronLeft, ChevronRightIcon as ChevronRight, MinusIcon as Minus, FolderIcon as FolderOpen, DownloadIcon as Download, DeleteIcon as Trash2, FitViewIcon as Maximize, AddIcon as Plus, FileIcon as FileText, SettingsIcon as SettingsIcon} from './cad-icons';
import { documentOf, toDxf, bounds,textLineOffset, modelToPaper, paperToModel, paperSize, newLayout, nextLayoutName, layoutDisplayName, fitViewport, visibleShapes, lockedShape, type Drawing, type Layout, type Point, type Shape, type PaperItem, type Viewport, type Node, type PathShape, type HatchStyle, type HatchShape, type HatchRegion } from './model';
import { ArchitectureToolbar, CommandPanel, PathEditor, LineEditor, ArcEditor, UnitInput, labels, initialSettings, commandTools, type Tool } from './architecture';
import { segments, threePointArc, parseLength as parseDistance, parseAngle, distance, sub, dot, cross, add, mul, constrainedEnd, snapPoint, nearestPart, trimShape, trimSweep, type TrimSweepResult, extendShape, offsetShape, joinCorner, translateItem, mirrorShape, svgPath, mapItem, moveNode, smoothNodes, diameterDimension, linearDimension, dimensionGeometry, type Snap } from './geometry';
import {rectangleEndpoint,relativeRectangleEndpoint,closedPolylineNodes,readUnit,unitFactor,displayDistance,lengthInMillimeters,exactEndpoint,translationEndpoint,lineEndpoint,radiusEndpoint,dynamicFieldPosition,type LengthUnit} from './drafting';
import {UnitContext} from './units';
import {objectGrips,moveGrip,gripLengthOrigin,gripLengthFactor} from './grips';
import {initialModelView} from './view';
import {zoomAt,fitBoxes,rememberView,windowBox,type NavigationView} from './navigation';
import {parseDrawingFile} from './workspace';
import {decodeDxf,inspectDxf,importDxf} from './dxf-import';
import {DxfImportDialog} from './dxf-import-ui';
import {loadTabDocumentState,blankTabDocument,saveTabDocument} from './tab-document';
import {rotationAngle,rotateSelection} from './rotation';
import {importBlockDefinitions,moveSelectionObjects,copySelection,selectedCopyIds,encodeClipboard,decodeClipboard,pasteClipboard,type CadClipboard} from './clipboard';
import {readSelectionPreferences,selectionStorageKey,rectangleSelection,startSelection,moveSelection,releaseSelection,combineSelection,type SelectionDrag,validLasso,itemInSelection,selectionSegments,type SelectionPreferences} from './selection';
import {documentChanged,documentLabel,nativeFileName} from './document-title';
import {completedPath,constructedItem} from './tool-completion';
import {continueLine,lineClosingPoint,type Line} from './line-session';
import {joinDrawing,joinEligible} from './join';
import './style.css';
import './paper.css';
import { Menus, ReplaceDrawingDialog, SaveDrawingDialog } from './menus';
import { chord, readBindings, storageKey, statusTooltip, type Bindings } from './shortcuts';

type View = {x:number;y:number;scale:number};

type Gesture = { start:Point; screen:Point; original?:PaperItem; pan?:View; viewport?:Viewport; resize?:boolean; grip?:string; node?:number; handle?:'point'|'in'|'out' };
function load(){try{const navigation=performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined;return loadTabDocumentState(sessionStorage,navigation?.type||'navigate');}catch{return blankTabDocument();}}
const id=()=>crypto.randomUUID();
const translate=translateItem;

function App() {
 const language=useLanguage();
 const commandLanguage=useCommandLanguage();
 const [initialDocument]=useState(load);
 const [fileName,setFileName]=useState<string|null>(initialDocument.fileName),[saved,setSaved]=useState<Drawing|null>(initialDocument.saved);
 const [bindings,setBindings]=useState<Bindings>(()=>{try{return readBindings(localStorage.getItem(storageKey));}catch{return readBindings(null);}});
 const [dxfFile,setDxfFile]=useState<{text:string;name:string}|null>(null);
 const [saveRequested,setSaveRequested]=useState(false),[replacement,setReplacement]=useState<{drawing:Drawing;fileName:string|null}|null>(null);
 const scope=useId();
 const shortcut=(id:string)=>id==='polyline'?'PL ↵':id==='line'?'L ↵':bindings[id]?.map(k=>/^[A-Z]+$/.test(k)?k+' ↵':k).join(' / ')||'';
 const title=(id:string,label:string)=>label+(shortcut(id)?' — '+shortcut(id):'');
 const changeBindings=(next:Bindings)=>{setBindings(next);try{localStorage.setItem(storageKey,JSON.stringify(next));}catch{setMessage('Préférences non enregistrées : stockage local indisponible.');}};
 const [paperDimensionSession,setPaperDimensionSession]=useState<PaperDimensionSession|null>(null),[paperDimensionText,setPaperDimensionText]=useState('3 mm');
 const [doc,setDoc]=useState<Drawing>(initialDocument.drawing),[layoutId,setLayoutId]=useState<string|null>(null),[viewportId,setViewportId]=useState<string|null>(null);
 const [lastBlockDefinitionId,setLastBlockDefinitionId]=useState<string|undefined>();
 const [lastBlockCommand,setLastBlockCommand]=useState<string|null>(null);
 const [blockDialog,setBlockDialog]=useState<'block'|'insert'|'bedit'|null>(null),[blockClose,setBlockClose]=useState(false);
 const [blockFlow,setBlockFlow]=useState<{kind:'select';action:'block'|'explode'|'bedit'}|{kind:'base';name:string;ids:string[];replace:boolean}|{kind:'insert';definitionId:string;scale:number;angle:number}|null>(null);
 const [blockEditor,setBlockEditor]=useState<{drawing:Drawing;definitionId:string;past:Drawing[];future:Drawing[];view:View;layer:string}|null>(null);
 const currentDoc=useRef(doc);currentDoc.current=doc;
 const [tool,setTool]=useState<Tool>('select'),[selected,selectSingle]=useState<string|null>(null),[draft,setDraft]=useState<PaperItem|null>(null),[color,setColor]=useState('#b5ddd6'),[view,setView]=useState<View>(initialModelView(1000,700)),[cursor,setCursor]=useState<Point>({x:0,y:0}),[message,setMessage]=useState('Prêt à dessiner'),[past,setPast]=useState<Drawing[]>([]),[future,setFuture]=useState<Drawing[]>([]);
 const [rectWidth,setRectWidth]=useState(''),[rectHeight,setRectHeight]=useState('');
 const [osnapKinds,setOsnapKinds]=useState<Snap['kind'][]>(objectSnapKinds);
 const rectWidthInput=useRef<HTMLInputElement>(null);
 const rotationInput=useRef<HTMLInputElement>(null);
 const radiusInput=useRef<HTMLInputElement>(null),lengthInput=useRef<HTMLInputElement>(null);
 const [radiusEditor,setRadiusEditor]=useState<{id:string;point:Point;text:string;unit:LengthUnit}|null>(null);
 useEffect(()=>{if(!radiusEditor)return;const frame=requestAnimationFrame(()=>{radiusInput.current?.focus();radiusInput.current?.select();});return()=>cancelAnimationFrame(frame);},[radiusEditor?.id,radiusEditor?.point.x,radiusEditor?.point.y]);
 const [scaleReference,setScaleReference]=useState<ScaleReferenceSession|null>(null);
 const lastScaleLengths=useRef<{reference?:number;target?:number}>({});
 const [quickSavePending,setQuickSavePending]=useState(false);
 useEffect(()=>{if(quickSavePending){const name=fileName?fileName.replace(/\.(jlgcad|jlcad|json)$/i,''):doc.name;download(JSON.stringify(doc,null,2),'.jlgcad',name);setFileName(nativeFileName(name));setSaved(doc);setQuickSavePending(false);}},[quickSavePending,doc]);
 const [selectedIds,setSelectedIds]=useState<string[]>([]);
 const [joinPhase,setJoinPhase]=useState<'initial'|'targets'>('initial'),[joinSourceId,setJoinSourceId]=useState<string|null>(null);
 const [selectionPreferences,setSelectionPreferences]=useState<SelectionPreferences>(()=>{try{return readSelectionPreferences(localStorage.getItem(selectionStorageKey));}catch{return readSelectionPreferences(null);}});
 const selectionDrag=useRef<SelectionDrag|null>(null);
 const [selectionOutline,setSelectionOutline]=useState<Point[]>([]);
 const updateSelectionPreferences=(patch:Partial<SelectionPreferences>)=>{const next={...selectionPreferences,...patch};setSelectionPreferences(next);try{localStorage.setItem(selectionStorageKey,JSON.stringify({...next,version:2}));}catch{setMessage('Préférences de sélection non enregistrées.');}};
 const [pendingPaste,setPendingPaste]=useState<CadClipboard|null>(null);
 const [pendingCopyBase,setPendingCopyBase]=useState<{drawing:Drawing;shapes:Shape[]}|null>(null);
 const setSelected=(value:string|null)=>{selectSingle(value);setSelectedIds([]);};
 const [hatchStyle,setHatchStyle]=useState<HatchStyle>(defaultHatchStyle),[hatchMode,setHatchMode]=useState<'pick'|'objects'>('pick'),[hatchSeparate,setHatchSeparate]=useState(true),[hatchObjectIds,setHatchObjectIds]=useState<string[]>([]),[hatchSessionIds,setHatchSessionIds]=useState<string[]>([]),[hatchRedefineId,setHatchRedefineId]=useState<string|null>(null),[hatchOriginMode,setHatchOriginMode]=useState(false),[hatchOriginTarget,setHatchOriginTarget]=useState<string|null>(null),[hatchGaps,setHatchGaps]=useState<Point[]>([]);
 const [linearSelectObject,setLinearSelectObject]=useState(false);
 const [offsetReady,setOffsetReady]=useState(false),[offsetText,setOffsetText]=useState('');
 const offsetInput=useRef<HTMLInputElement>(null);
 useEffect(()=>{if(tool!=='offset'||offsetReady)return;const frame=requestAnimationFrame(()=>{offsetInput.current?.focus();offsetInput.current?.select();});return()=>cancelAnimationFrame(frame);},[tool,offsetReady]);
 const [dimensionLines,setDimensionLines]=useState<{id:string;segment:number;position:number}[]>([]);
 const [settings,setSettings]=useState(initialSettings),[currentLayer,setCurrentLayer]=useState('0'),[sourceId,setSourceId]=useState<string|null>(null),[commandPoints,setCommandPoints]=useState<Point[]>([]),[pathNodes,setPathNodes]=useState<Node[]>([]),[boundaryIds,setBoundaryIds]=useState<string[]>([]),[choosingBoundaries,setChoosingBoundaries]=useState(false),[commandPreview,setCommandPreview]=useState<Shape[]>([]),[snapHit,setSnapHit]=useState<Snap|null>(null),[nodeIndex,setNodeIndex]=useState(0),[measurement,setMeasurement]=useState('');
 const [unit,setUnit]=useState<LengthUnit>(()=>{try{return readUnit(localStorage.getItem('jlg-cad-unit'));}catch{return 'm';}}),[configuration,setConfiguration]=useState(false);
 const [layerManagerOpen,setLayerManagerOpen]=useState(false);
 const [propertiesOpen,setPropertiesOpen]=useState(()=>window.innerWidth>760);
 const toggleProperties=()=>setPropertiesOpen(open=>!open);
 const [sidebarError,setSidebarError]=useState('');
 const [measurementResult,setMeasurementResult]=useState('');
 const [measurementAnchor,setMeasurementAnchor]=useState<Point>({x:0,y:0});
 const reportError=(text:string)=>{setMessage(text);setSidebarError(text);};
 useEffect(()=>setSidebarError(''),[tool,sourceId,commandPoints.length,pathNodes.length,selected,selectedIds.length,hatchMode,hatchOriginMode,offsetReady,choosingBoundaries,draft?.type]);
 const [configurationPage,setConfigurationPage]=useState<'general'|'grid'|'selection'|'lang'>('general');
 const [contextPosition,setContextPosition]=useState<Point|null>(null);
 // Follow only the screen position while the menu is open; drawing gestures stay suspended.
 useEffect(()=>{
  if(!contextPosition)return;
  const track=(event:PointerEvent)=>{const canvas=svg.current;if(!canvas)return;const rect=canvas.getBoundingClientRect();setPointerScreen({x:event.clientX-rect.left,y:event.clientY-rect.top});setPointerInside(event.clientX>=rect.left&&event.clientX<rect.right&&event.clientY>=rect.top&&event.clientY<rect.bottom);};
  document.addEventListener('pointermove',track,true);
  document.addEventListener('pointerdown',track,true);
  return()=>{document.removeEventListener('pointermove',track,true);document.removeEventListener('pointerdown',track,true);};
 },[!!contextPosition]);
 const [toolHistory,setToolHistory]=useState<Tool[]>([]);
 const [recentCommands,setRecentCommands]=useState<string[]>([]);
 const [paletteOpen,setPaletteOpen]=useState(false);
 const [commandText,setCommandText]=useState(''),[commandIndex,setCommandIndex]=useState(0),[lengthText,setLengthText]=useState(''),[pointerScreen,setPointerScreen]=useState<Point>({x:0,y:0}),[pointerInside,setPointerInside]=useState(false);
 const parseLength=(text:string)=>parseDistance(text,paper?'mm':unit);
 useEffect(()=>{try{localStorage.setItem('jlg-cad-unit',unit);}catch{setMessage('Unité non enregistrée : stockage indisponible.');}},[unit]);
 const [shiftHeld,setShiftHeld]=useState(false);
 const effectiveOrtho=settings.ortho!==shiftHeld;
 const effectivePolar=settings.polarEnabled?settings.polarAngle:0;
 const [zoomMode,setZoomMode]=useState<'options'|'window'|'scale'|null>(null),[zoomStart,setZoomStart]=useState<Point|null>(null),[zoomPointer,setZoomPointer]=useState<Point|null>(null);
 const navigationPointer=useRef(false);
 const viewHistory=useRef<Record<string,NavigationView[]>>({}),wheelTime=useRef(0),middleClick=useRef<{time:number;point:Point}|null>(null);
 const pointerSnap=useRef(false),lastPointer=useRef<React.PointerEvent<SVGSVGElement>|null>(null);
 const constrain=(a:Point,b:Point,length='',angle='')=>constrainedEnd(a,b,lengthInMillimeters(length,paper?'mm':unit),angle,effectiveOrtho,effectiveOrtho?0:effectivePolar,pointerSnap.current);
 const toggleOsnap=()=>setSettings(s=>({...s,osnap:!s.osnap}));
 const togglePolar=()=>setSettings(s=>({...s,polarEnabled:!s.polarEnabled,ortho:s.polarEnabled?s.ortho:false}));
 const toggleOrtho=()=>setSettings(s=>({...s,ortho:!s.ortho,polarEnabled:false}));
 const commandAnchor=useRef<HTMLDivElement>(null);
 const [helpMaxWidth,setHelpMaxWidth]=useState(440);
 useEffect(()=>{const el=commandAnchor.current,canvas=svg.current;if(!el||!canvas)return;const measure=()=>setHelpMaxWidth(Math.max(80,Math.min(440,el.getBoundingClientRect().right-canvas.getBoundingClientRect().left-8)));const observer=new ResizeObserver(measure);observer.observe(el);observer.observe(el.parentElement!);measure();return()=>observer.disconnect();},[]);
 const layoutStrip=useRef<HTMLDivElement>(null);
 const [tabScroll,setTabScroll]=useState({left:false,right:false});
 const updateTabScroll=()=>{const el=layoutStrip.current;if(el)setTabScroll({left:el.scrollLeft>1,right:el.scrollLeft+el.clientWidth<el.scrollWidth-1});};
 const scrollTabs=(direction:number)=>layoutStrip.current?.scrollBy({left:direction*148,behavior:'smooth'});
 const svg=useRef<SVGSVGElement>(null),input=useRef<HTMLInputElement>(null),gesture=useRef<Gesture|null>(null),draftRef=useRef<PaperItem|null>(null);
 const lineSegments=useRef<Line[]>([]);
 const trimDrag=useRef<{start:Point;points:Point[];target:Element;origin:Point;dragging:boolean}|null>(null);
 const [trimTrail,setTrimTrail]=useState<Point[]>([]);
 const [trimResults,setTrimResults]=useState<TrimSweepResult[]>([]);
 const resetTrim=()=>{trimDrag.current=null;setTrimTrail([]);setTrimResults([]);};
 const layout=doc.layouts.find(l=>l.id===layoutId);
 const viewport=layout?.items.find((s):s is Viewport=>s.type==='viewport'&&s.id===viewportId);
 const paper=!!layout&&!viewport;
 const gridScale=view.scale/(viewport?.denominator||1);
 const drawingGrid=readGrid(doc.grid),activeGrid=paper?drawingGrid.paper:drawingGrid.model,grid=activeGrid.visible,snap=activeGrid.snap;
 const originAxisLength=displayedGrid(activeGrid,gridScale).x*GRID_MAJOR_INTERVALS;
 const updateGrid=(space:'model'|'paper',patch:Partial<GridSettings>)=>setDoc(d=>({...d,grid:{...readGrid(d.grid),[space]:{...readGrid(d.grid)[space],...patch}}}));
 const toggleGrid=()=>updateGrid(paper?'paper':'model',{visible:!grid});
 const toggleGridSnap=()=>updateGrid(paper?'paper':'model',{snap:!snap});
 const items:PaperItem[]=paper?layout!.items:doc.shapes;
 const active=items.find(s=>s.id===selected);
 const displayDoc=draft&&doc.shapes.some(s=>s.id===draft.id)?synchronizeDrawing({...doc,shapes:doc.shapes.map(s=>s.id===draft.id?draft as Shape:s)},doc):draft?.type==='viewport'?synchronizeDrawing({...doc,layouts:doc.layouts.map(l=>({...l,items:l.items.map(s=>s.id===draft.id?draft:s)}))},doc):doc;
 const displayLayout=displayDoc.layouts.find(l=>l.id===layoutId);
 const visible=visibleShapes(displayDoc),layer=doc.layers.find(l=>l.id===currentLayer)||doc.layers[0],source=doc.shapes.find(s=>s.id===sourceId);
 const alignment=useDimensionAlignment(()=>{if(lastPointer.current)move(lastPointer.current);});
 const resetAlignment=()=>{alignment.reset();setSnapHit(null);};
 useEffect(()=>{resetAlignment();},[tool,layoutId,viewportId,commandPoints.length,paperDimensionSession?.points.length,settings.osnap,osnapKinds,lengthText]);
 const editable=(s:PaperItem)=>!lockedShape(doc,s as Shape);
 const safe=(fn:()=>void)=>{try{setSidebarError('');fn();}catch(e){reportError((e as Error).message);}};
 const setPreview=(s:PaperItem|null)=>{draftRef.current=s;setDraft(s);};
 useEffect(()=>{const current=draftRef.current;if(tool!=='rect'||current?.type!=='rect')return;try{setPreview({...current,b:rectangleEndpoint(current.a,cursor,rectWidth,rectHeight,paper?'mm':unit)});}catch{}},[rectWidth,rectHeight]);
 const commit=(next:Drawing)=>{setPast(p=>[...p.slice(-99),doc]);setFuture([]);const resolved=synchronizeDrawing(next,doc);setDoc(resolved);if([...resolved.shapes,...resolved.layouts.flatMap(l=>l.items)].some(s=>s.type==='hatch'&&s.detachedReason&&!([...doc.shapes,...doc.layouts.flatMap(l=>l.items)].find(old=>old.id===s.id) as HatchShape|undefined)?.detachedReason))setMessage('Contour ouvert ou supprimé : hachure détachée, dernière surface conservée.');return resolved;};
 const clear=()=>{resetAlignment();setScaleReference(null);references.cancel();setBlockFlow(null);setDimensionLines([]);setPaperDimensionSession(null);setJoinPhase('initial');setJoinSourceId(null);lineSegments.current=[];resetTrim();setHatchObjectIds([]);setHatchSessionIds([]);setHatchRedefineId(null);setHatchOriginMode(false);setHatchOriginTarget(null);setHatchGaps([]);setPaletteOpen(false);setOffsetReady(false);setOffsetText('');setLinearSelectObject(false);setRadiusEditor(null);selectionDrag.current=null;setSelectionOutline([]);setPendingPaste(null);setPendingCopyBase(null);setLengthText('');setRectWidth('');setRectHeight('');setCommandText('');lastPointer.current=null;setSelected(null);setPreview(null);gesture.current=null;setSourceId(null);setCommandPoints([]);setPathNodes([]);setCommandPreview([]);setSnapHit(null);setChoosingBoundaries(false);setBoundaryIds([]);setNodeIndex(0);};
 const updateLayout=(patch:Partial<Layout>)=>{if(layout)commit({...doc,layouts:doc.layouts.map(l=>l.id===layout.id?{...l,...patch}:l)});};
 const put=(next:PaperItem[])=>{if(paper)updateLayout({items:next.map(s=>{if(s.type!=='dimension'||!s.paperLink)return s;const v=layout!.items.find((i):i is Viewport=>i.type==='viewport'&&i.id===s.paperLink!.viewportId);return v?updatePaperDimensionPlacement(s,v):s;})});else commit({...doc,shapes:next as Shape[]});};
 const edit=(s:PaperItem)=>{if(!editable(s)){setMessage('Le calque est verrouillé.');return;}put(items.map(i=>i.id===s.id?s:i));};
 const editViewport=(s:Viewport)=>{if(layout)updateLayout({items:layout.items.map(i=>i.id===s.id?s:i)});};
 const references=useReferences({doc,commit,layoutId,paper,layerId:currentLayer,unit:paper?'mm':unit,onSelect:(id,targetLayout)=>{if(targetLayout!==null){setLayoutId(targetLayout);setViewportId(null);}else if(!viewport){setLayoutId(null);setViewportId(null);}setTool('select');setSelected(id);setPropertiesOpen(true);},message:setMessage,onFocus:()=>svg.current?.focus({preventScroll:true})});
 const remove=()=>{const ids=new Set(selectedIds.length?selectedIds:selected?[selected]:[]),removable=items.filter(s=>ids.has(s.id)&&editable(s)&&(s.type!=='circle'||!items.some(d=>d.type==='dimension'&&d.circleId===s.id&&!editable(d))));if(!removable.length){if(ids.size)setMessage('Le calque est verrouillé.');return;}const removed=new Set(removable.map(s=>s.id));items.forEach(s=>{if(s.type==='dimension'&&s.circleId&&removed.has(s.circleId))removed.add(s.id);});put(items.filter(s=>!removed.has(s.id)));clear();setMessage(`${removed.size} objet(s) supprimé(s)${removable.length<ids.size?' — les objets verrouillés sont conservés':''}`);};
 const undo=()=>{if(tool==='line'&&lineSegments.current.length&&past.length){const last=lineSegments.current.pop()!;setFuture(f=>[doc,...f]);setDoc(past[past.length-1]);setPast(p=>p.slice(0,-1));setPreview({...last,id:id(),b:last.a});gesture.current=null;setLengthText('');setCommandText('');setMessage('Dernier segment annulé — indiquez le point suivant.');return;}if(past.length){setFuture(f=>[doc,...f]);setDoc(past[past.length-1]);setPast(p=>p.slice(0,-1));clear();}};
 const redo=()=>{if(future.length){setPast(p=>[...p,doc]);setDoc(future[0]);setFuture(f=>f.slice(1));clear();}};
 useEffect(()=>{try{saveTabDocument(sessionStorage,blockEditor?.drawing||doc,fileName,saved);}catch{setMessage('Stockage local indisponible : sauvegardez un fichier.');}},[doc,fileName,saved]);
 useEffect(()=>{if(layoutId&&!doc.layouts.some(l=>l.id===layoutId)){setLayoutId(null);setViewportId(null);}if(viewportId&&!viewport)setViewportId(null);},[doc,layoutId,viewportId,viewport]);
 const download=(text:string,extension:string,name=doc.name)=>{const url=URL.createObjectURL(new Blob([text],{type:'application/octet-stream'}));const a=document.createElement('a');a.href=url;a.download=(name.replace(/[\\/:*?"<>|]/g,'_')||'dessin')+extension;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('Fichier téléchargé');};
 const pdf=async(all=false)=>{setMessage('Préparation du PDF…');try{const {createPdf}=await import('./pdf');const {prepareReferencePrints}=await import('./reference-print');const prints=await prepareReferencePrints(doc,all?doc.layouts:layout?[layout]:[]);createPdf(doc,all?doc.layouts:layout?[layout]:[],unit,prints).save(`${doc.name.replace(/[\\/:*?"<>|]/g,'_') || 'dessin'}${all?'':' - '+layout!.name}.pdf`);setMessage('PDF exporté — imprimer à 100 % pour respecter les échelles');}catch(err){setMessage(err instanceof Error?err.message:'Export impossible');}};
 const switchSpace=(l:string|null)=>{if(blockEditor){setBlockClose(true);return;}clear();setViewportId(null);setTool('select');setLayoutId(l);setColor(l?'#17242a':'#b5ddd6');if(!l&&svg.current)setView(initialModelView(svg.current.clientWidth,svg.current.clientHeight));};
 useEffect(()=>{if(svg.current)setView(initialModelView(svg.current.clientWidth,svg.current.clientHeight));},[]);
 const navigationKey=(layoutId||'model')+':'+(viewportId||'outside');
 const navigationFrame=()=>{const r=svg.current!.getBoundingClientRect();if(viewport){const b=bounds(viewport);return{x:view.x+b.x*view.scale,y:view.y+b.y*view.scale,width:b.width*view.scale,height:b.height*view.scale};}return{x:0,y:0,width:r.width,height:r.height};};
 const navigationView=():NavigationView=>{if(!viewport)return view;const f=navigationFrame(),scale=view.scale/viewport.denominator;return{scale,x:f.width/2-viewport.center.x*scale,y:f.height/2-viewport.center.y*scale};};
 const applyNavigation=(next:NavigationView,remember=true)=>{if(viewport?.locked){setMessage('Fenêtre verrouillée : déverrouillez son cadrage.');return;}if(remember)viewHistory.current[navigationKey]=rememberView(viewHistory.current[navigationKey]||[],navigationView());if(viewport&&layout){const f=navigationFrame();const nextViewport={...viewport,denominator:Math.max(.01,Math.min(10000,view.scale/next.scale)),center:{x:Math.max(-1e7,Math.min(1e7,(f.width/2-next.x)/next.scale)),y:Math.max(-1e7,Math.min(1e7,(f.height/2-next.y)/next.scale))}};setDoc(d=>({...d,layouts:d.layouts.map(l=>l.id===layout.id?{...l,items:l.items.map(i=>i.id===viewport.id?nextViewport:i)}:l)}));}else setView(next);};
 const zoomOperation=(operation:string)=>safe(()=>{if(!svg.current)return;const f=navigationFrame(),current=navigationView();
 if(operation==='P'){const history=viewHistory.current[navigationKey]||[];if(!history.length)throw new Error('Aucune vue précédente.');applyNavigation(history.pop()!,false);return;}
 if(operation==='W'){setZoomMode('window');setZoomStart(null);setZoomPointer(null);setMessage('Zoom fenêtre : cliquez deux coins · Échap pour annuler');return;}
 if(operation==='S'){setZoomMode('scale');setMessage('Zoom échelle : saisissez un facteur positif puis Entrée');return;}
 const targets=paper?layout!.items:visible;
 const selection=new Set(selectedIds.length?selectedIds:selected?[selected]:[]);
 let boxes=(operation==='O'?targets.filter(i=>selection.has(i.id)):targets).map(bounds);
 if(operation==='O'&&!boxes.length)throw new Error('Sélectionnez un ou plusieurs objets avant Zoom Objet.');
 if(paper&&(operation==='A'||operation==='E'))boxes.push({x:0,y:0,width:paperSize(layout!).x,height:paperSize(layout!).y});
 if(!layout&&operation==='A')boxes.push({x:0,y:-50000,width:50000,height:50000});
 const next=boxes.length?fitBoxes(boxes,f.width,f.height):initialModelView(f.width,f.height);applyNavigation(next);
 });
 const fit=()=>zoomOperation('E');
 useEffect(()=>{if(layout)fit();},[layoutId,layout?.format,layout?.orientation]);
 useEffect(()=>{const el=layoutStrip.current;if(!el)return;const target=layoutId&&layoutId===doc.layouts.at(-1)?.id?el.querySelector('.add-layout'):el.querySelector('[aria-current="page"]');target?.scrollIntoView({block:'nearest',inline:'nearest'});updateTabScroll();const observer=new ResizeObserver(updateTabScroll);observer.observe(el);return()=>observer.disconnect();},[layoutId,doc.layouts.length]);
 const cancelTool=()=>{
  if(references.active){references.cancel();setMessage('Attachement ou modification de référence annulé.');return;}
  if(blockFlow){setBlockFlow(null);clear();setTool('select');setMessage('Commande de bloc annulée.');return;}
  if(gesture.current?.grip){gesture.current=null;setPreview(null);setLengthText('');setCommandText('');setMessage('Modification annulée.');return;}
  if(tool==='join'){clear();setTool('select');setMessage('Jonction annulée.');return;}
  if(selectionDrag.current){const previous=selectionDrag.current.previous;clear();setSelectedIds(previous);setTool('select');setMessage('Sélection annulée');return;}
  if(zoomMode){setZoomMode(null);setZoomStart(null);setZoomPointer(null);clear();setTool('select');setMessage('Prêt à dessiner');return;}
  if((tool==='polyline'||tool==='bezier')&&pathNodes.length>=2){if(!finishPath(false,true))return;}
  else if(gesture.current&&draftRef.current&&constructedItem(draftRef.current)&&!(tool==='line'&&!gesture.current.original)){
   try{const g=gesture.current,s=draftRef.current;if(g.viewport&&s.type==='viewport')editViewport(s);else{if(g.original){if(!editable(g.original))throw new Error('Le calque est verrouillé.');}else canDraw();put(g.original?items.map(i=>i.id===s.id?s:i):[...items,s.type==='viewport'?fitViewport(s,visible):s]);}}catch(err){reportError((err as Error).message);return;}
  }
  clear();setViewportId(null);setTool('select');setMessage('Prêt à dessiner');
 };
 const chooseTool=(t:Tool)=>{resetAlignment();setScaleReference(null);references.cancel();setLastBlockCommand(null);setBlockFlow(null);if(t==='angularDimension')setSelectedIds([]);setPaperDimensionSession(null);setDimensionLines([]);if(t==='join'){const ids=selectedIds.length?selectedIds:selected?[selected]:[];clear();setSelectedIds(ids);setTool('join');setToolHistory(h=>['join' as Tool,...h.filter(v=>v!=='join')].slice(0,8));setContextPosition(null);setMessage('JOINDRE · Sélectionnez un objet source ou plusieurs objets, puis Entrée.');if(ids.length>1)applyJoin(ids,false,null);return;}setJoinPhase('initial');setJoinSourceId(null);lineSegments.current=[];resetTrim();if(t==='line')setMessage('LIGNE · Cliquez le premier point.');setContextPosition(null);if(t!=='select'&&t!=='pan')setToolHistory(h=>[t,...h.filter(v=>v!==t)].slice(0,8));setHatchOriginTarget(null);if(t==='hatch'){const ids=selectedIds.length?selectedIds:selected?[selected]:[];const boundaries=initialHatchSelection(items,ids);setHatchObjectIds(boundaries);setHatchMode(boundaries.length?'objects':'pick');setHatchSessionIds([]);setHatchRedefineId(null);setHatchOriginMode(false);setHatchGaps([]);setMessage('HACHURES · Cliquez dans une zone fermée ou sélectionnez ses objets.');}else{setHatchObjectIds([]);setHatchRedefineId(null);setHatchSessionIds([]);setHatchOriginMode(false);setHatchGaps([]);}setPaletteOpen(false);if(t==='rect')setMessage('RECTANG · Cliquez le premier coin.');if(t==='fillet')setMessage('RACCORD · Cliquez près des extrémités de deux lignes (rayon zéro).');if(t==='arc')setMessage('ARC · Indiquez le point de départ de l’arc.');setOffsetReady(false);setOffsetText('');if(t==='offset')setMessage('Saisissez la distance puis Entrée.');setLinearSelectObject(false);setRadiusEditor(null);selectionDrag.current=null;setSelectionOutline([]);setLengthText('');setRectWidth('');setRectHeight('');setCommandText('');lastPointer.current=null;if(t==='copy'||t==='move'||t==='rotate'||t==='scale'){selectSingle(null);setSelectedIds(selectedCopyIds(doc,selectedIds,selected));setMessage(selectedCopyIds(doc,selectedIds,selected).length?'Indiquez le point de base.':t==='copy'?'Sélectionnez un objet à copier.':t==='scale'?'Sélectionnez les objets à redimensionner.':t==='rotate'?'Sélectionnez un objet à tourner.':'Sélectionnez un objet à déplacer.');}else if(t!=='select')setSelected(null);else setSelectedIds([]);if(t==='scale')setSettings(v=>({...v,scaleFactor:'',scaleReference:'',scaleTarget:'',scaleCopy:false}));if(t==='rotate')setSettings(v=>({...v,rotation:''}));if(paper&&isPaperDimensionTool(t))setMessage('Cotation sur la feuille · Cliquez le bâtiment dans une fenêtre, sans l’activer.');setTool(t);setPreview(null);gesture.current=null;setCommandPoints([]);setPathNodes([]);setCommandPreview([]);setSourceId((t==='copy'||t==='move'||t==='rotate'||t==='scale')?selectedCopyIds(doc,selectedIds,selected)[0]||null:t!=='offset'&&t!=='fillet'&&t!=='dimension'&&t!=='diameter'&&t!=='linearDimension'&&!isSpecializedDimension(t)&&!paper&&active?active.id:null);setBoundaryIds([]);setChoosingBoundaries(false);setMeasurement('');const target=doc.layers.find(l=>l.id===((t==='dimension'||t==='diameter'||t==='linearDimension'||isSpecializedDimension(t))?'cotes':''));if(target?.visible&&!target.locked){setCurrentLayer(target.id);setColor(target.color);}};
 const addLineSegment=(end:Point)=>{const current=draftRef.current;if(current?.type!=='line')return;canDraw();const {segment,preview}=continueLine(current,end,id());put([...items,segment]);lineSegments.current.push(segment);setPreview(preview);gesture.current=null;setLengthText('');setCommandText('');setMessage('Point suivant · C : fermer · U : annuler le dernier segment · Entrée ou Échap : terminer.');};
 const closeLines=()=>safe(()=>{const end=lineClosingPoint(lineSegments.current);if(draftRef.current?.type!=='line')return;if(distance(draftRef.current.a,end)>=.001)addLineSegment(end);chooseTool('select');setMessage('Suite de lignes fermée.');});
 const undoLineSegment=()=>{if(lineSegments.current.length)undo();else{setCommandText('');setMessage('Aucun segment à annuler.');}};
 const applyJoin=(ids=selectedIds,closeArc=false,sourceOverride:string|null=joinSourceId)=>safe(()=>{
  const source=sourceOverride||(closeArc&&ids.length===1?ids[0]:undefined);
  const next=joinDrawing(doc,source?[...new Set([source,...ids])]:ids,source||undefined,closeArc,paper?layout!.id:undefined);
  if(!next.result.joined){setMessage('Aucun objet compatible à joindre. Les objets non joints sont conservés.');return;}
  const resolved=commit(next.drawing);const oldHatches=new Map([...doc.shapes,...doc.layouts.flatMap(l=>l.items)].map(s=>[s.id,s]));const detached=[...resolved.shapes,...resolved.layouts.flatMap(l=>l.items)].some(s=>s.type==='hatch'&&s.detachedReason&&(oldHatches.get(s.id) as HatchShape|undefined)?.associative);clear();setTool('select');if(next.result.resultIds.length===1)setSelected(next.result.resultIds[0]);else setSelectedIds(next.result.resultIds);
  setMessage('Jonction terminée : '+next.result.joined+' objet(s) réuni(s), '+next.result.resultIds.length+' résultat(s), '+next.result.ignored+' objet(s) non joint(s).'+(detached?' · Une hachure a été détachée : contour non valide.':''));
 });
 const finishJoin=()=>{
  if(joinPhase==='initial'&&selectedIds.length===1){const shape=items.find(s=>s.id===selectedIds[0]);if(!shape||!joinEligible(shape)||!editable(shape)){setMessage('Choisissez une ligne, un arc ou une polyligne ouverte sur un calque déverrouillé.');return;}setJoinSourceId(shape.id);setJoinPhase('targets');setMessage(shape.type==='arc'?'Sélectionnez les arcs de même centre et rayon · Entrée : joindre · C puis Entrée : fermer.':'Sélectionnez les objets à joindre à la source, puis Entrée.');return;}
  applyJoin();
 };
 const joinArcSource=tool==='join'?items.find(s=>s.id===(joinSourceId||(selectedIds.length===1?selectedIds[0]:null))):undefined;
 const boundaries=visible.filter(s=>s.type!=='reference'&&s.type!=='hatch'&&(!boundaryIds.length||boundaryIds.includes(s.id)));
 const diameterTextHeight=()=>{if(paper&&isPaperDimensionTool(tool)){const h=parseDistance(paperDimensionText);if(!Number.isFinite(h)||h<=0||h>100)throw new Error('La hauteur imprimée doit être comprise entre 0 et 100 mm.');return h;}const scale=Number(settings.annotationScale.replace(',','.')),height=parseDistance(settings.dimensionText)*scale;if(!Number.isFinite(height)||height<=0||scale<=0||height>1e5)throw new Error('Hauteur de texte ou échelle de cote invalide.');return height;};
 const baseShape=()=>({id:id(),a:{x:0,y:0},b:{x:0,y:0},color,colorByLayer:true,layerId:layer.id});
 const canDraw=()=>{if(layer.locked||!layer.visible)throw new Error('Choisissez un calque visible et déverrouillé pour dessiner.');};
 const hatchEligible=(paper?items.filter((s):s is Shape=>s.type!=='text'&&s.type!=='viewport'):visible).filter(boundaryShape);
 const hatchCandidates=hatchEligible.filter(s=>hatchMode==='pick'||hatchObjectIds.includes(s.id));
 const hatchBoundaryKey=tool==='hatch'?JSON.stringify(hatchCandidates):'';
 const hatchAnalysis=useMemo<{analysis:BoundaryAnalysis|null;error:string}>(()=>{if(tool!=='hatch')return{analysis:null,error:''};try{return{analysis:analyzeBoundaries(hatchCandidates),error:''};}catch(e){return{analysis:null,error:(e as Error).message};}},[hatchBoundaryKey,tool]);
 const hatchPreview=useMemo(()=>{if(tool!=='hatch'||hatchOriginMode||!hatchAnalysis.analysis)return[];try{const regions=hatchMode==='pick'?[pickRegion(hatchAnalysis.analysis,cursor,hatchStyle.islands)]:selectedRegions(hatchAnalysis.analysis,hatchStyle.islands);return regions.length?[createHatch({id:'hatch-preview',a:cursor,b:cursor,color,colorByLayer:true,layerId:layer.id},regions,hatchStyle)]:[];}catch{return[];}},[tool,hatchOriginMode,hatchAnalysis,hatchMode,cursor.x,cursor.y,hatchStyle,color,currentLayer]);
 const updateHatchStyle=(style:HatchStyle)=>safe(()=>{const ids=new Set(hatchSessionIds),next=items.map(s=>{if(s.type!=='hatch'||!ids.has(s.id)||!editable(s))return s;const updated={...s,...style,regions:s.regions.map(r=>({...r,loops:islandLoops(r.boundaryLoops||r.loops,style.islands)}))};hatchLines(updated);return updated;});hatchPreview.forEach(s=>hatchLines({...s,...style}));setHatchStyle(style);if(ids.size)put(next);});
 const confirmHatch=(point?:Point)=>safe(()=>{
  canDraw();if(!hatchAnalysis.analysis)throw new Error(hatchAnalysis.error||'Aucun contour disponible.');
  let regions:HatchRegion[];try{regions=point?[pickRegion(hatchAnalysis.analysis,point,hatchStyle.islands)]:selectedRegions(hatchAnalysis.analysis,hatchStyle.islands);if(!regions.length)throw new Error('Les objets sélectionnés ne forment aucun contour fermé.');}catch(e){setHatchGaps(hatchAnalysis.analysis.gaps.slice(0,100));throw e;}
  const result=applyHatchRegions(items,regions,hatchStyle,{separate:hatchSeparate,sessionIds:hatchSessionIds,redefineId:hatchRedefineId,makeBase:baseShape,editable});
  if(result.duplicate){setMessage('Cette zone est déjà hachurée dans la commande en cours.');return;}
  put(result.items);
  if(result.redefined){clear();setTool('select');setSelected(result.ids[0]);setMessage('Zone de hachure redéfinie.');return;}
  setHatchSessionIds(result.ids);setHatchGaps([]);setHatchObjectIds([]);setMessage('Hachure créée · Cliquez une autre zone, ou Entrée pour terminer.');
 });
 const finishHatches=()=>{if(hatchOriginMode){setHatchOriginMode(false);return;}if(hatchMode==='objects'&&hatchObjectIds.length){confirmHatch();return;}clear();setTool('select');setMessage('Hachures terminées.');};
 const editHatchStyle=(shape:HatchShape,style:HatchStyle)=>safe(()=>{if(style.associative&&!shape.associative&&shape.regions.some(r=>!r.sourceIds.length)){setMessage('Redéfinissez la zone pour relier la hachure à ses contours.');return;}const updated={...shape,...style,regions:shape.regions.map(r=>({...r,loops:islandLoops(r.boundaryLoops||r.loops,style.islands)}))};hatchLines(updated);edit(updated);});
 const redefineHatch=(shape:HatchShape)=>{if(!editable(shape))return;chooseTool('hatch');setHatchRedefineId(shape.id);setHatchStyle(hatchStyleOf(shape));setHatchMode('pick');setHatchObjectIds([]);setMessage('Cliquez à l’intérieur de la nouvelle zone de hachure.');};
 const finishPath=(closeRequested=false,keepOpen=false)=>{try{
   const closed=!keepOpen&&(closeRequested||settings.closed);
   if(pathNodes.length<2)throw new Error('Placez au moins deux points.');if(closed&&pathNodes.length<3)throw new Error('Placez au moins trois points pour fermer le contour.');canDraw();
   let nodes=closeRequested?closedPolylineNodes(pathNodes):pathNodes.map(n=>({...n}));
   if(tool==='polyline'&&closed&&settings.segment==='arc'){const angle=parseAngle(settings.arcAngle);if(Math.abs(angle)>=359||Math.abs(angle)<.01)throw new Error('Angle d’arc invalide.');nodes[nodes.length-1].bulge=Math.tan(angle*Math.PI/720);}
   const s=completedPath(tool==='bezier'?'bezier':'polyline',baseShape(),nodes,closed)!;
   put([...items,s]);setSelected(s.id);setPathNodes([]);setCommandPoints([]);setLengthText('');setCommandText('');setTool('select');setMessage('Chemin créé — sélectionnez ses sommets et poignées pour le modifier.');return s;
 }catch(err){reportError((err as Error).message);return null;} };
 const chooseBoundaries=(mode:'choose'|'finish'|'all')=>{if(mode==='finish'&&!boundaryIds.length){setMessage('Choisissez au moins une limite ou utilisez le mode rapide.');return;}setChoosingBoundaries(mode==='choose');if(mode==='choose'||mode==='all')setBoundaryIds([]);setCommandPreview([]);setMessage(mode==='choose'?'Cliquez les limites de coupe, puis Entrée':mode==='all'?'Toutes les formes visibles servent de limites':'Limites choisies — cliquez les morceaux à modifier');};
 const replaceModel=(old:Shape,next:Shape[])=>{if(lockedShape(doc,old))throw new Error('Le calque de cet objet est verrouillé.');commit({...doc,shapes:doc.shapes.flatMap(s=>s.id===old.id?next:[s])});};
 const currentScale=(point=cursor)=>scaleReference?scaleReferencePreview(scaleReference,commandPoints[0],point,commandText,unit):scaleFactor(commandPoints[0],point,commandText||settings.scaleFactor,source!,settings.scaleReference,settings.scaleTarget);
 const confirmScale=(point=cursor,factor?:number)=>safe(()=>{
   if(!source||!commandPoints.length)throw new Error('Choisissez le point de base.');
   const ids=selectedIds.length?selectedIds:[source.id];
   commit(scaleSelection(doc,ids,commandPoints[0],factor??currentScale(point),settings.scaleCopy?id:undefined));
   chooseTool('select');setMessage('Mise à l’échelle appliquée.');
 });
 const startScaleReference=()=>safe(()=>{
   if(!source||!commandPoints.length)throw new Error('Choisissez le point de base.');
   const next=beginScaleReference(lastScaleLengths.current.reference??parseLength('1'),lastScaleLengths.current.target??parseLength('1'));
   setScaleReference(next);setSettings(v=>({...v,scaleFactor:'',scaleReference:'',scaleTarget:''}));setCommandText('');setCommandPreview([]);setMessage(scaleReferencePrompt(next));svg.current?.focus({preventScroll:true});
 });
 const receiveScaleReference=(result:ScaleReferenceResult)=>{
   if(result.session.referenceLength)lastScaleLengths.current.reference=result.session.referenceLength;
   if(result.factor!==undefined){lastScaleLengths.current.target=result.factor*result.session.referenceLength!;confirmScale(cursor,result.factor);}
   else{setScaleReference(result.session);setCommandText('');setMessage(scaleReferencePrompt(result.session));}
 };
 const scaleCommand=(text=commandText||(!scaleReference?settings.scaleFactor:''))=>{
   if(tool!=='scale'||!source||!commandPoints.length)return false;
   safe(()=>{
     if(scaleReference){receiveScaleReference(scaleReferenceInput(scaleReference,text,unit));return;}
     const option=scaleOption(text);
     if(['R','REFERENCE'].includes(option)){startScaleReference();return;}
     if(['C','COPY','COPIER'].includes(option)){setSettings(v=>({...v,scaleCopy:true}));setCommandText('');setMessage('SCALE · Copie activée. Spécifiez le facteur d’échelle ou R — Référence.');return;}
     if(!text.trim()){confirmScale();return;}
     const factor=Number(text.trim().replace(',','.'));
     if(!Number.isFinite(factor)||factor<=0)throw new Error('Saisissez un facteur positif ou R — Référence.');
     confirmScale(cursor,factor);
   });return true;
 };
 const confirmRotation=(point=cursor)=>safe(()=>{
   if(!source||!commandPoints.length)throw new Error('Choisissez le point de base.');
   const ids=selectedIds.length?selectedIds:[source.id];
   commit(rotateSelection(doc,ids,commandPoints[0],rotationAngle(commandPoints[0],point,settings.rotation)));
   setTool('select');setSourceId(null);setCommandPoints([]);setCommandPreview([]);setCommandText('');setSelectedIds(ids);selectSingle(null);
   setMessage('Rotation appliquée.');rotationInput.current?.blur();
 });
 useEffect(()=>{
   if(tool!=='rotate'||!source||!commandPoints.length)return;
   try{const next=rotateSelection(doc,selectedIds.length?selectedIds:[source.id],commandPoints[0],rotationAngle(commandPoints[0],cursor,settings.rotation));setCommandPreview(next.shapes.filter(s=>(selectedIds.length?selectedIds:[source.id]).includes(s.id)));}catch{setCommandPreview([]);}
 },[tool,source,commandPoints,selectedIds,doc,cursor,settings.rotation]);
 const applyNumeric=()=>safe(()=>{
   if(tool==='scale'){confirmScale();return;}if(tool==='rotate'){confirmRotation();return;}if(isSpecializedDimension(tool)||['dimension','diameter','linearDimension'].includes(tool)){diameterTextHeight();dimensionOptions();if(tool==='linearDimension'&&settings.dimensionDirection.trim())parseAngle(settings.dimensionDirection);setMessage('Réglages de cotation validés — poursuivez le placement dans le dessin.');return;}
   const s=source||(!paper&&active?active as Shape:undefined);if(!s)throw new Error('Sélectionnez d’abord un objet.');if(lockedShape(doc,s))throw new Error('Le calque est verrouillé.');
   if(tool==='copy'||tool==='move'){const next=translateItem(s,parseLength(settings.dx),-parseLength(settings.dy));if(tool==='copy'){canDraw();commit({...doc,shapes:[...doc.shapes,{...onLayer(next.type==='hatch'?detachHatch(next):detachDimension(next),layer.id),id:id()}]});}else commit(moveSelectionObjects(doc,selectedIds.length?selectedIds:[s.id],{x:0,y:0},{x:parseLength(settings.dx),y:-parseLength(settings.dy)}));}

   setCommandPreview([]);setCommandPoints([]);setMessage('Transformation appliquée');
 });
 const findObject=(target:Element,p:Point)=>{
   const targetId=target.closest('[data-id]')?.getAttribute('data-id');const hatchHit=visible.find(s=>s.type==='hatch'&&s.id===targetId);if(hatchHit&&['copy','move','scale','rotate','mirror'].includes(tool))return hatchHit;return visible.find(s=>s.id===targetId&&s.type!=='hatch')||visible.filter(s=>s.type!=='dimension'&&s.type!=='hatch'&&s.type!=='text').map(s=>({s,d:distance(nearestPart(s,p).point,p)})).filter(v=>v.d<8/(view.scale/(viewport?.denominator||1))).sort((a,b)=>a.d-b.d)[0]?.s;
 };
 const confirmOffsetDistance=()=>safe(()=>{if(!offsetText.trim()){cancelTool();return;}const amount=parseLength(offsetText);if(!Number.isFinite(amount)||amount<=0)throw new Error('La distance doit être positive.');setSettings(s=>({...s,distance:amount+' mm'}));setOffsetReady(true);setSourceId(null);setCommandPreview([]);offsetInput.current?.blur();setMessage('Sélectionnez l’objet à décaler.');});
 const dimensionOptions=()=>({direction:settings.dimensionDirection,axis:settings.ordinateAxis,datum:tool==='ordinate'?{x:parseDistance(settings.datumX,unit),y:-parseDistance(settings.datumY,unit)}:{x:0,y:0}});
 const paperDimensionSettings=()=>({...dimensionOptions(),height:diameterTextHeight(),angularMode:settings.angularMode});
 const paperDimensionClick=(point:Point)=>safe(()=>{
  if(!layout||!isPaperDimensionTool(tool))return;canDraw();
  const result=advancePaperDimension(tool,paperDimensionSession,layout,visible,point,8/view.scale,baseShape(),paperDimensionSettings(),linearSelectObject);
  setPaperDimensionSession(result.session);setMessage(result.message);
  if(result.session?.points.length===2)setLinearSelectObject(false);
  if(result.dimension){resetAlignment();put([...items,result.dimension]);setLinearSelectObject(false);}
 });
 const dimensionAt=(p:Point)=>{
  if(tool==='linearDimension')return directedLinearDimension(commandPoints[0],commandPoints[1],p,baseShape(),diameterTextHeight(),settings.dimensionDirection.trim()?parseAngle(settings.dimensionDirection):undefined);
  if(!isSpecializedDimension(tool)&&tool!=='diameter')throw new Error('Choisissez un outil de cotation.');
  const arc=source?segments(source).find(seg=>seg.kind==='arc'&&distance(seg.center,commandPoints[0]||p)<1e-5&&distance(seg.a,commandPoints[1]||p)<1e-5):undefined;const sweep=source?.type==='circle'?Math.PI*2:arc?.kind==='arc'?arc.sweep:undefined;
  const pointer=tool==='jogged'&&commandPoints.length===5?commandPoints[4]:p;
  const pts=tool==='jogged'?[...commandPoints.slice(0,3),commandPoints[3]||p,...(commandPoints.length===5?[p]:[])]:commandPoints;
  return makeDimension(tool,pts,pointer,baseShape(),diameterTextHeight(),dimensionOptions(),sweep);
 };
 const completeDimension=(p:Point)=>{
  resetAlignment();
  const d=dimensionAt(p);
  // Bind exact endpoints/centers only, never a merely nearby arbitrary point.
  const anchors=d.points||[d.a,d.b];
  let references=anchors.slice(0,d.kind==='ordinate'?2:d.points?3:2).flatMap((point,index)=>{
   if(d.kind==='ordinate'&&index===0)return [];
   for(const shape of [...(source?[source]:[]),...visible.filter(v=>v.id!==source?.id)]){if(['dimension','hatch','text'].includes(shape.type))continue;const parts=segments(shape);for(let i=0;i<parts.length;i++){const part=parts[i];for(const feature of ['a','b','center'] as const){const candidate=feature==='center'?(part.kind==='arc'?part.center:undefined):part[feature];if(candidate&&distance(candidate,point)<1e-5)return [{id:shape.id,segment:i,point:index,feature}];}}}
   return [];
  });
  if(source&&d.points&&['radius','arcLength','jogged','diameter','angular'].includes(d.kind||'')){
   const index=source.type==='circle'?0:segments(source).findIndex(seg=>seg.kind==='arc'&&distance(seg.center,d.points![0])<1e-5&&distance(seg.a,d.points![1])<1e-5&&distance(seg.b,d.points![2])<1e-5);
   if(index>=0)references=[{id:source.id,segment:index,point:0,feature:'center'},{id:source.id,segment:index,point:1,feature:'a'},{id:source.id,segment:index,point:2,feature:source.type==='circle'?'a':'b'}];
  }
  put([...items,{...d,...(references.length?{references}:{}),...(d.kind==='angular'&&dimensionLines.length===2?{angleSources:dimensionLines}:{})}]);setDimensionLines([]);setCommandPoints([]);setSourceId(null);setLinearSelectObject(false);setMessage('Cotation créée — sélectionnez la géométrie suivante.');
 };
 const commandClick=(target:Element,p:Point)=>safe(()=>{
   if(tool==='arc'){canDraw();if(commandPoints.length<2){if(commandPoints.length&&distance(commandPoints[0],p)<.001)throw new Error('Choisissez deux points distincts.');setCommandPoints([...commandPoints,p]);setMessage(commandPoints.length?'ARC · Indiquez le point final de l’arc.':'ARC · Indiquez le deuxième point sur l’arc.');setCommandPreview([]);return;}const arc=threePointArc(commandPoints[0],commandPoints[1],p,baseShape());put([...items,arc]);chooseTool('select');setMessage('Arc créé.');return;}
   if(tool==='offset'&&!offsetReady)return;
   const hit=findObject(target,p);
   if(choosingBoundaries){if(hit){setBoundaryIds(ids=>ids.includes(hit.id)?ids.filter(i=>i!==hit.id):[...ids,hit.id]);setMessage('Limite ajoutée — Entrée pour commencer les coupes');}return;}
   if(tool==='polyline'||tool==='bezier'){
     canDraw();const previous=pathNodes[pathNodes.length-1];const nextPoint=previous&&tool==='polyline'?(lengthText?exactEndpoint(previous.p,p,lengthText,unit,effectiveOrtho,effectivePolar,settings.angle):constrain(previous.p,p,settings.length,settings.angle)):p;
     if(previous&&distance(previous.p,nextPoint)<.001)return;
     const nodes=pathNodes.map(n=>({...n}));if(previous&&tool==='polyline'){const a=settings.segment==='arc'?parseAngle(settings.arcAngle):0;if(Math.abs(a)>=359)throw new Error('L’angle de l’arc doit être inférieur à 359°.');nodes[nodes.length-1].bulge=Math.tan(a*Math.PI/720);}
     setPathNodes([...nodes,{p:nextPoint}]);setLengthText('');setCursor(nextPoint);setMessage('Cliquez le prochain sommet · C puis Entrée : fermer · Entrée : terminer');return;
   }
   if(tool==='measure'){const pts=commandPoints.length===1?[commandPoints[0],p]:[p];setCommandPoints(pts);if(pts.length===2){const d=sub(p,pts[0]);const result=`Distance : ${displayDistance(distance(p,pts[0]),unit)} ${unit}\nX : ${displayDistance(d.x,unit)} ${unit}\nY : ${displayDistance(-d.y,unit)} ${unit}\nAngle : ${(-Math.atan2(d.y,d.x)*180/Math.PI).toFixed(2)}°`;setMeasurement(result);setMeasurementResult(result);const endpoint=viewport?modelToPaper(p,viewport):p;setMeasurementAnchor({x:view.x+endpoint.x*view.scale,y:view.y+endpoint.y*view.scale});setMessage('Mesure terminée — cliquez pour une nouvelle mesure');}return;}
   if(tool==='dimension'&&linearSelectObject&&hit?.type!=='circle'){canDraw();if(!hit||hit.type==='dimension')throw new Error('Cliquez un côté de rectangle, une ligne, un segment droit ou un cercle.');const part=nearestPart(hit,p).segment;if(part.kind!=='line')throw new Error('Choisissez un segment droit.');setTool('linearDimension');setCommandPoints([part.a,part.b]);setLinearSelectObject(false);setMessage('Cliquez pour placer la cote horizontale ou verticale.');return;}
   if(isSpecializedDimension(tool)||tool==='diameter'&&commandPoints.length>0){
    canDraw();
    if(tool==='alignedDimension'){
     if(linearSelectObject){if(!hit||['dimension','hatch','text'].includes(hit.type))throw new Error('Choisissez un côté droit.');const seg=nearestPart(hit,p).segment;if(seg.kind!=='line')throw new Error('Choisissez un segment droit.');setCommandPoints([seg.a,seg.b]);setLinearSelectObject(false);return;}
     if(commandPoints.length<2){if(commandPoints.length&&distance(commandPoints[0],p)<.001)throw new Error('Choisissez deux points distincts.');setCommandPoints([...commandPoints,p]);setMessage(commandPoints.length?'Cliquez pour placer la cote alignée.':'Cliquez le second point à coter.');return;}
    }else if(tool==='ordinate'){if(!commandPoints.length){setCommandPoints([p]);setMessage('Placez le rappel de cote ; X/Y et origine sont réglables.');return;}}
    else if(tool==='angularDimension'){
     if(commandPoints.length<3){
      if(!commandPoints.length&&hit&&['arc','polyline'].includes(hit.type)&&nearestPart(hit,p).segment.kind==='arc'){setSourceId(hit.id);setCommandPoints(circularDefinition(hit,p).points);setMessage('Placez la cote dans le secteur à mesurer.');return;}
      if(!commandPoints.length&&settings.angularMode==='lines'&&hit&&!['dimension','hatch','text'].includes(hit.type)&&nearestPart(hit,p).segment.kind==='line'){const part=nearestPart(hit,p);setDimensionLines([{id:hit.id,segment:segments(hit).findIndex(seg=>distance(seg.a,part.segment.a)<1e-8&&distance(seg.b,part.segment.b)<1e-8),position:part.t}]);setSourceId(hit.id);setCommandPoints([p]);setMessage('Cliquez la seconde ligne.');return;}
      if(source){if(!hit||['dimension','hatch','text'].includes(hit.type))throw new Error('Choisissez une seconde ligne.');const pts=lineAngleDefinition(source,hit,commandPoints[0],p),part=nearestPart(hit,p);setDimensionLines([...dimensionLines,{id:hit.id,segment:segments(hit).findIndex(seg=>distance(seg.a,part.segment.a)<1e-8&&distance(seg.b,part.segment.b)<1e-8),position:part.t}]);setCommandPoints(pts);setSourceId(null);setMessage('Placez la cote dans le secteur à mesurer.');return;}
      if(commandPoints.length&&distance(commandPoints[0],p)<.001)throw new Error('Choisissez deux points distincts.');setCommandPoints([...commandPoints,p]);setMessage(commandPoints.length===2?'Placez la cote dans le secteur à mesurer.':'Cliquez un point sur la direction à mesurer.');return;
     }
    }else{
     if(!commandPoints.length){if(!hit||['dimension','hatch','text'].includes(hit.type))throw new Error('Choisissez un cercle ou un arc.');const def=circularDefinition(hit,p);if(tool==='arcDimension'&&Math.abs(def.sweep)>=Math.PI*2-1e-8)throw new Error('Choisissez un arc ouvert.');setSourceId(hit.id);setCommandPoints(def.points);setMessage(tool==='jogged'?'Cliquez le centre de remplacement.':'Déplacez le pointeur puis cliquez pour placer la cote.');return;}
     if(tool==='jogged'&&commandPoints.length<5){setCommandPoints([...commandPoints,p]);setMessage(commandPoints.length===3?'Déplacez le pointeur puis cliquez pour placer la cote.':'Cliquez pour placer la brisure.');return;}
    }
    completeDimension(p);return;
   }
   if(tool==='diameter'&&!commandPoints.length&&hit&&hit.type!=='circle'){canDraw();const def=circularDefinition(hit,p);setSourceId(hit.id);setCommandPoints(def.points);return;}
   if(tool==='linearDimension'){canDraw();if(linearSelectObject){if(!hit||hit.type==='dimension'||hit.type==='circle')throw new Error('Cliquez un côté de rectangle, une ligne ou un segment de polyligne.');const part=nearestPart(hit,p).segment;if(part.kind!=='line')throw new Error('Choisissez un segment droit.');setCommandPoints([part.a,part.b]);setLinearSelectObject(false);setMessage('Cliquez pour placer la cote horizontale ou verticale.');return;}if(commandPoints.length<2){if(commandPoints.length&&distance(commandPoints[0],p)<.001)throw new Error('Choisissez deux points distincts.');setCommandPoints([...commandPoints,p]);setMessage(commandPoints.length?'Cliquez pour placer la cote horizontale ou verticale.':'Cliquez le second point à coter.');return;}completeDimension(p);return;}
   if(tool==='dimension'||tool==='diameter'){canDraw();if(source?.type==='circle'){const height=diameterTextHeight();const dim={...diameterDimension(source,p,baseShape(),height),circleId:source.id};put([...items,dim]);setSourceId(null);setCommandPoints([]);setMessage('Cotation de diamètre créée — choisissez un cercle ou deux points.');return;}if(!commandPoints.length&&hit?.type==='circle'){setLinearSelectObject(false);setSourceId(hit.id);setMessage('Placez la cote de diamètre à l’extérieur du cercle.');return;}if(tool==='diameter')throw new Error('Cliquez la circonférence d’un cercle.');if(commandPoints.length<2){setCommandPoints([...commandPoints,p]);setMessage(commandPoints.length?'Cliquez pour placer la cote':'Cliquez le second point à coter');return;}const [a,b]=commandPoints,len=distance(a,b);if(len<.001)throw new Error('Choisissez deux points distincts.');const scale=Number(settings.annotationScale.replace(',','.')),height=parseDistance(settings.dimensionText)*scale;if(!Number.isFinite(height)||height<=0||height>1e5||scale<=0)throw new Error('Hauteur de texte ou échelle de cote invalide.');const s:Shape={...baseShape(),type:'dimension',a,b,offset:cross(sub(b,a),sub(p,a))/len,height};put([...items,s]);setSelected(s.id);setCommandPoints([]);setMessage('Cotation créée');return;}
   if(tool==='trim'||tool==='extend'){if(!hit)throw new Error('Cliquez sur un segment.');if(lockedShape(doc,hit))throw new Error('Le calque de cet objet est verrouillé.');const result=tool==='trim'?trimShape(hit,boundaries,p):[extendShape(hit,boundaries,p)];replaceModel(hit,result);setSelected(null);setCommandPreview([]);setMessage(tool==='trim'?'Morceau supprimé — cliquez le suivant':'Extrémité prolongée — cliquez la suivante');return;}
   if(tool==='fillet'){if(!hit)throw new Error('Cliquez une ligne près de l’extrémité à raccorder.');if(lockedShape(doc,hit))throw new Error('Le calque est verrouillé.');if(!source){setSourceId(hit.id);setSelected(hit.id);setCommandPoints([p]);setMessage('Cliquez près de l’extrémité de la seconde ligne');return;}if(hit.id===source.id)throw new Error('Choisissez une autre ligne.');const [a,b]=joinCorner(source,hit,commandPoints[0]||source.a,p);commit({...doc,shapes:doc.shapes.map(s=>s.id===a.id?a:s.id===b.id?b:s)});setSourceId(null);setSelected(null);setCommandPoints([]);setMessage('Raccord créé — choisissez la prochaine paire');return;}
   if(!source){if(!hit)throw new Error('Sélectionnez un objet pour cet outil.');if(lockedShape(doc,hit))throw new Error('Le calque est verrouillé.');setSourceId(hit.id);setSelected(hit.id);if(tool==='rotate'||tool==='scale')setSelectedIds([hit.id]);setMessage(tool==='offset'?'Cliquez du côté du décalage':'Cliquez le point de base');return;}
   if(lockedShape(doc,source)||((tool==='copy'||tool==='move')&&doc.shapes.some(s=>selectedIds.includes(s.id)&&lockedShape(doc,s))))throw new Error('Le calque est verrouillé.');
   if(tool==='offset'){canDraw();const next=offsetShape(source,parseLength(settings.distance),p);commit({...doc,shapes:[...doc.shapes,{...onLayer(next,layer.id),id:id()}]});setCommandPreview([]);setSourceId(null);setSelected(null);setMessage('Décalage créé — sélectionnez un objet · Entrée ou Échap pour quitter.');return;}
   if(!commandPoints.length){setCommandPoints([p]);setMessage((tool==='copy'||tool==='move')?'Indiquez la direction, saisissez la distance puis Entrée, ou cliquez le second point.':tool==='scale'?'SCALE · Spécifiez le facteur d’échelle ou R — Référence.':tool==='rotate'?'Saisissez l’angle puis Entrée, ou indiquez la direction et cliquez.':'Cliquez le second point');return;}
   if(tool==='scale'){if(scaleReference)receiveScaleReference(scaleReferencePoint(scaleReference,commandPoints[0],p));else confirmScale(p);return;}
   const base=commandPoints[0],end=tool==='rotate'?p:(tool==='copy'||tool==='move')?translationEndpoint(base,p,lengthText,unit,effectiveOrtho,effectivePolar,pointerSnap.current):constrain(base,p);
   if(tool==='copy'||tool==='move'){const next=translateItem(source,end.x-base.x,end.y-base.y);if(tool==='copy'){canDraw();if(distance(base,end)<.001)throw new Error('Choisissez deux points distincts.');commit(copySelection(doc,selectedIds.length?selectedIds:[source.id],base,end,id));setLengthText('');setCommandPreview([]);setMessage('Copie créée — indiquez un autre déplacement depuis le même point de base · Échap pour terminer.');return;}else{if(distance(base,end)<.001)throw new Error('Choisissez deux points distincts.');commit(moveSelectionObjects(doc,selectedIds.length?selectedIds:[source.id],base,end));chooseTool('select');setMessage('Déplacement appliqué.');return;}}
   if(tool==='rotate'){confirmRotation(p);return;}
   if(tool==='mirror'){const next=mirrorShape(source,base,end);if(settings.keepOriginal){canDraw();commit({...doc,shapes:[...doc.shapes,{...onLayer(next,layer.id),id:id()}]});}else replaceModel(source,[next]);}
   setCommandPoints([]);setCommandPreview([]);setMessage('Transformation appliquée');
 });
 const repeatHistory=repeatableHistory(toolHistory,paper,commandTools);
 const repeatIdle=!references.active&&!blockFlow&&tool==='select'&&!pendingPaste&&!pendingCopyBase&&!selectionDrag.current&&!gesture.current&&!zoomMode&&!radiusEditor&&!hatchOriginTarget&&!draft&&!commandPoints.length&&!pathNodes.length&&!choosingBoundaries;
 const repeatLastTool=()=>{if(lastBlockCommand&&!blockEditor&&!layout){runBlockAction(lastBlockCommand);return;}const last=repeatHistory[0];if(last)chooseTool(last);else setMessage('Aucune commande à répéter');};
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.isComposing||e.keyCode===229)return;if(e.defaultPrevented||document.querySelector('dialog[open]')||configuration)return;
   if((e.ctrlKey||e.metaKey)&&e.code==='Space'){e.preventDefault();setPaletteOpen(true);setCommandIndex(0);commandAnchor.current?.querySelector('input')?.focus();return;}
   const target=e.target as HTMLElement;
   if(references.active&&(target===document.body||svg.current?.contains(target))&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
    if(e.key==='Escape'){e.preventDefault();cancelTool();return;}
    if(e.key==='Enter'){e.preventDefault();executeCommand();return;}
    if(e.key==='Backspace'){e.preventDefault();setCommandText(t=>t.slice(0,-1));return;}
    if(/^[a-zA-Z0-9;.,+\-]$/.test(e.key)){e.preventDefault();setCommandText(t=>t+e.key);return;}
   }
   if(e.repeat&&(e.key==='Enter'||e.key===' ')&&(target===document.body||svg.current?.contains(target))){e.preventDefault();return;}
   const commandInput=target.matches('#'+CSS.escape(scope+'-command'));
   const repeatSurface=target===document.body||!!svg.current?.contains(target)||commandInput;
   if(repeatSurface&&repeatIdle&&!commandText&&!lengthText&&!paletteOpen&&!contextPosition&&isRepeatKey(e,bindings)){
     e.preventDefault();if(!e.repeat)repeatLastTool();return;
   }
   if(tool==='scale'&&source&&commandPoints.length&&(target===document.body||svg.current?.contains(target))&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
     if(e.key==='Enter'||e.key===' '){e.preventDefault();scaleCommand();return;}
     if(e.key==='Escape'){e.preventDefault();cancelTool();return;}
     if(e.key==='Backspace'){e.preventDefault();if(commandText)setCommandText(v=>v.slice(0,-1));else setSettings(v=>({...v,scaleFactor:v.scaleFactor.slice(0,-1)}));return;}
     if(/^[a-zA-Z0-9.,+\-]$/.test(e.key)){e.preventDefault();setCommandText(v=>v+e.key);return;}
   }
   if(tool==='rotate'&&source&&commandPoints.length&&(e.target===document.body||svg.current?.contains(target))&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
     if(e.key==='Enter'){e.preventDefault();confirmRotation();return;}
     if(/^[0-9.,+-]$/.test(e.key)){e.preventDefault();setSettings(v=>({...v,rotation:v.rotation+e.key}));return;}
   }
   if((e.key==='Enter'||e.key===' ')&&target.closest('button,a,summary,[role="button"],[role="menu"]'))return;
   const textTarget=(e.target as HTMLElement).closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])');
   if(textTarget&&!(commandInput&&repeatIdle&&!commandText&&!paletteOpen&&(e.key==='Enter'||e.key===' '))){
     const mode=['ortho','grid','gridSnap','osnap','polar'].find(id=>bindings[id]?.includes(chord(e)));if(mode&&(textTarget===lengthInput.current||((mode==='grid'||mode==='gridSnap'||mode==='osnap'||mode==='polar')&&textTarget.matches('#'+CSS.escape(scope+'-command'))))){e.preventDefault();if(!e.repeat){if(mode==='ortho')toggleOrtho();else if(mode==='grid')toggleGrid();else if(mode==='gridSnap')toggleGridSnap();else if(mode==='osnap')toggleOsnap();else togglePolar();}return;}
     if(e.key==='Escape'){e.preventDefault();if(!e.repeat)cancelTool();(e.target as HTMLElement).blur();}return;
   }
   if((e.target as HTMLElement).closest('[role="menu"]'))return;
   if(e.key==='Tab'&&!e.shiftKey&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&(e.target===document.body||svg.current?.contains(e.target as Element))){
     e.preventDefault();
     if(tool==='offset'&&!offsetReady)offsetInput.current?.focus();
     else if(tool==='rect'&&draft?.type==='rect')rectWidthInput.current?.focus();
     else if(tool==='rotate'&&commandPoints.length)rotationInput.current?.focus();
     else if(dynamicStart)lengthInput.current?.focus();
     else if(radiusEditor)radiusInput.current?.focus();
     else if(tool==='select'&&!zoomMode&&!pendingPaste&&!pendingCopyBase&&!gesture.current&&!selectionDrag.current)commandAnchor.current?.querySelector('input')?.focus();
     return;
   }
   const clipAction=Object.keys(bindings).find(id=>bindings[id].includes(chord(e)));
   if(['copyClip','cutClip','pasteClip','copyBase'].includes(clipAction||'')){
     const native:Record<string,string>={copyClip:'Ctrl+C',cutClip:'Ctrl+X',pasteClip:'Ctrl+V'};
     if(chord(e)===native[clipAction!])return;
     e.preventDefault();if(!e.repeat)void runClipboardAction(clipAction!);return;
   }
   if(pendingCopyBase&&e.key!=='Escape'){e.preventDefault();return;}
   if(zoomMode&&!e.ctrlKey&&!e.metaKey&&!e.altKey){if(e.key==='Escape'){e.preventDefault();cancelTool();return;}if(e.key==='Enter'){e.preventDefault();executeCommand();return;}if(e.key==='Backspace'){e.preventDefault();setCommandText(t=>t.slice(0,-1));return;}if(/^[a-zA-Z0-9.,+\-]$/.test(e.key)){e.preventDefault();setCommandText(t=>t+e.key.toUpperCase());return;}}

   if(!e.ctrlKey&&!e.metaKey&&!e.altKey){
     if(tool==='rect'&&draft?.type==='rect'){
       if(e.key==='Enter'){e.preventDefault();executeCommand();return;}
       if(e.key==='Backspace'){e.preventDefault();setCommandText(t=>t.slice(0,-1));return;}
       if(/^[a-zA-Z0-9@;.,+\-]$/.test(e.key)){e.preventDefault();setCommandText(t=>t+e.key);return;}
     }
     if(tool==='line'&&draftRef.current?.type==='line'&&!lengthText&&!commandText&&/^[CU]$/i.test(e.key)){e.preventDefault();if(!e.repeat){setCommandText(e.key.toUpperCase());setCommandIndex(0);}return;}
     if(tool==='polyline'&&pathNodes.length&&!lengthText&&!commandText&&e.key.toUpperCase()==='C'){e.preventDefault();if(!e.repeat){setCommandText('C');setCommandIndex(0);setMessage('Fermer la polyligne · Entrée pour confirmer');}return;}
     if(dynamicStart&&(lengthText||/^[0-9.,]$/.test(e.key))){
       if(e.key==='Enter'||e.key===' '){e.preventDefault();confirmLength();return;}
       if(e.key==='Escape'){e.preventDefault();cancelTool();return;}
       if(e.key==='Backspace'){e.preventDefault();setLengthText(t=>t.slice(0,-1));return;}
       if(/^[0-9.,a-zA-Z+-]$/.test(e.key)){e.preventDefault();setLengthText(t=>t+e.key);return;}
     }
     if(commandText||paletteOpen){
       if(e.key==='Enter'||e.key===' '){e.preventDefault();executeCommand();return;}
       if(e.key==='Escape'){e.preventDefault();cancelTool();return;}
       if(e.key==='Backspace'){e.preventDefault();setCommandText(t=>t.slice(0,-1));setCommandIndex(0);return;}
       if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setCommandIndex(i=>(i+(e.key==='ArrowDown'?1:-1)+suggestions.length)%Math.max(1,suggestions.length));return;}
     }
     if(/^[a-zA-Z]$/.test(e.key)){e.preventDefault();setCommandText(t=>t+e.key.toUpperCase());setCommandIndex(0);return;}
   }
   if(e.key===' '&&!commandText&&!lengthText&&(tool==='polyline'||tool==='bezier')){e.preventDefault();finishPath();return;}
   if(blockFlow&&(e.key==='Enter'||e.key===' ')){e.preventDefault();executeCommand();return;}
   const action=Object.keys(bindings).find(id=>bindings[id].includes(chord(e)));if(!action)return;
   if(action==='osnap'||action==='polar'){e.preventDefault();if(!e.repeat){if(action==='osnap')toggleOsnap();else togglePolar();}return;}
   if(action==='grid'||action==='gridSnap'){e.preventDefault();if(!e.repeat){if(action==='grid')toggleGrid();else toggleGridSnap();}return;}
   if(pendingPaste&&action!=='escape'){if(action==='undo'){e.preventDefault();clear();}return;}
   if((blockCommands as readonly string[]).includes(action)){e.preventDefault();runBlockAction(action);return;}
   if(action==='all'){if(tool==='join'){e.preventDefault();selectSingle(null);setSelectedIds((paper?items:visible).map(s=>s.id));return;}if(paper)return;e.preventDefault();const flow=blockFlow;clear();setBlockFlow(flow);setTool('select');setSelectedIds(items.map(s=>s.id));setMessage(`${items.length} objet(s) sélectionné(s) — ${shortcut('delete')} pour effacer`);return;}
   if(action==='ortho'){e.preventDefault();if(!e.repeat)toggleOrtho();return;}
   if(action==='finish'){if(tool==='join'){e.preventDefault();finishJoin();return;}if(tool==='line'){e.preventDefault();cancelTool();return;}if(tool==='hatch'){e.preventDefault();finishHatches();return;}if(tool==='offset'){e.preventDefault();cancelTool();return;}if(tool==='linearDimension'&&!commandPoints.length){e.preventDefault();setLinearSelectObject(true);setMessage('Cliquez le côté à coter.');}else if(choosingBoundaries){e.preventDefault();chooseBoundaries('finish');}else if(tool==='polyline'||tool==='bezier'){e.preventDefault();finishPath();}else if(tool==='trim'){e.preventDefault();cancelTool();}return;}
   if(action==='escape'){e.preventDefault();if(trimDrag.current){resetTrim();setCommandPreview([]);setMessage('Balayage annulé — cliquez ou balayez un morceau.');return;}cancelTool();return;}
   if(action==='delete'){e.preventDefault();remove();return;}
   if(['undo','redo','new','open','save','dxf','pdf','pdfAll','help'].includes(action)){e.preventDefault();runAction(action==='save'?'quickSave':action);return;}
   const t=action as Tool;if(paper?t==='join'||isPaperDimensionTool(t)||!commandTools.includes(t):t!=='viewport'){e.preventDefault();chooseTool(t);}
 };window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);});
 const clipboardSelection=()=>doc.shapes.filter(s=>(selectedIds.length?selectedIds:selected?[selected]:[]).includes(s.id));
 const preparePaste=(text:string)=>{if(paper)throw new Error('Activez l’espace Objet pour coller.');const data=decodeClipboard(text);clear();setTool('select');setPendingPaste(data);setMessage(data.drawing.shapes.length+' objet(s) à coller — cliquez le point d’insertion · Échap pour annuler');};
 const copyText=(cut=false)=>{if(paper)throw new Error('Activez l’espace Objet pour copier ou couper.');const shapes=clipboardSelection();if(cut&&shapes.some(s=>lockedShape(doc,s)))throw new Error('Impossible de couper des objets sur un calque verrouillé.');return {shapes,text:encodeClipboard(doc,shapes)};};
 const finishCopy=(shapes:Shape[],cut=false)=>{if(cut){const ids=new Set(shapes.map(s=>s.id));commit({...doc,shapes:doc.shapes.filter(s=>!ids.has(s.id))});clear();}setMessage(shapes.length+' objet(s) '+(cut?'coupé(s)':'copié(s)')+' — '+shortcut('pasteClip')+' pour coller');};
 const runClipboardAction=async(action:string)=>{try{if(action==='copyBase'){const {shapes}=copyText();clear();setTool('select');setPendingCopyBase({drawing:doc,shapes});setMessage('Copier avec point de base — cliquez le point de référence · Échap pour annuler');return;}if(action==='pasteClip'){preparePaste(await navigator.clipboard.readText());return;}const cut=action==='cutClip',{shapes,text}=copyText(cut);await navigator.clipboard.writeText(text);if(cut&&currentDoc.current!==doc)throw new Error("Objets copiés ; coupe annulée car le dessin a changé.");finishCopy(shapes,cut);}catch(err){reportError((err as Error).message);}};
 useEffect(()=>{
 const blocked=(e:ClipboardEvent)=>configuration||!!document.querySelector('dialog[open]')||!!(e.target as HTMLElement)?.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])');
 const copy=(e:ClipboardEvent)=>{if(blocked(e))return;try{const cut=e.type==='cut',{shapes,text}=copyText(cut);if(!e.clipboardData)throw new Error('Presse-papiers indisponible.');e.clipboardData.setData('text/plain',text);e.preventDefault();finishCopy(shapes,cut);}catch(err){e.preventDefault();reportError((err as Error).message);}};
 const paste=(e:ClipboardEvent)=>{if(blocked(e))return;const text=e.clipboardData?.getData('text/plain')||'';if(!text.includes('jlg-cad-clipboard'))return;e.preventDefault();safe(()=>preparePaste(text));};
 window.addEventListener('copy',copy);window.addEventListener('cut',copy);window.addEventListener('paste',paste);return()=>{window.removeEventListener('copy',copy);window.removeEventListener('cut',copy);window.removeEventListener('paste',paste);};
 }); const screen=(e:{clientX:number;clientY:number})=>{const r=svg.current!.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};};
 const sheetPoint=(p:Point)=>({x:(p.x-view.x)/view.scale,y:(p.y-view.y)/view.scale});
 const alignmentPoint=(raw:Point):Point|null=>{
  if(!settings.osnap||!osnapKinds.includes('Alignement des cotations')||lengthText.trim()||zoomMode||gesture.current?.pan){resetAlignment();return null;}
  let target:import('./model').Dimension|null=null,correction:Point|undefined;
  const g=gesture.current;
  try{
   if(g?.original?.type==='dimension'&&g.grip==='placement-0'){
    target=g.original;
    const line=dimensionLine(target);if(line)correction=sub(dimensionGeometry(target).label,line.a);
   }else if(!g?.original&&['dimension','linearDimension','alignedDimension'].includes(tool)){
    if(paper&&layout&&paperDimensionSession){
     const v=dimensionViewport(layout,raw,paperDimensionSession);
     if(v)target=paperDimensionPreview(tool as 'dimension'|'linearDimension'|'alignedDimension',paperDimensionSession,v,raw,baseShape(),paperDimensionSettings());
    }else if(!paper&&commandPoints.length===2){
     target=tool==='dimension'?{...baseShape(),type:'dimension',a:commandPoints[0],b:commandPoints[1],offset:0,height:diameterTextHeight()}:dimensionAt(raw);
    }
   }
  }catch{/* Incomplete settings do not acquire an alignment reference. */}
  if(!target||!dimensionLine(target)){resetAlignment();return null;}
  const candidates=paper?layout!.items.filter(s=>s.type==='dimension'&&!s.paperHidden&&doc.layers.find(l=>l.id===(s.layerId||'0'))?.visible!==false):visible;
  return alignment.resolve(raw,target,candidates,gridScale,correction);
 };
 const world=(p:Point,magnet=true)=>{pointerSnap.current=false;const p0=sheetPoint(p),w=viewport?paperToModel(p0,viewport):p0;if(magnet){const aligned=alignmentPoint(w);if(aligned){pointerSnap.current=true;return aligned;}}if(paper&&isPaperDimensionTool(tool)&&layout&&settings.osnap&&magnet){const hit=paperDimensionSnap(layout,visible,p0,8/view.scale,paperDimensionSession,osnapKinds);if(hit){pointerSnap.current=true;return hit.point;}}if(!paper&&settings.osnap&&magnet){const hit=snapPoint(w,visible.filter(s=>s.id!==gesture.current?.original?.id),8/(view.scale/(viewport?.denominator||1)),osnapKinds)||referenceSnap(doc,w,8/(view.scale/(viewport?.denominator||1)),osnapKinds,gesture.current?.original?.id);if(hit){pointerSnap.current=true;return hit.point;}}return snap&&magnet?gridSnap(w,activeGrid,gridScale):w;};
 const inViewport=(p:Point)=>{if(!viewport)return true;const r=bounds(viewport),w=sheetPoint(p);return w.x>=r.x&&w.x<=r.x+r.width&&w.y>=r.y&&w.y<=r.y+r.height;};
 const gripPreview=(g:Gesture,p:Point):PaperItem=>{
  const original=g.original!,key=g.grip!,fixed=gripLengthOrigin(original,key);
  const origin=fixed||objectGrips(original).find(h=>h.key===key)!.point;
  const end=fixed&&lengthText?lineEndpoint(fixed,p,`${parseLength(lengthText)/gripLengthFactor(original,key)} mm`,'mm',effectiveOrtho,effectivePolar):constrain(origin,p);
  return moveGrip(original,key,end);
 };
 const finishGrip=(p:Point)=>safe(()=>{
  const g=gesture.current;if(!g?.original||!g.grip)return;
  if(!editable(g.original))throw new Error('Le calque est verrouillé.');
  const next=gripPreview(g,p);
  if(next.type==='line'&&distance(next.a,next.b)<.001)throw new Error('Choisissez deux points distincts.');
  put(items.map(item=>item.id===next.id?next:item));gesture.current=null;resetAlignment();setPreview(null);setLengthText('');setCommandText('');setSelected(next.id);setMessage('Objet modifié.');
 });
 const down=(e:React.PointerEvent<SVGSVGElement>)=>{
 if(e.button===2){e.preventDefault();resetTrim();setCommandPreview([]);return;}if(trimDrag.current)return;setContextPosition(null);
   // Drawing gestures must not start the browser's text selection or native drag.
   if(e.button===0||e.button===1)e.preventDefault();
   if(e.button===0&&tool==='offset'&&!offsetReady){e.preventDefault();offsetInput.current?.focus({preventScroll:true});return;}
   if(selectionDrag.current){if(e.button===0&&selectionDrag.current.phase==='rectangle')finishSelection(screen(e));return;}
   if(e.button!==0&&e.button!==1)return;e.currentTarget.focus({preventScroll:true});setRadiusEditor(null);const p=screen(e),w=world(p,!['hatch','offset','trim','extend','join','fillet'].includes(tool));if(viewport&&!inViewport(p))return;
   if(e.button===0&&references.click(w))return;
   if(blockFlow?.kind==='base'&&e.button===0){safe(()=>{commit(createBlock(doc,blockFlow.ids,blockFlow.name,w,id,blockFlow.replace));clear();setMessage('Bloc créé. INSERT / INSERER pour le réutiliser.');});return;}
   if(blockFlow?.kind==='insert'&&e.button===0){safe(()=>{commit(insertBlock(doc,blockFlow.definitionId,w,blockFlow.scale,blockFlow.angle,id,currentLayer));clear();setMessage('Bloc inséré.');});return;}
   if(gesture.current?.grip){if(e.button===0)finishGrip(w);return;}
   if(pendingCopyBase&&e.button===0){const data=pendingCopyBase;setPendingCopyBase(null);void navigator.clipboard.writeText(encodeClipboard(data.drawing,data.shapes,w)).then(()=>setMessage(data.shapes.length+' objet(s) copié(s) avec point de base')).catch(err=>setMessage(err.message));return;}
   if(pendingPaste&&e.button===0){safe(()=>{const next=pasteClipboard(doc,pendingPaste,w,id);const ids=next.shapes.slice(doc.shapes.length).map(s=>s.id);commit(next);clear();setSelectedIds(ids);setMessage(ids.length+' objet(s) collé(s)');});return;}
   if(e.button===1){e.preventDefault();const previous=middleClick.current;middleClick.current={time:performance.now(),point:p};if(previous&&performance.now()-previous.time<350&&distance(previous.point,p)<6){middleClick.current=null;gesture.current=null;navigationPointer.current=true;fit();return;}}
   if(zoomMode&&e.button===0){navigationPointer.current=true;if(zoomMode==='window'){const f=navigationFrame(),v=navigationView(),point={x:(p.x-f.x-v.x)/v.scale,y:(p.y-f.y-v.y)/v.scale};if(!zoomStart){setZoomStart(point);setZoomPointer(point);}else{const box=windowBox(zoomStart,point);if(box.width<.001||box.height<.001){setMessage('Choisissez une fenêtre de largeur et hauteur non nulles.');return;}applyNavigation(fitBoxes([box],f.width,f.height));setZoomMode(null);setZoomStart(null);setZoomPointer(null);}}return;}
   lastPointer.current=e;setCursor(w);setPointerScreen(p);
   svg.current!.setPointerCapture(e.pointerId);
   if(tool==='pan'||e.button===1){if(viewport?.locked){setMessage('Fenêtre verrouillée : déverrouillez son cadrage dans les propriétés.');return;}viewHistory.current[navigationKey]=rememberView(viewHistory.current[navigationKey]||[],navigationView());gesture.current={start:w,screen:p,pan:navigationView()};return;}
   const target=e.target as Element;
   if(hatchOriginTarget&&e.button===0){const shape=items.find(s=>s.id===hatchOriginTarget);if(shape?.type==='hatch')safe(()=>{editHatchStyle(shape,{...shape,origin:w});setHatchOriginTarget(null);setMessage('Origine de hachure placée.');});return;}
   if(tool==='hatch'){
    if(hatchOriginMode){updateHatchStyle({...hatchStyle,origin:w});setHatchOriginMode(false);return;}
    if(hatchMode==='pick')confirmHatch(w);
    else{const targetId=target.closest('[data-id]')?.getAttribute('data-id'),hit=hatchEligible.find(s=>s.id===targetId)||hatchEligible.map(s=>({s,d:distance(nearestPart(s,w).point,w)})).filter(v=>v.d<8/(view.scale/(viewport?.denominator||1))).sort((a,b)=>a.d-b.d)[0]?.s;if(hit&&boundaryShape(hit)){setHatchObjectIds(ids=>ids.includes(hit.id)?ids.filter(id=>id!==hit.id):[...ids,hit.id]);setHatchGaps([]);setMessage('Choisissez les limites et les îlots, puis Entrée pour créer.');}}
    return;
   }
   if(tool==='join'){
    gesture.current=null;const targetId=target.closest('[data-id]')?.getAttribute('data-id');
    const hit=items.find(s=>s.id===targetId);
    const previous=selectedIds.length?selectedIds:selected?[selected]:[];
    if(hit){selectSingle(null);setSelectedIds(combineSelection(previous,[hit.id],e.shiftKey));setMessage('Sélection JOINDRE · Entrée pour valider · Maj+clic pour retirer un objet.');}
    else{selectionDrag.current=startSelection(p,previous,e.shiftKey);setSelectionOutline([]);}
    return;
   }
   if(!paper&&tool==='trim'&&!choosingBoundaries){trimDrag.current={start:p,points:[p],target,origin:w,dragging:false};setCommandPreview([]);return;}
   if(paper&&isPaperDimensionTool(tool)){gesture.current=null;paperDimensionClick(w);return;}
   if(!paper&&commandTools.includes(tool)){commandClick(target,w);return;}
   if(tool==='select'){const itemId=target.closest('[data-id]')?.getAttribute('data-id')||null;
   if(!itemId){const previous=selectedIds.length?selectedIds:selected?[selected]:[];selectionDrag.current=startSelection(p,previous,e.shiftKey);setSelectionOutline([]);gesture.current=null;setMessage('Maintenez et glissez pour le lasso, ou relâchez puis cliquez le second coin.');return;}const gripKey=target.closest('[data-grip]')?.getAttribute('data-grip')||null;if(e.shiftKey&&itemId){const ids=selectedIds.length?selectedIds:selected?[selected]:[];setSelectedIds(combineSelection(ids,[itemId],true));selectSingle(null);gesture.current=null;return;}if(!gripKey){const ids=selectedIds.length?selectedIds:selected?[selected]:[];selectSingle(itemId);setSelectedIds(combineSelection(ids,[itemId],false));}else selectSingle(itemId);const original=items.find(s=>s.id===itemId);if(original&&!editable(original)){setMessage('Objet sur un calque verrouillé — édition désactivée');gesture.current=null;return;}if(original?.type==='circle'&&!e.shiftKey&&gripKey?.startsWith('radius-')){svg.current!.releasePointerCapture(e.pointerId);setSelected(itemId);gesture.current=null;const radiusUnit=paper?'mm':unit;setRadiusEditor({id:itemId,point:p,text:displayDistance(distance(original.a,original.b),radiusUnit),unit:radiusUnit});setMessage('Nouveau rayon — Entrée pour valider, Échap pour annuler.');return;}const node=target.getAttribute('data-node');if(gripKey?.startsWith('vertex-')&&(original?.type==='polyline'||original?.type==='bezier'))setNodeIndex(Number(gripKey.split('-')[1]));if(node!==null)setNodeIndex(Number(node));gesture.current=original?{start:w,screen:p,original,grip:gripKey||undefined,resize:target.hasAttribute('data-resize'),node:node!==null?Number(node):undefined,handle:target.getAttribute('data-handle') as Gesture['handle']||'point'}:null;if(gripKey&&original){setLengthText('');setCommandText('');setCursor(objectGrips(original).find(h=>h.key===gripKey)!.point);setPreview(original);setMessage(original.type==='polyline'&&gripKey.startsWith('segment-')?'Cliquez la nouvelle position ou saisissez la distance de déplacement · Entrée valide · Échap annule.':original.type==='polyline'&&gripKey.startsWith('vertex-')?(gripKey==='vertex-0'&&!original.closed?'Longueur du segment suivant · Cliquez la nouvelle position ou saisissez la longueur · Échap annule.':'Longueur du segment précédent · Cliquez la nouvelle position ou saisissez la longueur · Échap annule.'):gripLengthOrigin(original,gripKey)?'Cliquez la nouvelle position ou indiquez la direction et saisissez la nouvelle longueur · Entrée valide · Échap annule.':'Cliquez la nouvelle position · Échap annule.');}return;}
   if(tool==='text'){safe(()=>{canDraw();const text:PaperItem={id:id(),type:'text',a:w,b:w,color,colorByLayer:true,layerId:layer.id,text:'Texte',height:3};put([...items,text]);setSelected(text.id);setTool('select');});return;}
   if(!paper&&tool==='viewport')return;
   if(tool==='circle'){safe(()=>{canDraw();const current=draftRef.current;if(current?.type==='circle'){const end=lengthText?radiusEndpoint(current.a,lengthText,paper?'mm':unit):w;if(distance(current.a,end)<=0)throw new Error('Le rayon doit être positif.');put([...items,{...current,b:end}]);chooseTool('select');setMessage('Cercle créé.');}else{setPreview({id:id(),type:'circle',a:w,b:w,color,colorByLayer:true,layerId:layer.id});setMessage('Saisissez le rayon puis Entrée, ou cliquez un point du cercle.');}});return;}
   if(tool==='line'){gesture.current=null;safe(()=>{canDraw();const current=draftRef.current;if(current?.type==='line'){const end=lengthText?lineEndpoint(current.a,w,lengthText,paper?'mm':unit,effectiveOrtho,effectivePolar,settings.angle):constrain(current.a,w,paper?'':settings.length,paper?'':settings.angle);if(distance(current.a,end)<.001)throw new Error('Choisissez deux points distincts.');addLineSegment(end);}else{svg.current!.releasePointerCapture(e.pointerId);gesture.current=null;setPreview({id:id(),type:'line',a:w,b:w,color,colorByLayer:true,layerId:layer.id});setMessage('Indiquez la direction, saisissez la longueur puis Entrée.');}});return;}
   if(tool==='rect'){setCursor(w);safe(()=>{canDraw();const current=draftRef.current;if(current?.type==='rect'){finishRectangle(rectangleEndpoint(current.a,w,rectWidth,rectHeight,paper?'mm':unit));}else{gesture.current=null;setPreview({...baseShape(),type:'rect',a:w,b:w});setMessage('Largeur · Tab pour la hauteur · Entrée pour valider, ou cliquez le second coin.');}});return;}
   safe(()=>{canDraw();if(!['rect','viewport'].includes(tool))return;const b=w;
   const next:PaperItem=tool==='viewport'?{id:id(),type:'viewport',a:w,b:w,color:'#17242a',colorByLayer:true,layerId:layer.id,center:{x:400,y:285},denominator:10,locked:false,printBorder:false}:{id:id(),type:tool as 'line'|'rect'|'circle',a:w,b,color,colorByLayer:true,layerId:layer.id};
   setPreview(next);gesture.current={start:w,screen:p};});
 };
 const updateTrim=(points:Point[])=>{
  setTrimTrail([...points]);
  const path=points.map(p=>world(p,false));
  const eligible=visible.filter(s=>!lockedShape(doc,s));
  const box=viewport?{x:viewport.center.x-Math.abs(viewport.b.x-viewport.a.x)*viewport.denominator/2,y:viewport.center.y-Math.abs(viewport.b.y-viewport.a.y)*viewport.denominator/2,width:Math.abs(viewport.b.x-viewport.a.x)*viewport.denominator,height:Math.abs(viewport.b.y-viewport.a.y)*viewport.denominator}:null;
  const edges=box?path.slice(1).map((p,i)=>clipTrimEdge(path[i],p,box)).filter(edge=>edge.length===2):undefined;
  const next=trimSweep(eligible,boundaries,path,edges);setTrimResults(next);return next;
 };
 const move=(e:React.PointerEvent<SVGSVGElement>)=>{
  if(references.active&&!gesture.current?.pan){const p=screen(e),w=world(p);setPointerScreen(p);setCursor(w);references.move(w);return;}
   lastPointer.current=e;setPointerScreen(screen(e));
   const drag=trimDrag.current;
   if(drag){const p=screen(e);setCursor(world(p,false));if(!drag.dragging&&isTrimDrag(drag.start,p))drag.dragging=true;
    if(drag.dragging&&distance(drag.points.at(-1)!,p)>=1){drag.points.push(p);updateTrim(drag.points);}return;}
   const selection=selectionDrag.current;
   if(selection){moveSelection(selection,screen(e),selectionPreferences.lasso);setSelectionOutline([...selection.points]);return;}
   const p=screen(e),g=gesture.current,w=world(p,(g?.node===undefined||g.handle==='point')&&!['hatch','offset','trim','extend','join','fillet'].includes(tool));setCursor(w);
   const raw=viewport?paperToModel(sheetPoint(p),viewport):sheetPoint(p);setSnapHit(alignment.hit.current?{point:alignment.hit.current,kind:'Alignement des cotations'}:paper&&isPaperDimensionTool(tool)&&layout&&settings.osnap?paperDimensionSnap(layout,visible,raw,8/view.scale,paperDimensionSession,osnapKinds):!paper&&tool!=='trim'&&(tool!=='hatch'||hatchOriginMode)&&settings.osnap?(snapPoint(raw,visible.filter(s=>s.id!==g?.original?.id),8/(view.scale/(viewport?.denominator||1)),osnapKinds)||referenceSnap(doc,raw,8/(view.scale/(viewport?.denominator||1)),osnapKinds,g?.original?.id)):null);
   if(zoomMode&&!g){if(zoomMode==='window'&&zoomStart){const f=navigationFrame(),v=navigationView();setZoomPointer({x:(p.x-f.x-v.x)/v.scale,y:(p.y-f.y-v.y)/v.scale});}return;}
   if(!g){
     if(tool==='rect'&&draftRef.current?.type==='rect'){
       const current=draftRef.current;
       try{setPreview({...current,b:rectangleEndpoint(current.a,w,rectWidth,rectHeight,paper?'mm':unit)});}
       catch{setPreview({...current,b:w});}
       return;
     }
     if(tool==='arc'){if(commandPoints.length===1)setCommandPreview([{...baseShape(),type:'line',a:commandPoints[0],b:w}]);else if(commandPoints.length===2){try{setCommandPreview([threePointArc(commandPoints[0],commandPoints[1],w,baseShape())]);}catch{setCommandPreview([]);}}}
     if(tool==='circle'&&draftRef.current?.type==='circle')safe(()=>setPreview({...draftRef.current!,b:lengthText?radiusEndpoint(draftRef.current!.a,lengthText,paper?'mm':unit):w}));
     if(tool==='line'&&draftRef.current?.type==='line')safe(()=>setPreview({...draftRef.current!,b:lengthText?lineEndpoint(draftRef.current!.a,w,lengthText,paper?'mm':unit,effectiveOrtho,effectivePolar,settings.angle):constrain(draftRef.current!.a,w,paper?'':settings.length,paper?'':settings.angle)}));
     if(!paper&&['offset','trim','extend','copy','move','scale','rotate','mirror'].includes(tool)&&!choosingBoundaries){try{
       if(tool==='offset'&&offsetReady&&source&&!lockedShape(doc,source))setCommandPreview([offsetShape(source,parseLength(settings.distance),raw)]);
       else if(tool==='trim'||tool==='extend'){const hit=findObject(e.target as Element,raw);setCommandPreview(hit&&!lockedShape(doc,hit)?tool==='trim'?trimShape(hit,boundaries,raw,true):[extendShape(hit,boundaries,raw)]:[]);}
       else if(tool!=='scale'&&tool!=='rotate'&&source&&commandPoints.length){const base=commandPoints[0],end=(tool==='copy'||tool==='move')?translationEndpoint(base,w,lengthText,unit,effectiveOrtho,effectivePolar,pointerSnap.current):constrain(base,w);setCommandPreview((tool==='copy'||tool==='move')?doc.shapes.filter(s=>(selectedIds.length?selectedIds:[source.id]).includes(s.id)).map(s=>translateItem(s,end.x-base.x,end.y-base.y)):[tool==='mirror'?mirrorShape(source,base,end):translateItem(source,end.x-base.x,end.y-base.y)]);}
     }catch{setCommandPreview([]);}}return;
   }
   if(g.pan)applyNavigation({...g.pan,x:g.pan.x+p.x-g.screen.x,y:g.pan.y+p.y-g.screen.y},false);
   else if(g.viewport)setPreview({...g.viewport,center:{x:g.viewport.center.x-(p.x-g.screen.x)/view.scale*g.viewport.denominator,y:g.viewport.center.y-(p.y-g.screen.y)/view.scale*g.viewport.denominator}});
   else if(g.original){const original=g.original;safe(()=>{const origin=g.grip?objectGrips(original).find(h=>h.key===g.grip)!.point:g.node!==undefined&&(original.type==='polyline'||original.type==='bezier')?(g.handle==='in'||g.handle==='out'?original.nodes[g.node][g.handle]||original.nodes[g.node].p:original.nodes[g.node].p):g.resize?original.b:g.start;const end=g.resize&&original.type!=='line'?w:constrain(origin,w);setPreview(g.grip?gripPreview(g,w):g.node!==undefined&&(original.type==='polyline'||original.type==='bezier')?moveNode(original,g.node,end,g.handle):g.resize?{...original,b:end}:translate(original,end.x-g.start.x,end.y-g.start.y));});}
   else if(draftRef.current)safe(()=>setPreview({...draftRef.current!,b:tool==='line'?(lengthText?exactEndpoint(draftRef.current!.a,w,lengthText,paper?'mm':unit,effectiveOrtho,effectivePolar,settings.angle):constrain(draftRef.current!.a,w,paper?'':settings.length,paper?'':settings.angle)):w}));
 };
 useEffect(()=>{if(lastPointer.current)move(lastPointer.current);},[settings.ortho,effectivePolar,settings.osnap,osnapKinds,shiftHeld,lengthText,unit,snap,activeGrid.minimum,activeGrid.adaptive,gridScale]);
 useEffect(()=>{const down=(e:KeyboardEvent)=>{if(e.key==='Shift'&&!document.querySelector('dialog[open]')&&!(e.target as HTMLElement).closest('input,textarea,select,[contenteditable]'))setShiftHeld(true);};const up=(e:KeyboardEvent)=>{if(e.key==='Shift')setShiftHeld(false);};const blur=()=>{setShiftHeld(false);lastPointer.current=null;resetTrim();};window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);};},[]);
 const finishSelection=(end:Point)=>{
   const selection=selectionDrag.current;if(!selection)return;
   selectionDrag.current=null;setSelectionOutline([]);const start=selection.points[0],lasso=selection.phase==='lasso';
    if(distance(start,end)<4&&!lasso)return;
    const points=lasso?[...selection.points,...(distance(selection.points.at(-1)!,end)>1?[end]:[])]:rectangleSelection(start,end);
    if(lasso&&distance(points[0],points.at(-1)!)<3)points.pop();
    if(lasso&&!validLasso(points)){setSelectedIds(selection.previous);setMessage('Tracez un contour sans croisement et suffisamment large.');return;}
    const crossing=lasso?selection.crossing:end.x<start.x;
    if(!(crossing?selectionPreferences.green:selectionPreferences.blue)){setSelectedIds(selection.previous);setMessage((crossing?'Sélection verte':'Sélection bleue')+' désactivée dans Configuration.');return;}
    const polygon=points.map(p=>{const sheet=sheetPoint(p);return viewport?paperToModel(sheet,viewport):sheet;});
    const candidates=paper?items.filter(s=>s.type!=='reference'||referenceDisplayed(doc,s)):visible;
    const textElements=Array.from(svg.current!.querySelectorAll('text')).filter(t=>t.closest('[data-id]'));
    const canvasRect=svg.current!.getBoundingClientRect();
    const ids=candidates.filter(item=>{
     const text=textElements.find(t=>t.closest('[data-id]')?.getAttribute('data-id')===item.id&&(!viewport||t.closest('[data-viewport]')?.getAttribute('data-viewport')===viewport.id));
     if(!text)return itemInSelection(item,polygon,crossing);
     const box=text.getBBox(),matrix=text.getScreenCTM();if(!matrix)return itemInSelection(item,polygon,crossing);
     const corners=rectangleSelection({x:box.x,y:box.y},{x:box.x+box.width,y:box.y+box.height}).map(p=>{const screen=new DOMPoint(p.x,p.y).matrixTransform(matrix);const sheet=sheetPoint({x:screen.x-canvasRect.left,y:screen.y-canvasRect.top});return viewport?paperToModel(sheet,viewport):sheet;});
     const textBorder=corners.map((a,i)=>({kind:'line' as const,a,b:corners[(i+1)%4]}));
     return itemInSelection(item,polygon,crossing,item.type==='text'?textBorder:[...selectionSegments(item),...textBorder]);
    }).map(item=>item.id);
    selectSingle(null);setSelectedIds(combineSelection(selection.previous,ids,selection.remove));setMessage(ids.length+(selection.remove?' objet(s) retiré(s) — ':' objet(s) sélectionné(s) — ')+(crossing?'touchés ou contenus':'entièrement contenus'));return;
 };
 const up=(e:React.PointerEvent<SVGSVGElement>)=>{
 if(e.button!==0&&e.button!==1)return;
   const drag=trimDrag.current;
   if(drag&&e.button===0){
    const p=screen(e);if(isTrimDrag(drag.start,p))drag.dragging=true;
    if(drag.dragging){const results=updateTrim([...drag.points,p]);if(results?.length){const byId=new Map(results.map(r=>[r.sourceId,r.remaining]));commit({...doc,shapes:doc.shapes.flatMap(s=>byId.get(s.id)??[s])});setSelected(null);setMessage(results.length+' objet(s) ajusté(s) — cliquez ou balayez le suivant');}else setMessage('Aucun morceau à ajuster sur ce trajet.');}
    else commandClick(drag.target,drag.origin);
    resetTrim();setCommandPreview([]);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);return;
   }
   const selection=selectionDrag.current;
   if(selection){
    if(!releaseSelection(selection,screen(e),selectionPreferences.lasso)){setSelectionOutline([...selection.points]);setMessage('Cliquez le second coin · Maj retire · Échap annule');return;}
    finishSelection(screen(e));return;
   }
   if(navigationPointer.current){navigationPointer.current=false;return;}
   const s=draftRef.current,g=gesture.current;
   if(g?.grip)return;
   if(tool==='rect'&&s?.type==='rect'&&!g){rectWidthInput.current?.focus();return;}
   if((tool==='circle'&&s?.type==='circle'||tool==='line'&&s?.type==='line')&&!g)return;
   if(g?.pan){gesture.current=null;return;}
   if(tool==='line'&&s?.type==='line'&&!g?.original&&g&&distance(g.screen,screen(e))<4){gesture.current=null;return;}
   if(g?.pan){gesture.current=null;return;}
   if(s&&g?.viewport&&s.type==='viewport'){const v=navigationView(),f=navigationFrame();applyNavigation({...v,x:f.width/2-s.center.x*v.scale,y:f.height/2-s.center.y*v.scale},false);}
   else if(s&&constructedItem(s)){safe(()=>{put(g?.original?items.map(i=>i.id===s.id?s:i):[...items,s.type==='viewport'?fitViewport(s,visible):s]);if(!g?.original||!selectedIds.includes(s.id))setSelected(s.id);});}
   setPreview(null);setLengthText('');gesture.current=null;
 };
 const wheel=(e:React.WheelEvent)=>{if(gesture.current||selectionDrag.current||trimDrag.current)return;const p=screen(e);if(viewport&&(!inViewport(p)||viewport.locked))return;const f=navigationFrame(),now=performance.now();const current=navigationView();const factor=Math.exp(-Math.max(-1000,Math.min(1000,e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?navigationFrame().height:1)))*.001);const limited=viewport?Math.max(view.scale/10000,Math.min(view.scale/.01,current.scale*factor))/current.scale:factor;applyNavigation(zoomAt(current,{x:p.x-f.x,y:p.y-f.y},limited),now-wheelTime.current>250);wheelTime.current=now;};
 const doubleClick=(e:React.MouseEvent)=>{const blockId=(e.target as Element).closest('[data-id]')?.getAttribute('data-id');const point=world(screen(e),false);const block=doc.shapes.find(s=>s.id===blockId)||[...visible].reverse().find(s=>s.type==='block'&&(()=>{const hit=nearestPart(s,point);return hit&&distance(hit.point,point)<=8/view.scale;})());if(e.button===0&&tool==='select'&&!blockFlow&&block?.type==='block'){e.preventDefault();openBlockEditor(block.definitionId);return;}if(paper&&isPaperDimensionTool(tool)){e.preventDefault();return;}if(e.button===1){e.preventDefault();return;}if(zoomMode)return;
   if(!paper&&(tool==='polyline'||tool==='bezier')){finishPath();return;}
   if(!layout)return;
   const p=sheetPoint(screen(e));
   const vpId=(e.target as Element).closest('[data-viewport]')?.getAttribute('data-viewport') || [...layout.items].reverse().find(s=>{if(s.type!=='viewport')return false;const r=bounds(s);return p.x>=r.x&&p.x<=r.x+r.width&&p.y>=r.y&&p.y<=r.y+r.height;})?.id;
   clear();setTool('select');setViewportId(vpId||null);setMessage(vpId?'Objet dans la fenêtre — double-clic hors du cadre pour revenir au papier':'Espace papier');
 };
 const geometry=(s:PaperItem,options:Parameters<typeof geometryContent>[1]={}):React.ReactNode=><g key={s.id} opacity={1-appearance(s,doc.layers).transparency/100}>{geometryContent(s,options)}</g>;
 const geometryContent=(s:PaperItem,options:{model?:boolean;preview?:boolean;previewColor?:string;displayColor?:string;inert?:boolean;dimensionLabel?:string}={}):React.ReactNode=>{
   if(s.type==='dimension'&&s.paperHidden)return null;
   const chosen=(selected===s.id||selectedIds.includes(s.id)||boundaryIds.includes(s.id)||hatchObjectIds.includes(s.id))&&(!layout||paper||options.model);
   const appearanceOf=appearance(s,doc.layers);
   const objectColor=options.displayColor||appearanceOf.color;
   const displayColor=!layout&&/^#(?:fff|ffffff)$/i.test(objectColor)?'#d0d0d0':objectColor;
   const common={'data-id':(!layout||paper||viewport&&options.model)?s.id:undefined,stroke:options.preview?options.previewColor||'#d49a41':chosen?'#168bff':displayColor,strokeWidth:layout?appearanceOf.lineweight:Math.max(1,appearanceOf.lineweight*3.78),strokeDasharray:linePatterns[appearanceOf.linetype].join(' ')||undefined,vectorEffect:layout?undefined:'non-scaling-stroke' as const,fill:'none',style:{pointerEvents:options.preview||options.inert?'none' as const:'stroke' as const}};
   if(s.type==='reference')return <ReferenceGraphic key={s.id} shape={s} source={referenceSource(doc,s)||(references.flow?.source.id===s.sourceId?references.flow.source:undefined)} selected={chosen} inert={!!options.inert} preview={!!options.preview} scale={view.scale} grips={!!chosen&&tool==='select'&&!options.preview&&!options.inert&&editable(s)}/>;
   if(s.type==='text')return <text key={s.id} data-id={s.id} x={s.a.x} y={s.a.y} fill={chosen?'#299b88':displayColor} fontSize={s.height} fontFamily="Arial, sans-serif" transform={`rotate(${s.rotation||0} ${s.a.x} ${s.a.y})`} textAnchor={s.align==='center'?'middle':s.align==='right'?'end':'start'} dominantBaseline={s.vertical==='baseline'?'alphabetic':s.vertical==='middle'?'central':s.vertical==='bottom'?'text-after-edge':'text-before-edge'} style={{pointerEvents:options.inert?'none':'all'}}>{s.text.split('\n').map((line,i)=><tspan key={i} x={s.a.x} dy={i?s.height*1.2:textLineOffset(s)}>{line||' '}</tspan>)}</text>;
   if(s.type==='block')return <g key={s.id} data-id={s.id}>{s.entities.filter(child=>doc.layers.find(l=>l.id===(child.layerId||'0'))?.visible!==false).map(child=><g key={child.id}>{geometry({...child,id:s.id},{...options,inert:true,displayColor:chosen?'#168bff':options.displayColor})}</g>)}{!options.preview&&!options.inert&&<path data-id={s.id} d={svgPath(s)} stroke="transparent" strokeWidth={8/view.scale} fill="none" pointerEvents="stroke"/>}{chosen&&!options.preview&&!options.inert&&<rect data-id={s.id} data-grip="center-0" className="object-grip" x={s.a.x-4/view.scale} y={s.a.y-4/view.scale} width={8/view.scale} height={8/view.scale} strokeWidth={1/view.scale}/>}</g>;
   if(s.type==='viewport')return null;
   if(s.type==='hatch')return <HatchGraphic key={s.id} shape={s} color={common.stroke} selected={!!chosen} preview={!!options.preview} inert={!!options.inert} dataId={common['data-id']} strokeWidth={common.strokeWidth} vectorEffect={common.vectorEffect} gripSize={8/view.scale} onGrip={!!chosen&&tool==='select'&&!options.preview&&!options.inert&&editable(s)}/>;
   if(s.type==='dimension'){const d=dimensionGeometry(s,unit,options.dimensionLabel);return <g key={s.id} data-id={s.id} style={{pointerEvents:options.inert||options.preview?'none':'all'}}>{d.arrows.map((ps,i)=><polygon key={'arrow-'+i} points={ps.map(p=>`${p.x},${p.y}`).join(' ')} fill={common.stroke} stroke='none'/>)}{d.lines.map(([a,b],i)=><line key={i} {...common} x1={a.x} y1={a.y} x2={b.x} y2={b.y}/>)}<text x={d.label.x} y={d.label.y} transform={`rotate(${-d.angle} ${d.label.x} ${d.label.y})`} fill={common.stroke} fontFamily="Arial" fontSize={s.height} textAnchor="middle">{options.dimensionLabel||d.text}</text>{(s.circleId||s.points||!s.kind||s.kind==='linear')&&chosen&&tool==='select'&&!options.inert&&!options.preview&&editable(s)&&objectGrips(s).map(h=><rect key={h.key} data-id={s.id} data-grip={h.key} aria-label={t("Déplacer la cote")} className="object-grip" x={h.point.x-4/view.scale} y={h.point.y-4/view.scale} width={8/view.scale} height={8/view.scale} strokeWidth={1/view.scale} style={{pointerEvents:'all'}}/>)}</g>;}
   const r=bounds(s);
   const element=s.type==='line'?<line {...common} x1={s.a.x} y1={s.a.y} x2={s.b.x} y2={s.b.y}/>:s.type==='rect'?<rect {...common} x={r.x} y={r.y} width={r.width} height={r.height}/>:s.type==='arc'||s.type==='polyline'||s.type==='bezier'?<path {...common} d={svgPath(s)}/>:<circle {...common} cx={s.a.x} cy={s.a.y} r={r.width/2}/>;
   const showGrips=chosen&&tool==='select'&&!options.inert&&editable(s)&&(!options.preview||gesture.current?.original?.id===s.id);
   const gripSize=8/view.scale;
   // Keep the original hit target while drawing only the retained pieces and
   // a translucent version of the exact piece that the next click removes.
   const swept=tool==='trim'&&!options.preview&&!options.inert&&!paper&&trimResults.find(r=>r.sourceId===s.id);
   if(swept){const display=(part:Shape)=>options.model&&viewport?mapItem(part,p=>modelToPaper(p,viewport),1/viewport.denominator):part;
    return <g key={s.id}>{swept.remaining.map((part,i)=><g key={'keep'+i}>{geometry(display(part),{...options,preview:true,previewColor:common.stroke})}</g>)}{swept.removed.map((part,i)=><g key={'cut'+i} opacity=".35">{geometry(display(part),{...options,preview:true,previewColor:'#ff5050'})}</g>)}</g>;
   }
   const removed=tool==='trim'&&!options.preview&&!options.inert&&!paper&&commandPreview.find(p=>p.id===s.id);
   if(removed){
     const original=visible.find(p=>p.id===s.id);
     if(original){try{
       const remaining=trimShape(original,boundaries,cursor);
       const display=(part:Shape)=>options.model&&viewport?mapItem(part,p=>modelToPaper(p,viewport),1/viewport.denominator):part;
       return <g key={s.id}><g opacity="0">{element}{React.cloneElement(element,{stroke:'transparent',strokeWidth:7/view.scale,vectorEffect:undefined})}</g>{remaining.map((part,i)=><g key={i}>{geometry(display(part),{...options,preview:true,previewColor:common.stroke})}</g>)}<g opacity=".35" pointerEvents="none">{geometry(display(removed),{...options,preview:true,previewColor:common.stroke})}</g></g>;
     }catch{/* An invalid cut retains the unmodified object. */}}
   }
   return <g key={s.id} opacity={!paper&&lockedShape(doc,s as Shape)?.5:1}>{element}{!options.preview&&!options.inert&&React.cloneElement(element,{stroke:'transparent',strokeWidth:7/view.scale,vectorEffect:undefined})}{showGrips&&objectGrips(s).map(h=><rect key={h.key} data-id={s.id} data-grip={h.key} aria-label={t(h.kind==='segment'?'Déplacer le segment':h.kind==='radius'?'Modifier le rayon':h.kind==='center'?'Déplacer le centre':'Déplacer le sommet')} className={`object-grip ${gesture.current?.original?.id===s.id&&gesture.current.grip===h.key?'dragging':''}`} x={h.point.x-gripSize/2} y={h.point.y-(h.kind==='segment'&&s.type!=='line'?gripSize/4:gripSize/2)} width={gripSize} height={h.kind==='segment'&&s.type!=='line'?gripSize/2:gripSize} transform={h.angle!==undefined?`rotate(${h.angle} ${h.point.x} ${h.point.y})`:undefined} strokeWidth={1/view.scale} style={{pointerEvents:options.preview?'none':'all'}}><title>{h.kind==='segment'?'Déplacer le segment':'Modifier ce point'}</title></rect>)}{showGrips&&s.type==='bezier'&&s.nodes.map((n,i)=><g key={i}>{(['in','out'] as const).map(h=>n[h]&&<g key={h}><line x1={n.p.x} y1={n.p.y} x2={n[h]!.x} y2={n[h]!.y} stroke="#e6b776" strokeWidth={1/view.scale} pointerEvents="none"/><circle data-id={s.id} data-node={i} data-handle={h} cx={n[h]!.x} cy={n[h]!.y} r={4/view.scale} fill="#e6b776" style={{cursor:'move'}}/></g>)}</g>)}</g>;
 };
 const angularReferences=paper?paperDimensionSession?.angleSources||[]:dimensionLines;
 const angularReferenceViewport=paper?paperDimensionSession?.viewportId:viewport?.id;
 const behindHatches=<T extends PaperItem>(shapes:T[])=>orderDrawing(shapes.filter(s=>doc.layers.find(l=>l.id===(s.layerId||'0'))?.visible!==false&&(s.type!=='reference'||referenceDisplayed(doc,s))));
 const modelShapes=behindHatches(visible.filter(s=>s.id!==(viewport||!layout?draft?.id:null)));
 const blockPreview=blockFlow?.kind==='insert'?insertBlock({...doc,shapes:[]},blockFlow.definitionId,cursor,blockFlow.scale,blockFlow.angle,()=> 'block-preview').shapes:[];
 const extras:Shape[]=blockPreview.length?blockPreview:pendingPaste?pendingPaste.drawing.shapes.map(s=>translateItem(s,cursor.x-pendingPaste.base.x,cursor.y-pendingPaste.base.y)):tool==='trim'?[]:[...commandPreview,...hatchPreview];
 try{
   if(paper&&layout&&isPaperDimensionTool(tool)&&paperDimensionSession){const v=dimensionViewport(layout,cursor,paperDimensionSession);if(v){const d=paperDimensionPreview(tool,paperDimensionSession,v,cursor,baseShape(),paperDimensionSettings());if(d)extras.push({...d,id:'construction'});else if(paperDimensionSession.points.length===1){extras.push({...baseShape(),id:'construction',type:'line',a:modelToPaper(paperDimensionSession.points[0],v),b:cursor});}}}
   if((tool==='polyline'||tool==='bezier')&&pathNodes.length){let nodes=pathNodes.map(n=>({...n}));const last=nodes[nodes.length-1];const end=tool==='polyline'?(lengthText?exactEndpoint(last.p,cursor,lengthText,unit,effectiveOrtho,effectivePolar,settings.angle):constrain(last.p,cursor,settings.length,settings.angle)):cursor;if(distance(last.p,end)>.001){if(tool==='polyline')last.bulge=settings.segment==='arc'?Math.tan(parseAngle(settings.arcAngle)*Math.PI/720):0;nodes.push({p:end});}if(nodes.length>=2){if(tool==='bezier')nodes=smoothNodes(nodes);extras.push({...baseShape(),id:'construction',type:tool,nodes,a:nodes[0].p,b:nodes[nodes.length-1].p,closed:false});}}
   if((tool==='dimension'||tool==='diameter')&&source?.type==='circle')extras.push({...diameterDimension(source,cursor,baseShape(),diameterTextHeight()),id:'construction'});
   if(tool==='linearDimension'&&commandPoints.length){if(commandPoints.length===2)extras.push({...dimensionAt(cursor),id:'construction'});else extras.push({...baseShape(),id:'construction',type:'line',a:commandPoints[0],b:cursor});}
   if((isSpecializedDimension(tool)||tool==='diameter'&&commandPoints.length>0)&&commandPoints.length){
    const ready=tool==='alignedDimension'?commandPoints.length>=2:tool==='ordinate'?commandPoints.length>=1:tool==='jogged'?commandPoints.length>=4:commandPoints.length>=3;
    if(ready)extras.push({...dimensionAt(cursor),id:'construction'});
    else if(commandPoints.length===1&&!source)extras.push({...baseShape(),id:'construction',type:'line',a:commandPoints[0],b:cursor});
   }
   if((tool==='measure'||tool==='dimension')&&commandPoints.length){const a=commandPoints[0],b=commandPoints[1]||cursor;if(tool==='dimension'&&commandPoints.length===2&&distance(a,b)>.001){extras.push({...baseShape(),id:'construction',type:'dimension',a,b,offset:cross(sub(b,a),sub(cursor,a))/distance(a,b),height:parseDistance(settings.dimensionText)*Number(settings.annotationScale)});}else extras.push({...baseShape(),id:'construction',type:'line',a,b});}
 }catch{/* Invalid partial input is reported when the operation is confirmed. */}
 const renderViewport=(original:Viewport)=>{
   if(doc.layers.find(l=>l.id===(original.layerId||'0'))?.visible===false)return null;
   const v=draft?.type==='viewport'&&draft.id===original.id?draft:original,r=bounds(v),isActive=viewportId===v.id;
   const origin=modelToPaper({x:0,y:0},v),frameStyle=appearance(v,doc.layers);
   return <g key={v.id} data-viewport={v.id}><defs><GridPattern id={`${scope}-grid-${v.id}`} g={drawingGrid.model} scale={view.scale/v.denominator} coordinateScale={1/v.denominator} origin={origin} light/><clipPath id={`${scope}-clip-${v.id}`}><rect x={r.x} y={r.y} width={r.width} height={r.height}/></clipPath></defs><g clipPath={`url(#${scope}-clip-${v.id})`}><rect data-id={paper?v.id:undefined} x={r.x} y={r.y} width={r.width} height={r.height} fill="transparent"/>{isActive&&grid&&<rect x={r.x} y={r.y} width={r.width} height={r.height} fill={`url(#${scope}-grid-${v.id})`} pointerEvents="none"/>}
   {modelShapes.map(s=>geometry(mapItem(s,p=>modelToPaper(p,v),1/v.denominator),{model:isActive,inert:!isActive,displayColor:layout!.monochrome?'#17242a':undefined,dimensionLabel:s.type==='dimension'?dimensionGeometry(s,unit).text:undefined}))}
   {isActive&&<DimensionAlignmentGuide guide={alignment.guide} scale={view.scale} span={svg.current?.clientWidth||1000} viewport={v}/>} {isActive&&tool==='scale'&&<ScaleReferenceGuide session={scaleReference} base={commandPoints[0]} pointer={cursor} scale={view.scale} viewport={v}/>}<AngularReferenceHighlight tool={tool} references={angularReferences} shapes={visible} viewport={v} referenceViewportId={angularReferenceViewport}/>
   {isActive&&references.guide&&<polyline points={references.guide.points.map(p=>{const q=modelToPaper(p,v);return q.x+','+q.y;}).join(' ')} stroke="#e6b776" strokeWidth={1/view.scale} fill="none" pointerEvents="none"/>}{!paper&&references.preview&&geometry(mapItem(references.preview,p=>modelToPaper(p,v),1/v.denominator),{model:isActive,preview:true})}{!paper&&draft&&draft.type!=='viewport'&&geometry(mapItem(draft,p=>modelToPaper(p,v),1/v.denominator),{model:isActive,preview:true,dimensionLabel:draft.type==='dimension'?dimensionGeometry(draft,unit).text:undefined})}{isActive&&extras.map(s=>geometry(mapItem(s,p=>modelToPaper(p,v),1/v.denominator),{model:true,preview:true,previewColor:tool==='trim'?'#e88376':undefined,dimensionLabel:s.type==='dimension'?dimensionGeometry(s,unit).text:undefined}))}</g>
   <rect data-id={paper?v.id:undefined} x={r.x} y={r.y} width={r.width} height={r.height} fill="none" stroke={isActive?'#299b88':selected===v.id?'#299b88':v.printBorder?(layout!.monochrome?'#17242a':frameStyle.color):'#a3adb3'} opacity={1-frameStyle.transparency/100} strokeDasharray={v.printBorder?linePatterns[frameStyle.linetype].join(' ')||undefined:'2 1'} strokeWidth={isActive?.65:v.printBorder?frameStyle.lineweight:.3} style={{pointerEvents:'stroke'}}/>
   {paper&&selected===v.id&&<rect data-id={v.id} data-resize="true" x={v.b.x-1.5} y={v.b.y-1.5} width="3" height="3" fill="#299b88" style={{cursor:'nwse-resize'}}/>}</g>;
 };
 const numeric=(label:string,value:number,change:(value:number)=>void,min?:number,max?:number)=>{const factor=!paper&&['Largeur','Hauteur','Centre X','Centre Y'].includes(label)?unitFactor[unit]:1;return <label className="property-row">{t(label)}<input aria-label={t(label)} type="number" step="any" min={min===undefined?undefined:min/factor} max={max===undefined?undefined:max/factor} value={Number((value/factor).toFixed(4))} onChange={e=>{if(!e.target.value)return;const v=Number(e.target.value)*factor;if(Number.isFinite(v)&&(min===undefined||v>=min)&&(max===undefined||v<=max))change(v);}}/></label>;};
 const viewportProperties=(v:Viewport)=><><div className="section-label">{t("FENÊTRE DE VUE")}</div>{numeric('Échelle 1 :',v.denominator,n=>editViewport({...v,denominator:n}),.01,10000)}<div className="scale-presets">{[1,2,5,10,20,50,100].map(n=><button key={n} onClick={()=>editViewport({...v,denominator:n})}>1:{n}</button>)}</div><label className="property-row">{t("Verrouiller la vue")}<input type="checkbox" checked={v.locked} onChange={e=>editViewport({...v,locked:e.target.checked})}/></label><label className="property-row">{t("Imprimer le cadre")}<input type="checkbox" checked={v.printBorder} onChange={e=>editViewport({...v,printBorder:e.target.checked})}/></label>{numeric('Centre X',v.center.x,n=>editViewport({...v,center:{...v.center,x:n}}))}{numeric('Centre Y',v.center.y,n=>editViewport({...v,center:{...v.center,y:n}}))}<button className="wide" disabled={v.locked} onClick={()=>editViewport(fitViewport(v,doc.shapes))}>{t("Cadrer les objets")}</button><button className="wide" onClick={()=>{clear();setViewportId(viewportId?null:v.id);setTool(viewportId?'select':'pan');}}>{viewportId?t("Revenir au papier"):t("Activer / cadrer la vue")}</button></>;
 const addLayout=()=>{if(blockEditor){setBlockClose(true);return;}const l=newLayout(id(),nextLayoutName(doc.layouts));commit({...doc,layouts:[...doc.layouts,l]});switchSpace(l.id);};
 const cartouche=()=>{if(!layout)return;const size=paperSize(layout),x=size.x-110,y=size.y-35;updateLayout({items:[...layout.items,{id:id(),type:'rect',a:{x,y},b:{x:size.x-10,y:size.y-10},color:'#17242a',colorByLayer:true,layerId:layer.id},{id:id(),type:'text',a:{x:x+4,y:y+4},b:{x:x+4,y:y+4},text:doc.name,height:4,color:'#17242a',colorByLayer:true,layerId:layer.id},{id:id(),type:'text',a:{x:x+4,y:y+13},b:{x:x+4,y:y+13},text:`${layout.name} · ${new Date().toLocaleDateString('fr-FR')}`,height:2.5,color:'#17242a',colorByLayer:true,layerId:layer.id}]});};
 const activeGrip=gesture.current;
 const gripOrigin=activeGrip?.original&&activeGrip.grip?gripLengthOrigin(activeGrip.original,activeGrip.grip):undefined;
 const gripDisplacement=!!gripOrigin&&activeGrip?.grip?.startsWith('segment-');
 const gripFactor=activeGrip?.original&&activeGrip.grip?gripLengthFactor(activeGrip.original,activeGrip.grip):1;
 const dynamicStart=gripOrigin||((tool==='copy'||tool==='move')&&source?commandPoints[0]:tool==='polyline'?pathNodes.at(-1)?.p:(tool==='line'&&draft?.type==='line'||tool==='circle'&&draft?.type==='circle')?draft.a:undefined);
 const lineOption=tool==='line'&&draft?.type==='line'&&/^[CU]$/i.test(commandText.trim())?commandText.trim().toUpperCase():null;
 const closingCommand=tool==='polyline'&&pathNodes.length>0&&commandText.trim().toUpperCase()==='C';
 const zoomOptions=[{id:'E',name:'E',label:'Étendu'},{id:'W',name:'W',label:'Fenêtre'},{id:'P',name:'P',label:'Précédent'},{id:'A',name:'A',label:'Tout'},{id:'O',name:'O',label:'Objet'},{id:'S',name:'S',label:'Échelle'}];
 const closingJoin=tool==='join'&&joinArcSource?.type==='arc'&&commandText.trim().toUpperCase()==='C';
 const matchedSuggestions=references.active||tool==='scale'&&!!source&&commandPoints.length>0?[]:closingJoin?[{id:'closeJoin',name:'C',label:'Fermer l’arc en cercle'}]:lineOption?[{id:lineOption==='C'?'closeLine':'undoLine',name:lineOption,label:lineOption==='C'?'Fermer la suite de lignes':'Annuler le dernier segment'}]:tool==='rect'&&draft?.type==='rect'?[]:zoomMode==='options'?zoomOptions.filter(c=>c.id.startsWith(commandText.trim())):/^(Z|ZOOM)$/i.test(commandText)?[{id:'zoom',name:'ZOOM',label:'Navigation du dessin'}]:closingCommand?[{id:'close',name:'C',label:'Fermer la polyligne'}]:paletteSuggestions(commandText,bindings,paletteOpen).filter(c=>{if(commandTools.includes(c.id as Tool))return c.id==='join'||isPaperDimensionTool(c.id)||!paper;if(['text','viewport'].includes(c.id))return paper;if((blockCommands as readonly string[]).includes(c.id))return c.id==='bclose'?!!blockEditor:!layout&&!blockEditor;if(['all','copyClip','cutClip','pasteClip','copyBase'].includes(c.id))return !paper;if(c.id==='pdf')return !!layout;if(c.id==='pdfAll')return !!doc.layouts.length;return true;});
 const {commands:suggestions,separatorIndex}=groupPaletteCommands(matchedSuggestions,zoomMode||closingCommand||closingJoin||lineOption||(tool==='rect'&&draft?.type==='rect')?[]:recentCommands,commandText);
 useEffect(()=>{document.getElementById(scope+'-option-'+commandIndex)?.scrollIntoView({block:'nearest'});},[commandIndex,commandText,paletteOpen]);
 const finishRectangle=(end:Point)=>{const current=draftRef.current;if(current?.type!=='rect')return;canDraw();put([...items,{...current,b:end}]);chooseTool('select');setMessage('Rectangle créé.');};
 const executeCommand=(id?:string)=>{if(!id&&scaleCommand())return;if(!id&&references.command(commandText)){setCommandText('');return;}if(!id&&blockFlow){if(blockFlow.kind==='select'){const action=blockFlow.action;setBlockFlow(null);runBlockAction(action);}return;}if(!id&&gesture.current?.grip&&lengthText){confirmLength();return;}if(tool==='join'&&!paletteOpen){if(id==='closeJoin'||!id&&commandText.trim().toUpperCase()==='C'&&joinArcSource?.type==='arc'){applyJoin(selectedIds,true);return;}if(!id&&!commandText.trim()){finishJoin();return;}}if(tool==='line'&&!paletteOpen){if(id==='closeLine'||(!id&&lineOption==='C')){closeLines();return;}if(id==='undoLine'||(!id&&lineOption==='U')){undoLineSegment();return;}if(!id&&!commandText.trim()){if(lengthText)confirmLength();else cancelTool();return;}}if(!id&&tool==='rect'&&draftRef.current?.type==='rect'){safe(()=>{const text=commandText.trim();if(text){finishRectangle(relativeRectangleEndpoint(draftRef.current!.a,text,paper?'mm':unit,paper));}else{finishRectangle(rectangleEndpoint(draftRef.current!.a,cursor,rectWidth,rectHeight,paper?'mm':unit));}setCommandText('');});return;}if(tool==='offset'&&!paletteOpen&&!id&&!commandText.trim()){cancelTool();return;}if((tool==='linearDimension'||tool==='alignedDimension')&&!paletteOpen&&!id&&!commandText.trim()&&!commandPoints.length&&!paperDimensionSession){setLinearSelectObject(true);setMessage('Cliquez le côté à coter.');return;}if(zoomMode){if(zoomMode==='scale'){try{const factor=Number(commandText.trim().replace(',','.'));const f=navigationFrame();applyNavigation(zoomAt(navigationView(),{x:f.width/2,y:f.height/2},factor));setZoomMode(null);setCommandText('');}catch(e){reportError((e as Error).message);}return;}if(zoomMode==='options'){const op=(id||commandText.trim()).toUpperCase();if(!zoomOptions.some(c=>c.id===op)){setMessage('Choisissez E, W, P, A, O ou S puis Entrée.');return;}setZoomMode(null);setCommandText('');zoomOperation(op);return;}return;}if(id==='zoom'||/^(Z|ZOOM)$/i.test(commandText.trim())){setRecentCommands(history=>rememberCommand(history,'zoom'));setPaletteOpen(false);setZoomMode('options');setCommandText('');setCommandIndex(0);setMessage('Zoom : E Étendu · W Fenêtre · P Précédent · A Tout · O Objet · S Échelle');return;}if(closingCommand&&(!id||id==='close')){finishPath(true);return;}const command=id?{id}:(commandIndex===0?resolvePaletteCommand(commandText,bindings):undefined)||suggestions[commandIndex];if(!command||!suggestions.some(c=>c.id===command.id)){setMessage('Commande inconnue ou indisponible dans cet espace.');return;}setRecentCommands(history=>rememberCommand(history,command.id));setPaletteOpen(false);setCommandText('');setCommandIndex(0);
 if((blockCommands as readonly string[]).includes(command.id)){runBlockAction(command.id);return;}
 if(['copyClip','cutClip','pasteClip','copyBase'].includes(command.id)){void runClipboardAction(command.id);return;}
 if(['undo','redo','new','open','save','dxf','pdf','pdfAll','help'].includes(command.id)||command.id.startsWith('help:')){runAction(command.id==='save'?'quickSave':command.id);return;}
 if(command.id==='referenceclip'||command.id==='referenceadjust'){if(active?.type!=='reference'){setMessage('Sélectionnez une image ou un PDF attaché.');return;}if(command.id==='referenceclip')references.clip(active);else setPropertiesOpen(true);return;}
 if(['imageattach','pdfattach','references'].includes(command.id)){runAction(command.id);return;}
 if(command.id==='settings'){setConfiguration(true);return;}
 if(command.id==='properties'){toggleProperties();return;}
 if(command.id==='addLayout'){addLayout();return;}
 if(command.id==='grid'){toggleGrid();return;}
 if(command.id==='gridSnap'){toggleGridSnap();return;}
 if(command.id==='ortho'){toggleOrtho();return;}
 if(command.id==='osnap'){toggleOsnap();return;}
 if(command.id==='polar'){togglePolar();return;}
 if(command.id==='escape'){cancelTool();return;}
 if(command.id==='delete'){remove();return;}
 if(command.id==='all'){if(tool==='join'){selectSingle(null);setSelectedIds((paper?items:visible).map(s=>s.id));return;}clear();setTool('select');setSelectedIds(items.map(s=>s.id));return;}
 if(command.id==='finish'){if(tool==='join'){finishJoin();return;}if(tool==='hatch'){finishHatches();return;}if(choosingBoundaries)chooseBoundaries('finish');else if(tool==='polyline'||tool==='bezier')finishPath();else if(tool==='linearDimension'||tool==='alignedDimension'){setLinearSelectObject(true);setMessage('Cliquez le côté à coter.');}else cancelTool();return;}
 chooseTool(command.id as Tool);if(paper&&isPaperDimensionTool(command.id)){setMessage('Cotation sur la feuille · Cliquez le bâtiment dans une fenêtre, sans l’activer.');return;}if(command.id==='scale'||command.id==='copy'||command.id==='move'||command.id==='offset'||command.id==='arc'||command.id==='rect'||command.id==='join'||command.id==='fillet')return;if(command.id==='linearDimension'){setMessage('Cliquez le premier point, ou Entrée pour choisir un côté.');return;}if(command.id==='circle'){setMessage('Cliquez le centre du cercle');return;}setMessage(command.id==='polyline'||command.id==='line'?'Cliquez le premier point':labels[command.id as Tool]);};
 const confirmLength=()=>safe(()=>{if(!dynamicStart||!lengthText)return;if(gesture.current?.grip){finishGrip(cursor);return;}if(tool==='copy'||tool==='move'){commandClick(svg.current!,cursor);return;}const end=tool==='circle'?radiusEndpoint(dynamicStart,lengthText,paper?'mm':unit):(tool==='line'?lineEndpoint:exactEndpoint)(dynamicStart,cursor,lengthText,paper?'mm':unit,effectiveOrtho,effectivePolar,settings.angle);if(tool==='circle'&&draftRef.current?.type==='circle'){canDraw();put([...items,{...draftRef.current,b:end}]);chooseTool('select');setMessage('Cercle créé.');}else if(tool==='polyline'){commandClick(svg.current!,cursor);}else if(draftRef.current?.type==='line'){canDraw();addLineSegment(end);}});
 let dynamicEnd=cursor;try{if(gripOrigin&&activeGrip?.original&&activeGrip.grip){const edited=gripPreview(activeGrip,cursor);dynamicEnd=objectGrips(edited).find(h=>h.key===activeGrip.grip)!.point;}else if(dynamicStart&&(tool==='copy'||tool==='move'))dynamicEnd=translationEndpoint(dynamicStart,cursor,lengthText,unit,effectiveOrtho,effectivePolar,pointerSnap.current);else if(dynamicStart&&tool==='circle')dynamicEnd=lengthText?radiusEndpoint(dynamicStart,lengthText,paper?'mm':unit):cursor;else if(dynamicStart)dynamicEnd=lengthText?(tool==='line'?lineEndpoint:exactEndpoint)(dynamicStart,cursor,lengthText,paper?'mm':unit,effectiveOrtho,effectivePolar,settings.angle):constrain(dynamicStart,cursor,paper?'':settings.length,paper?'':settings.angle);}catch{}
 const applyRadiusEdit=()=>safe(()=>{if(!radiusEditor)return;const circle=items.find(s=>s.id===radiusEditor.id);if(circle?.type!=='circle'){setRadiusEditor(null);return;}if(!editable(circle))throw new Error('Le calque est verrouillé.');const b=radiusEndpoint(circle.a,radiusEditor.text,radiusEditor.unit);if(distance(circle.a,circle.b)!==distance(circle.a,b))edit({...circle,b});setRadiusEditor(null);setMessage('Rayon du cercle modifié.');});
 const radiusPosition=radiusEditor?dynamicFieldPosition(radiusEditor.point,svg.current?.clientWidth||800,svg.current?.clientHeight||600):null;
 const dynamicPosition=dynamicFieldPosition(pointerScreen,svg.current?.clientWidth||800,svg.current?.clientHeight||600);
 const drawingCursor=cursorMode({tool,hasSource:!!source,selectingDimension:linearSelectObject,choosingBoundaries,positioning:!!pendingCopyBase||!!pendingPaste||!!zoomMode||!!selectionDrag.current||!!gesture.current?.original,editingText:false});
 const cursorBadge=tool==='move'?'M116 66h28m-14-14v28m-14-14l5-5m-5 5l5 5m23-5l-5-5m5 5l-5 5m-9-14l-5 5m5-5l5 5m-5 23l-5-5m5 5l5-5':tool==='copy'?'M115 53h19v19h-19zM122 60h19v19h-19':tool==='rotate'?'M117 70a12 12 0 1 1 20-9m0-8v9h-9':null;
 const statusText=message==='Prêt à dessiner'?'Sélectionnez et déplacez une forme':message;
 const size=layout?paperSize(layout):null;
 const dimensionOrigin=viewport?modelToPaper({x:0,y:0},viewport):{x:0,y:0};
 const dimensionBounds=viewport?bounds(viewport):size?{x:0,y:0,width:size.x,height:size.y}:undefined;

 const changed=documentChanged(blockEditor?.drawing||doc,saved),fileLabel=fileName?documentLabel(fileName,changed):t('nouveau fichier')+(changed?' *':'');
 useEffect(()=>{document.title=fileLabel+' — JLG CAD';},[fileLabel,language]);
 const replaceDrawing=(next:Drawing,name:string|null=null)=>{setLastBlockCommand(null);setToolHistory([]);setRecentCommands([]);setFileName(name);setDoc(next);setPast([]);setFuture([]);setSaved(next);switchSpace(null);setMessage('Prêt à dessiner');};
 const requestReplacement=(next:Drawing,name:string|null=null)=>{if(changed)setReplacement({drawing:next,fileName:name});else replaceDrawing(next,name);};
 const runAction=(action:string)=>{if(['imageattach','pdfattach','references'].includes(action)){if(blockEditor){setMessage('Fermez l’éditeur de bloc avant de gérer les références.');return;}clear();setTool('select');if(action==='references')references.open();else references.attach(action==='pdfattach'?'pdf':'image');return;}if((blockCommands as readonly string[]).includes(action)){runBlockAction(action);return;}if(blockEditor&&['new','open','save','quickSave','dxf','pdf','pdfAll'].includes(action)){setBlockClose(true);setMessage('Fermez l’éditeur de bloc avant de gérer les fichiers.');return;}if(action==='undo')undo();else if(action==='redo')redo();else if(action==='save'||action==='quickSave'){if((tool==='polyline'||tool==='bezier')&&pathNodes.length>=2){if(!finishPath(false,true))return;clear();setTool('select');}if(action==='quickSave'&&fileName)setQuickSavePending(true);else setSaveRequested(true);}else if(action==='new')requestReplacement(documentOf('Sans titre',[]));else if(action==='open')input.current?.click();else if(action==='dxf'){if(!references.requestExport())download(toDxf(visible,doc.layers,unit,doc.blocks),'.dxf');}else if(action==='pdf'&&layout)pdf();else if(action==='pdfAll'&&doc.layouts.length)pdf(true);else if(action==='help')window.dispatchEvent(new Event('cad-shortcuts'));else if(action.startsWith('help:'))window.dispatchEvent(new CustomEvent('cad-help',{detail:action.slice(5)}));};
 const contextGroups=():ContextItem[][]=>{
 const entry=(label:string,run:()=>void,disabled=false,icon?:string):ContextItem=>({label,run,disabled,icon,shortcut:icon?bindings[icon]?.map(key=>(/^[A-Z]+$/.test(key)?key+' ↵':key).replace(/Shift/g,language==='en'?'Shift':'Maj').replace(/Escape/g,language==='en'?'Esc':'Échap').replace(/Enter/g,language==='en'?'Enter':'Entrée').replace(/Delete/g,language==='en'?'Del':'Suppr').replace(/Backspace/g,language==='en'?'Backspace':'Retour arrière')).join(' / '):undefined});
 const ids=selectedIds.length?selectedIds:selected?[selected]:[],chosen=items.filter(s=>ids.includes(s.id)),hasSelection=chosen.length>0,canEdit=chosen.some(editable);
 const history=repeatHistory,repeat=history[0];
 const idle=tool==='select'&&!pendingPaste&&!pendingCopyBase&&!selectionDrag.current&&!zoomMode;
 const groups:ContextItem[][]=[];
 if(idle){
 groups.push([{...entry(lastBlockCommand?'Répéter '+commandName(lastBlockCommand):repeat?'Répéter '+labels[repeat]:'Répéter la dernière commande',repeatLastTool,!repeat&&!lastBlockCommand,'repeat'),shortcut:repeatKeys(bindings).map(key=>t(key==='Enter'?'Entrée':'Espace')).join(' / '),repeatCommand:repeat},...(history.length?[{label:'Commandes récentes',icon:'recent',run:()=>{},children:history.map(t=>entry(labels[t],()=>chooseTool(t),false,t))}]:[])]);
 if(hasSelection)groups.push([...(paper?[]:(['move','copy','scale','rotate','mirror','offset'] as Tool[]).map(t=>entry(labels[t],()=>chooseTool(t),!canEdit,t))),entry('Effacer',remove,!canEdit,'delete'),entry('Désélectionner tout',()=>{selectSingle(null);setSelectedIds([]);})]);
 if(!layout&&!blockEditor)groups.push([entry('Créer un bloc',()=>runBlockAction('block')),entry('Insérer un bloc',()=>runBlockAction('insert')),entry('Éditer un bloc',()=>runBlockAction('bedit')),entry('Décomposer un bloc',()=>runBlockAction('explode'),!chosen.some(s=>s.type==='block'))]);
 if(!paper)groups.push([...(hasSelection?[entry('Couper',()=>void runClipboardAction('cutClip'),!canEdit,'cutClip'),entry('Copier dans le presse-papiers',()=>void runClipboardAction('copyClip'),false,'copyClip'),entry('Copier avec point de base',()=>void runClipboardAction('copyBase'),false,'copyBase')]:[]),entry('Coller',()=>void runClipboardAction('pasteClip'),false,'pasteClip')]);
 groups.push([entry('Annuler',undo,!past.length,'undo'),entry('Rétablir',redo,!future.length,'redo')]);
 groups.push([entry('Zoom étendu',()=>zoomOperation('E')),entry('Zoom fenêtre',()=>zoomOperation('W')),entry('Zoom précédent',()=>zoomOperation('P')),entry('Panoramique',()=>chooseTool('pan'),false,'pan')]);
 if(chosen.length===1){const object=chosen[0];
 if(object.type==='reference')groups.push([entry('Calibrer l’échelle…',()=>references.calibrate(object),!canEdit),entry('Délimiter : rectangle',()=>references.clip(object),!canEdit),entry('Délimiter : polygone',()=>references.clip(object,true),!canEdit),entry('Références…',()=>references.open())]);
 if(object.type==='hatch')groups.push([entry('Modifier la hachure',()=>setPropertiesOpen(true)),entry('Redéfinir la zone',()=>redefineHatch(object),!canEdit),entry('Définir l’origine',()=>{setHatchOriginTarget(object.id);setMessage('Cliquez la nouvelle origine de la hachure.');},!canEdit),entry('Sélectionner le contour',()=>{const contours=object.regions.flatMap(r=>r.sourceIds);setSelected(null);setSelectedIds([...new Set(contours)]);},!object.regions.some(r=>r.sourceIds.length))]);
 if(object.type==='viewport')groups.push([entry(object.locked?'Déverrouiller la vue':'Verrouiller la vue',()=>editViewport({...object,locked:!object.locked})),entry('Cadrer les objets',()=>editViewport(fitViewport(object,doc.shapes)),object.locked),entry('Activer la fenêtre',()=>{clear();setViewportId(object.id);setTool('select');})]);
 }
 if(hasSelection){groups.push([entry('Joindre',()=>chooseTool('join'),!canEdit,'join')]);}
 if(hasSelection)groups.push([entry('Propriétés',()=>setPropertiesOpen(true),false,'properties')]);
 }else{
 const options:ContextItem[]=[];
 if(tool==='join'){options.push(entry(joinPhase==='initial'&&selectedIds.length===1?'Utiliser comme source':'Valider la sélection',finishJoin,!selectedIds.length,'finish'));if(joinArcSource?.type==='arc')options.push(entry('Fermer l’arc en cercle',()=>applyJoin(selectedIds,true)));}
 else if(tool==='line'){options.push(entry('Terminer',cancelTool,false,'finish'),entry('Fermer',closeLines,lineSegments.current.length<2),entry('Annuler le dernier segment',undoLineSegment,!lineSegments.current.length));}
 else if(tool==='polyline'||tool==='bezier'){
 options.push(entry('Terminer',()=>finishPath(false,true),pathNodes.length<2,'finish'),entry('Fermer',()=>finishPath(true),pathNodes.length<3),entry('Annuler le dernier sommet',()=>{setPathNodes(n=>n.slice(0,-1));setLengthText('');},!pathNodes.length));
 if(tool==='polyline')options.push(entry('Ligne',()=>setSettings(v=>({...v,segment:'line'}))),entry('Arc',()=>setSettings(v=>({...v,segment:'arc'}))));
 }else if(tool==='trim'||tool==='extend')options.push(entry('Choisir les limites',()=>chooseBoundaries('choose')),entry('Utiliser toutes les limites',()=>chooseBoundaries('all')),...(choosingBoundaries?[entry('Valider les limites',()=>chooseBoundaries('finish'),!boundaryIds.length)]:[]),entry('Terminer',cancelTool,false,'finish'));
 else if(tool==='hatch')options.push(entry('Valider / terminer les hachures',finishHatches),entry('Choisir un point intérieur',()=>setHatchMode('pick')),entry('Sélectionner les objets',()=>setHatchMode('objects')));
 else if(tool==='offset')options.push(...(!offsetReady?[entry('Valider la distance',confirmOffsetDistance)]:[]),entry('Terminer',cancelTool,false,'finish'));
 else if((tool==='linearDimension'||tool==='alignedDimension')&&!commandPoints.length)options.push(entry('Sélectionner un objet',()=>setLinearSelectObject(true)));
 if(zoomMode==='options')options.push(...zoomOptions.map(o=>entry('Zoom '+o.label,()=>{setZoomMode(null);setCommandText('');zoomOperation(o.id);})));
 if(lengthText&&dynamicStart)options.push(entry('Valider la valeur saisie',confirmLength));
 groups.push(options,[entry('Quitter la commande',cancelTool,false,'escape')]);
 }return groups;
 };
 const openBlockEditor=(definitionId:string)=>safe(()=>{
 if(blockEditor)throw new Error('Fermez d’abord l’éditeur de bloc.');
 const definition=doc.blocks?.find(b=>b.id===definitionId);if(!definition)throw new Error('Choisissez un bloc.');
 setBlockEditor({drawing:doc,definitionId,past,future,view,layer:currentLayer});clear();setTool('select');setLayoutId(null);setViewportId(null);setPast([]);setFuture([]);
 const editing={...documentOf(definition.name,structuredClone(definition.shapes),[],doc.layers.map(l=>({...l,visible:true,locked:false}))),blocks:[]};setDoc(editing);setCurrentLayer('0');
 if(svg.current)setView(fitBoxes(editing.shapes.map(bounds),svg.current.clientWidth,svg.current.clientHeight));
 setMessage('Éditeur de bloc · Modifiez les objets puis enregistrez le bloc.');
 });
 const finishBlockEditor=(save:boolean)=>safe(()=>{
 if(!blockEditor)return;
 if(save&&(draft||pathNodes.length||commandPoints.length||gesture.current)){throw new Error('Terminez la commande en cours avant d’enregistrer le bloc.');}
 const original=blockEditor.drawing;let next=original;
 if(save){const resolved=synchronizeDrawing(doc);next=redefineBlock({...original,layers:[...original.layers,...doc.layers.filter(l=>!original.layers.some(o=>o.id===l.id))]},blockEditor.definitionId,resolved.shapes);}
 clear();setTool('select');setDoc(next);setPast(save?[...blockEditor.past,original]:blockEditor.past);setFuture(save?[]:blockEditor.future);setView(blockEditor.view);setCurrentLayer(blockEditor.layer);setBlockEditor(null);setBlockClose(false);setMessage(save?'Bloc enregistré : toutes ses insertions ont été mises à jour.':'Modifications du bloc abandonnées.');
 });
 const runBlockAction=(action:string)=>safe(()=>{
 setContextPosition(null);setPaletteOpen(false);setCommandText('');
 if(action==='bclose'){if(blockEditor)setBlockClose(true);else setMessage('Aucun éditeur de bloc ouvert.');return;}
 if(layout||blockEditor)throw new Error('Cette commande est disponible dans l’espace Objet, hors de l’éditeur de bloc.');
 setLastBlockCommand(action);
 const ids=selectedIds.length?selectedIds:selected?[selected]:[];
 const blocks=doc.shapes.filter(s=>ids.includes(s.id)&&s.type==='block');
 if(action==='insert'){clear();setTool('select');setBlockDialog('insert');return;}
 if(action==='bedit'){if(blocks.length===1){openBlockEditor((blocks[0] as import('./model').BlockShape).definitionId);return;}setBlockDialog('bedit');return;}
 if(!ids.length){clear();setTool('select');setBlockFlow({kind:'select',action:action as 'block'|'explode'});setMessage('Sélectionnez les objets puis Entrée · Échap pour annuler.');return;}
 if(action==='explode'){commit(explodeBlocks(doc,ids,id));clear();setMessage('Blocs décomposés en objets indépendants.');return;}
 if(action==='block'){if(doc.shapes.some(s=>ids.includes(s.id)&&lockedShape(doc,s)))throw new Error('Le calque est verrouillé.');setBlockDialog('block');}
 });
 const importBlockLibrary=async(file:File)=>{
 if(file.size>20_000_000)throw new Error('Fichier trop volumineux : limite de 20 Mo.');
 let drawing:Drawing;
 if(/\.dxf$/i.test(file.name))drawing=importDxf(decodeDxf(await file.arrayBuffer()),file.name).drawing;
 else {const workspace=parseDrawingFile(await file.text());drawing=workspace.drawings[workspace.activeDrawing];}
 commit(importBlockDefinitions(currentDoc.current,drawing,id));setMessage('Blocs récupérés depuis le plan.');
 };
 const sidebarToggle=<button className="properties-toggle" aria-label={t(propertiesOpen?'Masquer la barre de droite':'Afficher la barre de droite')} title={t(propertiesOpen?'Masquer la barre de droite':'Afficher la barre de droite')} aria-controls={scope+'-properties'} aria-expanded={propertiesOpen} onClick={toggleProperties}>{propertiesOpen?<ChevronRight size={18}/>:<ChevronLeft size={18}/>}</button>;
 return <UnitContext.Provider value={paper?'mm':unit}><div className={contextPosition?"app context-menu-open":"app"} onChangeCapture={()=>setSidebarError('')} >{references.dialogs}{blockDialog&&<BlockDialog mode={blockDialog} blocks={doc.blocks||[]} initialId={lastBlockDefinitionId} onCancel={()=>setBlockDialog(null)} onImport={blockDialog==='insert'?importBlockLibrary:undefined} onSubmit={data=>{if(blockDialog==='block'){blockName(data.name,doc.blocks||[]);const ids=selectedIds.length?selectedIds:selected?[selected]:[];if(!ids.length)throw new Error('Sélectionnez les objets du bloc.');setBlockFlow({kind:'base',name:data.name,ids,replace:data.replace});setMessage('Cliquez le point de base du bloc · Échap pour annuler.');}else if(blockDialog==='insert'){if(!Number.isFinite(data.scale)||data.scale<=0||!Number.isFinite(data.angle))throw new Error('Échelle ou rotation invalide.');insertBlock({...doc,shapes:[]},data.definitionId,cursor,data.scale,data.angle,id,currentLayer);clear();setTool('select');setLastBlockDefinitionId(data.definitionId);setBlockFlow({kind:'insert',definitionId:data.definitionId,scale:data.scale,angle:data.angle});setMessage('Indiquez le point d’insertion · Échap pour annuler.');}else openBlockEditor(data.definitionId);setBlockDialog(null);svg.current?.focus();}}/>}{blockClose&&<CloseBlockDialog error={sidebarError} onSave={()=>finishBlockEditor(true)} onDiscard={()=>finishBlockEditor(false)} onCancel={()=>setBlockClose(false)}/ >}{contextPosition&&<ContextMenu x={contextPosition.x} y={contextPosition.y} groups={contextGroups()} onClose={()=>{setContextPosition(null);svg.current?.focus({preventScroll:true});}}/>}{dxfFile&&<DxfImportDialog text={dxfFile.text} name={dxfFile.name} changed={changed} onBackup={()=>{download(JSON.stringify(doc,null,2),'.jlgcad');setSaved(doc);}} onCancel={()=>setDxfFile(null)} onImport={({drawing,report})=>{replaceDrawing(drawing,nativeFileName(drawing.name));setSaved(null);setDxfFile(null);setCurrentLayer('0');viewHistory.current={};if(svg.current){const objects=visibleShapes(drawing);setView(objects.length?fitBoxes(objects.map(bounds),svg.current.clientWidth,svg.current.clientHeight):initialModelView(svg.current.clientWidth,svg.current.clientHeight));}setMessage(`${report.objects} objets importés — sauvegardez en .jlgcad`);}}/>}{replacement&&<ReplaceDrawingDialog onCancel={()=>setReplacement(null)} onConfirm={()=>{replaceDrawing(replacement.drawing,replacement.fileName);setReplacement(null);}}/>}{saveRequested&&<SaveDrawingDialog name={fileName?fileName.replace(/\.(jlgcad|jlcad|json)$/i,''):doc.name} onCancel={()=>setSaveRequested(false)} onSave={name=>{const named={...doc,name};download(JSON.stringify(named,null,2),'.jlgcad',name);setFileName(nativeFileName(name));setDoc(named);setSaved(named);setSaveRequested(false);}}/>}<header><Menus bindings={bindings} onBindings={changeBindings} onAction={runAction} canPdf={!!layout} canPdfAll={!!doc.layouts.length}><ArchitectureToolbar layerTools={<LayerTools doc={doc} current={layer.id} onCurrent={id=>{setCurrentLayer(id);setColor(doc.layers.find(l=>l.id===id)!.color);}} onConfigure={()=>setLayerManagerOpen(true)}/>} tool={tool} onTool={t=>{chooseTool(t);svg.current?.focus({preventScroll:true});if(t==='dimension'){setLinearSelectObject(true);setMessage('Cliquez un côté ou un cercle à coter.');}}} shortcut={id=>toolShortcut(id,bindings)} paper={paper} referenceTools={<ReferenceMenu onAction={runAction}/>} blockTools={<BlockMenu editing={!!blockEditor} disabled={!!layout} onAction={runBlockAction} shortcut={id=>toolShortcut(id,bindings)}/>}/><span className="document-name" aria-label={t("Nom du fichier")} title={t(fileLabel+(changed?" — modifications non enregistrées dans un fichier":""))}>{fileLabel}</span></Menus><button aria-label={t("Paramètres")} title={t("Paramètres de l’application")} onClick={()=>setConfiguration(true)}><SettingsIcon size={16}/></button></header>
 <input hidden type="file" ref={input} accept=".jlgcad,.jlcad,.json,.dxf" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;try{if(/\.dxf$/i.test(f.name)){if(f.size>20_000_000)throw new Error('DXF trop volumineux : limite de 20 Mo.');const text=decodeDxf(await f.arrayBuffer());inspectDxf(text);setDxfFile({text,name:f.name});}else{const file=parseDrawingFile(await f.text());requestReplacement(file.drawings[file.activeDrawing],f.name);}}catch(err){setMessage(err instanceof Error?err.message:'Ouverture impossible');}e.target.value='';}}/>
 {blockEditor&&<div className="block-edit-banner"><strong>{t('Éditeur de bloc')} : {doc.name}</strong><button onClick={()=>finishBlockEditor(true)}>{t('Enregistrer le bloc')}</button><button onClick={()=>setBlockClose(true)}>{t('Fermer l’éditeur')}</button></div>}
 <div className="workspace">{!propertiesOpen&&sidebarToggle}
 <main className={layout?'paper-space':undefined}>{measurementResult&&<MeasurementResult key={measurementResult} result={measurementResult} anchor={measurementAnchor} onClose={()=>setMeasurementResult('')}/>}
 <svg ref={svg} className="drawing-canvas" tabIndex={-1} aria-label={t("Zone de dessin")} onPointerEnter={()=>setPointerInside(true)} onPointerLeave={()=>{resetAlignment();setPointerInside(false);setCommandPreview([]);setSnapHit(null);}} onContextMenu={e=>{e.preventDefault();setPaletteOpen(false);setContextPosition({x:e.clientX,y:e.clientY});}} onPointerDown={down} onPointerMove={e=>{if(!contextPosition)move(e);}} onPointerUp={up} onPointerCancel={()=>{resetAlignment();setLengthText('');resetTrim();if(selectionDrag.current){setSelectedIds(selectionDrag.current.previous);selectionDrag.current=null;setSelectionOutline([]);}gesture.current=null;setPreview(null);}} onLostPointerCapture={()=>{if(trimDrag.current){resetTrim();setCommandPreview([]);}}} onWheel={wheel} onDoubleClick={doubleClick} style={{cursor:contextPosition?'default':tool==='pan'?'grab':'none'}}><defs><GridPattern id={scope+"-grid"} g={drawingGrid.model} scale={view.scale} coordinateScale={view.scale} origin={{x:view.x,y:view.y}}/>{size&&<><GridPattern id={scope+"-paper-grid"} g={drawingGrid.paper} scale={view.scale} light/><clipPath id={scope+"-sheet"}><rect width={size.x} height={size.y}/></clipPath></>}</defs>{grid&&!layout&&<rect width="100%" height="100%" fill={"url(#"+scope+"-grid)"}/>}
 <g transform={`translate(${view.x},${view.y}) scale(${view.scale})`}>{size?<><rect className="paper-sheet" width={size.x} height={size.y} fill="#eeeee9"/>{grid&&paper&&<rect width={size.x} height={size.y} fill={"url(#"+scope+"-paper-grid)"} pointerEvents="none"/>}<rect x="5" y="5" width={size.x-10} height={size.y-10} fill="none" stroke="#b9c0bf" strokeDasharray="1 1" strokeWidth=".2" pointerEvents="none"/><g clipPath={"url(#"+scope+"-sheet)"}>{displayLayout!.items.filter(s=>s.type==='viewport').map(s=>renderViewport(s as Viewport))}{behindHatches(displayLayout!.items.filter(s=>s.type!=='viewport'&&s.id!==draft?.id)).map(s=>geometry(s,{inert:!!viewport,displayColor:layout!.monochrome?'#17242a':s.color}))}{paper&&references.preview&&geometry(references.preview,{preview:true})}{paper&&references.guide&&<polyline points={references.guide.points.map(p=>p.x+','+p.y).join(' ')} stroke="#e6b776" strokeWidth={1/view.scale} fill="none" pointerEvents="none"/>}{paper&&hatchPreview.map(s=>geometry(s,{preview:true}))}{paper&&extras.map(s=>geometry(s,{preview:true}))}{paper&&<DimensionAlignmentGuide guide={alignment.guide} scale={view.scale} span={svg.current?.clientWidth||1000}/>} {paper&&snapHit&&<rect x={snapHit.point.x-4/view.scale} y={snapHit.point.y-4/view.scale} width={8/view.scale} height={8/view.scale} stroke="#299b88" strokeWidth={1/view.scale} fill="none" pointerEvents="none"/>}{paper&&draft&&(draft.type!=='viewport'||!layout!.items.some(s=>s.id===draft.id))&&(draft.type==='viewport'?renderViewport(draft):geometry(draft,{preview:true}))}</g></>:<><g className="origin-indicator" pointerEvents="none" aria-label={t("Origine du dessin : axes X et Y")}><path d={`M ${-originAxisLength/2} 0 H ${originAxisLength} M 0 ${-originAxisLength} V ${originAxisLength/2}`} stroke="#8299a8" strokeWidth="1" vectorEffect="non-scaling-stroke"/><g transform={`scale(${1/view.scale})`}><circle r="2.5" fill="#a9bbc7"/><text x="-9" y="14" textAnchor="end" fill="#a9bbc7" fontSize="12">{t("O")}</text></g><g transform={`translate(${originAxisLength} 0) scale(${1/view.scale})`}><path d="M -7 -4 L 0 0 L -7 4" fill="none" stroke="#8299a8"/><text x="12" y="4" fill="#a9bbc7" fontSize="12">{t("X")}</text></g><g transform={`translate(0 ${-originAxisLength}) scale(${1/view.scale})`}><path d="M -4 7 L 0 0 L 4 7" fill="none" stroke="#8299a8"/><text x="0" y="-12" textAnchor="middle" fill="#a9bbc7" fontSize="12">{t("Y")}</text></g></g>{modelShapes.map(s=>geometry(s))}{tool==='scale'&&<ScaleReferenceGuide session={scaleReference} base={commandPoints[0]} pointer={cursor} scale={view.scale}/>}{references.preview&&geometry(references.preview,{preview:true})}{references.guide&&<polyline points={references.guide.points.map(p=>p.x+','+p.y).join(' ')} stroke="#e6b776" strokeWidth={1/view.scale} fill="none" pointerEvents="none"/>}<AngularReferenceHighlight tool={tool} references={angularReferences} shapes={visible}/>{hatchGaps.map((p,i)=><circle key={'hatch-gap-'+i} cx={p.x} cy={p.y} r={5/view.scale} stroke="#ff5050" strokeWidth={1.5/view.scale} fill="none" pointerEvents="none"/>)} {draft&&geometry(draft,{preview:true})}{extras.map(s=>geometry(s,{preview:true,previewColor:tool==='trim'?'#e88376':undefined}))}<DimensionAlignmentGuide guide={alignment.guide} scale={view.scale} span={svg.current?.clientWidth||1000}/> {snapHit&&<rect x={snapHit.point.x-4/view.scale} y={snapHit.point.y-4/view.scale} width={8/view.scale} height={8/view.scale} stroke="#a6e0cf" strokeWidth={1/view.scale} fill="none" pointerEvents="none"/>}</>}</g><GridDimension g={activeGrid} scale={gridScale} origin={{x:view.x+dimensionOrigin.x*view.scale,y:view.y+dimensionOrigin.y*view.scale}} region={dimensionBounds?{x:view.x+dimensionBounds.x*view.scale,y:view.y+dimensionBounds.y*view.scale,width:dimensionBounds.width*view.scale,height:dimensionBounds.height*view.scale}:undefined} light={!!layout}/>{selectionOutline.length>1&&(()=>{const lasso=selectionDrag.current?.phase==='lasso',points=lasso?selectionOutline:rectangleSelection(selectionOutline[0],selectionOutline.at(-1)!);const green=selectionDrag.current?.crossing||false;const enabled=green?selectionPreferences.green:selectionPreferences.blue;if(!enabled&&!lasso)return null;return <polygon aria-label={t(green?"Sélection verte":"Sélection bleue")} points={points.map(p=>`${p.x},${p.y}`).join(" ")} fill={enabled?(green?"#28b87820":"#168bff20"):"#80808020"} stroke={enabled?(green?"#28b878":"#168bff"):"#808080"} strokeDasharray={green?"6 4":undefined} strokeWidth="1.5" pointerEvents="none"/>;})()}{trimTrail.length>1&&<polyline points={trimTrail.map(p=>p.x+','+p.y).join(' ')} fill="none" stroke="#ffb34d" strokeWidth="1.5" strokeDasharray="5 3" pointerEvents="none"/>}</svg>
 {tool==='rotate'&&source&&commandPoints.length>0&&(()=>{const base=viewport?modelToPaper(commandPoints[0],viewport):commandPoints[0],x=view.x+base.x*view.scale,y=view.y+base.y*view.scale;let angle=rotationAngle(commandPoints[0],cursor,'');try{angle=rotationAngle(commandPoints[0],cursor,settings.rotation);}catch{/* Keep the pointer guide while the angle is incomplete. */}const radians=angle*Math.PI/180;return <svg aria-hidden="true" style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}}><line x1={x} y1={y} x2={x+Math.cos(radians)*70} y2={y-Math.sin(radians)*70} stroke="#299b88" strokeDasharray="5 4"/><circle cx={x} cy={y} r="5" fill="none" stroke="#299b88"/><path d={`M${x-9} ${y}h18M${x} ${y-9}v18`} stroke="#299b88"/></svg>;})()}
 {zoomStart&&zoomPointer&&zoomMode==='window'&&(()=>{const f=navigationFrame(),v=navigationView(),b=windowBox(zoomStart,zoomPointer);return <div className="zoom-window-preview" style={{left:f.x+v.x+b.x*v.scale,top:f.y+v.y+b.y*v.scale,width:b.width*v.scale,height:b.height*v.scale}}/>;})()}
 {pointerInside&&!contextPosition&&drawingCursor!=='pan'&&<svg className="cad-cursor" aria-hidden="true" data-cursor-mode={drawingCursor} width="86" height="86" viewBox="0 0 194 194" style={{left:pointerScreen.x-43,top:pointerScreen.y-43}}>{(drawingCursor==='idle'||drawingCursor==='point')&&<path d={drawingCursor==='idle'?'M0 97h90m14 0h90M97 0v90m0 14v90':'M0 97h194M97 0v194'}/>} {(drawingCursor==='idle'||drawingCursor==='object')&&<rect x="90" y="90" width="14" height="14"/>}{drawingCursor==='text'&&<path d="M91 80h12M97 80v34m-6 0h12"/>}{cursorBadge&&<path d={cursorBadge} strokeWidth="2"/>}{tool==='trim'&&!paper&&!choosingBoundaries&&commandPreview.length>0&&<path className="trim-cursor-badge" d="M110 64l16 16m0-16l-16 16" stroke="#ff3030" strokeWidth="2" strokeLinecap="round"/>}</svg>}
 {radiusEditor&&radiusPosition&&tool==='select'&&selected===radiusEditor.id&&<div className="dynamic-length" role="dialog" aria-label={t("Modifier le rayon")} style={{left:radiusPosition.x,top:radiusPosition.y}} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setRadiusEditor(null);}if(e.key==='Enter'){e.preventDefault();e.stopPropagation();applyRadiusEdit();}}}><label>{t("Rayon")}<input ref={radiusInput} autoFocus aria-label={t("Nouveau rayon du cercle")} inputMode="decimal" value={radiusEditor.text} onFocus={e=>e.currentTarget.select()} onChange={e=>setRadiusEditor({...radiusEditor,text:e.target.value})}/><span>{radiusEditor.unit}</span></label></div>}
 {tool==='offset'&&!offsetReady&&<div className="dynamic-length" style={{left:dynamicPosition.x,top:dynamicPosition.y}}><label>{t("distance")}<input ref={offsetInput} aria-label={t("distance")} inputMode="decimal" value={offsetText} onChange={e=>setOffsetText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();confirmOffsetDistance();}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cancelTool();e.currentTarget.blur();}}}/><span>{paper?'mm':unit}</span></label></div>}
 {tool==='rect'&&draft?.type==='rect'&&<div className="dynamic-length rectangle-dimensions" role="group" aria-label={t("Dimensions du rectangle")} style={{left:Math.max(8,Math.min(dynamicPosition.x,(svg.current?.clientWidth||800)-236)),top:Math.min(dynamicPosition.y,Math.max(8,(svg.current?.clientHeight||700)-144))}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();safe(()=>finishRectangle(rectangleEndpoint(draft.a,cursor,rectWidth,rectHeight,paper?'mm':unit)));}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cancelTool();}}}><div className="rectangle-dimensions-hint"><span>{t("Dimensions")}</span><small>{t("Tab : suivant · Entrée : valider")}</small></div>{(['width','height'] as const).map(axis=><label key={axis}>{axis==='width'?t("Largeur"):t("Hauteur")}<input autoFocus={axis==='width'} ref={axis==='width'?rectWidthInput:undefined} aria-label={t(axis==='width'?'Largeur du rectangle':'Hauteur du rectangle')} inputMode="decimal" value={axis==='width'?rectWidth:rectHeight} placeholder={t(displayDistance(Math.abs(axis==='width'?draft.b.x-draft.a.x:draft.b.y-draft.a.y),paper?'mm':unit))} onFocus={e=>{e.currentTarget.select();setMessage(axis==='width'?'Largeur · Tab pour la hauteur · Entrée pour valider.':'Hauteur · Entrée pour valider · Maj+Tab pour la largeur.');}} onChange={e=>{(axis==='width'?setRectWidth:setRectHeight)(e.target.value);}}/><span>{paper?'mm':unit}</span></label>)}</div>}
 {tool==='scale'&&source&&commandPoints.length>0&&<ScaleEntry session={scaleReference} value={commandText||(!scaleReference?settings.scaleFactor:'')} placeholder={(()=>{try{return String(Number(currentScale().toFixed(3)));}catch{return '';}})()} onValue={value=>setCommandText(value)} onSubmit={()=>scaleCommand()} onCancel={cancelTool} onReference={startScaleReference} onPoints={()=>scaleCommand('P')} unit={unit} style={{left:dynamicPosition.x,top:dynamicPosition.y}}/>}
 {tool==='rotate'&&source&&commandPoints.length>0&&<div className="dynamic-length" role="group" aria-label={t("Angle de rotation")} style={{left:dynamicPosition.x,top:dynamicPosition.y}}><label>{t("Angle")}<input ref={rotationInput} aria-label={t("Angle de rotation")} inputMode="decimal" value={settings.rotation} placeholder={String(Number(rotationAngle(commandPoints[0],cursor,'').toFixed(2)))} onFocus={e=>e.currentTarget.select()} onChange={e=>setSettings(v=>({...v,rotation:e.target.value}))} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();confirmRotation();}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cancelTool();}}}/><span>°</span></label><small>{t("Entrée : valider · Échap : annuler")}</small></div>}
 {dynamicStart&&<div className="dynamic-length" style={{left:dynamicPosition.x,top:dynamicPosition.y}}><label>{gripDisplacement?t("Distance"):(tool==='copy'||tool==='move')?t("Distance"):tool==='circle'?t("Rayon"):t("Longueur")}<input ref={lengthInput} aria-label={t(gripDisplacement?'Distance de déplacement':tool==='copy'?'Distance de copie':tool==='move'?'Distance de déplacement':tool==='circle'?'Rayon du cercle':'Longueur du segment')} inputMode="decimal" value={lengthText||displayDistance(distance(dynamicStart,dynamicEnd)*gripFactor,paper?'mm':unit)} onFocus={e=>e.currentTarget.select()} onChange={e=>setLengthText(e.target.value)} onKeyDown={e=>{if(!lengthText&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&/^[0-9.,+-]$/.test(e.key)){e.preventDefault();e.stopPropagation();setLengthText(e.key);return;}if(e.key==='Enter'){e.preventDefault();if(tool==='line'&&!lengthText)cancelTool();else confirmLength();}if(e.key==='Escape'){e.preventDefault();if(paletteOpen||suggestions.length){setPaletteOpen(false);setCommandText('');setCommandIndex(0);}else{cancelTool();e.currentTarget.blur();}}}}/><span>{paper?'mm':unit}</span></label></div>}
 {snapHit&&(!paper||isPaperDimensionTool(tool)||!!alignment.hit.current)&&<div className="snap-label">{t(snapHit.kind)}</div>}<div className="zoom"><button aria-label={t("Dézoomer")} onClick={()=>{const f=navigationFrame();applyNavigation(zoomAt(navigationView(),{x:f.width/2,y:f.height/2},1/1.2));}}><Minus size={15}/></button><span>{Math.round(view.scale*100)}%</span><button aria-label={t("Zoomer")} onClick={()=>{const f=navigationFrame();applyNavigation(zoomAt(navigationView(),{x:f.width/2,y:f.height/2},1.2));}}><Plus size={15}/></button><button aria-label={t("Cadrer le dessin")} onClick={fit}><Maximize size={16}/></button></div></main>
 <aside id={scope+'-properties'} aria-label={t("Outils et propriétés")} className="properties" hidden={!propertiesOpen}><div className="sidebar-header"><ToolHeading tool={tool}/>{propertiesOpen&&sidebarToggle}</div><SidebarSection id="help" title={t("Aide contextuelle")}><ToolHelp state={{tool,scaleReferencePhase:scaleReference?.phase,points:paperDimensionSession?.points.length??commandPoints.length,nodes:pathNodes.length,hasDraft:!!draft,hasSource:!!source||!!paperDimensionSession?.sourceId,sourceIsCircle:source?.type==='circle',selection:selectedIds.length||(selected?1:0),selectingArea:!!selectionDrag.current,lasso:selectionPreferences.lasso,choosingBoundaries,boundaries:boundaryIds.length,sweeping:trimTrail.length>1,offsetReady,segment:settings.segment,closed:settings.closed,linearSelectObject,hatchMode,hatchCount:hatchObjectIds.length,hatchOrigin:hatchOriginMode||!!hatchOriginTarget,joinTargets:joinPhase==='targets',measurement:!!measurement,pendingOption:closingCommand||closingJoin||lineOption==='C'?'close':lineOption==='U'?'undo':undefined}} shortcut={shortcut}/></SidebarSection>{sidebarError&&<p className="sidebar-error" role="alert">{t(sidebarError)}</p>}{(tool!=='select'||!active)&&<SidebarSection id="settings" title={t("Réglages de l’outil")}>{tool==='hatch'?<HatchPanel style={hatchStyle} onStyle={updateHatchStyle} mode={hatchMode} onMode={mode=>{setHatchMode(mode);setHatchObjectIds([]);setHatchGaps([]);}} separate={hatchSeparate} onSeparate={setHatchSeparate} count={hatchObjectIds.length} onApply={()=>confirmHatch()} onFinish={finishHatches} onOrigin={()=>setHatchOriginMode(v=>!v)} originMode={hatchOriginMode} onError={reportError}/>:tool==='join'?<section className="command-panel"><p>{t('Objets sélectionnés : ')}{selectedIds.length}</p>{joinSourceId&&<p>{t('Source : ')}{t(labels[(items.find(s=>s.id===joinSourceId)?.type||'line') as Tool])}</p>}<button className="wide" disabled={!selectedIds.length} onClick={finishJoin}>{t(joinPhase==='initial'&&selectedIds.length===1?'Utiliser comme source':'Joindre les objets')}</button>{joinArcSource?.type==='arc'&&<button className="wide" onClick={()=>applyJoin(selectedIds,true)}>{t('Fermer l’arc en cercle')}</button>}<button className="wide" onClick={cancelTool}>{t('Annuler la commande')}</button></section>:<CommandPanel onScaleReference={startScaleReference} scaleReferenceActive={!!scaleReference} scaleInstruction={scaleReference?scaleReferencePrompt(scaleReference):undefined} paper={paper} tool={tool} settings={paper&&isPaperDimensionTool(tool)?{...settings,dimensionText:paperDimensionText}:settings} setSettings={next=>{if(paper&&isPaperDimensionTool(tool)){setPaperDimensionText(next.dimensionText);setSettings({...next,dimensionText:settings.dimensionText});}else setSettings(next);}} shortcut={shortcut} onApply={applyNumeric} onFinish={()=>isSpecializedDimension(tool)||tool==='linearDimension'||tool==='diameter'||tool==='dimension'?cancelTool():finishPath()} points={paperDimensionSession?.points.length??(isSpecializedDimension(tool)?commandPoints.length:pathNodes.length)} boundaries={boundaryIds.length} choosing={choosingBoundaries} onBoundaries={chooseBoundaries} hasSource={!!source&&(!['rotate','scale'].includes(tool)||commandPoints.length>0)} />}
 {tool==='line'&&<div className="tool-actions"><button className="wide" onClick={cancelTool}>{t("Terminer la suite de lignes")}</button></div>}
 <div className="section-label">{t('APPARENCE')}</div><p>{t('Du calque')} · <span style={{color:layer.color}}>■</span> {layer.name}</p></SidebarSection>}
 {tool==='select'&&layout&&!active&&!viewport&&<SidebarSection id="layout" title={t("PRÉSENTATION")}><input className="wide-input" aria-label={t("Nom de présentation")} value={layout.name} onChange={e=>updateLayout({name:e.target.value})}/><label className="property-row">{t("Format")}<select aria-label={t("Format papier")} value={layout.format} onChange={e=>updateLayout({format:e.target.value as Layout['format']})}><option>{t("A4")}</option><option>{t("A3")}</option></select></label><label className="property-row">{t("Orientation")}<select aria-label={t("Orientation")} value={layout.orientation} onChange={e=>updateLayout({orientation:e.target.value as Layout['orientation']})}><option value="landscape">{t("Paysage")}</option><option value="portrait">{t("Portrait")}</option></select></label><label className="property-row">{t("Noir et blanc")}<input type="checkbox" checked={layout.monochrome} onChange={e=>updateLayout({monochrome:e.target.checked})}/></label><button className="wide" onClick={cartouche}>{t("Ajouter un cartouche")}</button><button className="wide" onClick={()=>pdf(true)}>{t("PDF de toutes les présentations")}</button><button className="delete wide" onClick={()=>{commit({...doc,layouts:doc.layouts.filter(l=>l.id!==layout.id)});switchSpace(null);}}>{t("Supprimer la présentation")}</button></SidebarSection>}

 {(tool==='select'||tool==='text')&&(active||selectedIds.length>0)&&<SidebarSection id="selection" title={t("Propriétés de la sélection")} count={selectedIds.length||(active?1:0)}>{selectedIds.length>1&&<p>{t('Objets sélectionnés : ')}{selectedIds.length}</p>}{active&&selectedIds.length<=1&&<><div className="section-label">{t("APPARENCE")}</div><ObjectAppearance doc={doc} shape={active} disabled={!editable(active)} onChange={edit}/><fieldset className="object-properties" disabled={!editable(active)}><div className="section-label">{commandName(active.type,active.type==='reference'?'Référence':labels[active.type])}</div>{!editable(active)&&<p className="locked-note">{t("Calque verrouillé : déverrouillez-le pour éditer cet objet.")}</p>}<UnitInput label={t("Position X")} value={active.type==='reference'?active.c.x:active.a.x} onValue={n=>edit(translate(active,n-(active.type==='reference'?active.c.x:active.a.x),0))} onError={reportError}/><UnitInput label={t("Position Y")} value={paper?(active.type==='reference'?active.c.y:active.a.y):-(active.type==='reference'?active.c.y:active.a.y)} onValue={n=>edit(translate(active,0,(paper?n:-n)-(active.type==='reference'?active.c.y:active.a.y)))} onError={reportError}/>
 {active.type==='reference'?references.fields(active):active.type==='hatch'?<><HatchFields value={active} onChange={style=>editHatchStyle(active,style)} onError={reportError} disabled={!editable(active)}/>{active.detachedReason&&<p className="locked-note">{active.detachedReason}</p>}<button className="wide" disabled={!editable(active)} onClick={()=>{setHatchOriginTarget(active.id);setMessage('Cliquez pour placer l’origine du motif · Échap annule.');}}>{t("Placer l’origine du motif")}</button><button className="wide" onClick={()=>{const ids=active.regions.flatMap(r=>r.sourceIds);setSelected(null);setSelectedIds([...new Set(ids)]);setMessage(ids.length?'Contours de hachure sélectionnés.':'Hachure indépendante : aucun contour lié.');}}>{t("Sélectionner le contour")}</button><button className="wide" disabled={!editable(active)} onClick={()=>redefineHatch(active)}>{t("Redéfinir la zone")}</button></>:active.type==='block'?<><div className="property-row">{t('Nom du bloc')}<strong>{doc.blocks?.find(b=>b.id===active.definitionId)?.name}</strong></div><UnitInput label={t('Insertion X')} value={active.a.x} onValue={n=>edit(translateItem(active,n-active.a.x,0))} onError={reportError}/><UnitInput label={t('Insertion Y')} value={-active.a.y} onValue={n=>edit(translateItem(active,0,-n-active.a.y))} onError={reportError}/>{numeric('Rotation (°)',-Math.atan2(active.b.y-active.a.y,active.b.x-active.a.x)*180/Math.PI,n=>safe(()=>commit(rotateSelection(doc,[active.id],active.a,n+Math.atan2(active.b.y-active.a.y,active.b.x-active.a.x)*180/Math.PI))))}{numeric('Facteur d’échelle',distance(active.a,active.b),n=>safe(()=>commit(scaleSelection(doc,[active.id],active.a,n/distance(active.a,active.b)))),.0001,1e5)}<button className="wide" onClick={()=>openBlockEditor(active.definitionId)}>{t('Éditer le bloc')}</button><button className="wide" onClick={()=>runBlockAction('explode')}>{t('Décomposer le bloc')}</button></>:active.type==='text'?<><label className="text-label">{t("Contenu")}<textarea aria-label={t("Texte")} value={active.text} onChange={e=>edit({...active,text:e.target.value})}/></label>{numeric('Hauteur (mm)',active.height,n=>{if(n>0)edit({...active,height:n});},.001,1e5)}{numeric('Rotation (°)',active.rotation||0,n=>edit({...active,rotation:n}))}</>:active.type==='circle'?<UnitInput label={t("Rayon")} value={bounds(active).width/2} onValue={n=>{if(n>0)edit({...active,b:{x:active.a.x+n,y:active.a.y}});else setMessage('Le rayon doit être positif.');}} onError={reportError}/>:active.type==='line'?<LineEditor shape={active} onChange={edit} onError={reportError}/>:active.type==='arc'?<ArcEditor paper={paper} shape={active} onChange={edit} onError={reportError}/>:active.type==='polyline'||active.type==='bezier'?<PathEditor shape={active} index={nodeIndex} setIndex={setNodeIndex} onChange={edit} onError={reportError}/>:active.type==='dimension'?<><div className="property-row">{t("Distance")}<span>{dimensionGeometry(active,unit).text}</span></div>{active.paperLink&&<p>{t('Cotation sur la feuille, liée au bâtiment à travers une fenêtre.')}</p>}{active.associationWarning&&<p role="status">{t(active.associationWarning)}</p>}{!active.points&&<UnitInput label={t("Décalage de la cote")} value={active.offset} onValue={n=>edit({...active,offset:n})} onError={reportError}/>}<UnitContext.Provider value="mm"><UnitInput label={t(active.paperLink?'Hauteur imprimée (mm)':'Texte cote (mm objet)')} value={active.height} onValue={n=>{if(n>0&&n<=1e5)edit({...active,height:n});else setMessage('Hauteur de cote invalide.');}} onError={reportError}/></UnitContext.Provider></>:<>{numeric('Largeur',Math.abs(active.b.x-active.a.x),n=>edit({...active,b:{...active.b,x:active.a.x+n}}),active.type==='viewport'?1:0)}{numeric('Hauteur',Math.abs(active.b.y-active.a.y),n=>edit({...active,b:{...active.b,y:active.a.y+n}}),active.type==='viewport'?1:0)}</>}
 {active.type==='viewport'&&viewportProperties(active)}<button className="delete" onClick={remove}><Trash2 size={14}/> {t("Supprimer l’objet")}</button></fieldset></>}</SidebarSection>}
 {viewport&&<SidebarSection id="layout" title={t("FENÊTRE DE VUE")}>{viewportProperties(viewport)}</SidebarSection>}
  <SidebarSection id="objects" title={t(paper?'Objets papier':'Objets du dessin')} count={items.length}><div className="object-list">{items.length===0?<p>{paper?'Feuille vide : ajoutez du texte, des formes ou des fenêtres.':t("Aucun objet.")}</p>:items.map((s,i)=><button key={s.id} className={selected===s.id||selectedIds.includes(s.id)?'chosen':''} onClick={e=>{if(e.shiftKey){const ids=selectedIds.length?selectedIds:selected?[selected]:[];setSelectedIds(ids.includes(s.id)?ids.filter(i=>i!==s.id):[...ids,s.id]);selectSingle(null);setTool('select');return;}setSelected(s.id);chooseTool('select');}}><span style={{color:appearance(s,doc.layers).color}}>{s.type==='text'?'T':s.type==='viewport'?'▣':s.type==='circle'?'○':s.type==='rect'?'□':'╱'}</span>{t(s.type==='reference'?'Référence':labels[s.type])}<small>{String(i+1).padStart(2,'0')}</small></button>)}</div></SidebarSection></aside></div>

 {layerManagerOpen&&<LayerManager doc={doc} current={layer.id} onApply={layers=>commit({...doc,layers})} onClose={()=>setLayerManagerOpen(false)}/>}
 {configuration&&<div className="settings-backdrop" onClick={()=>setConfiguration(false)}><section role="dialog" aria-modal="true" aria-label={t("Configuration")} className="app-settings settings-with-menu" onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Escape')setConfiguration(false);if(e.key==='Tab'){const controls=Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]),input,select,[tabindex="0"]'));const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}}>
 <div className="settings-heading"><h2>{t("Configuration")}</h2><button type="button" className="dialog-close" aria-label={t("Fermer la configuration")} title={t("Fermer")} onClick={()=>setConfiguration(false)}><CloseIcon size={18}/></button></div>
 <div className="settings-layout"><nav className="settings-navigation" aria-label={t("Rubriques de configuration")}>{([['general','Général'],['lang','Language'],['grid','Grille et résolution'],['selection','Sélection']] as const).map(([id,label],i)=><button key={id} autoFocus={i===0} aria-current={configurationPage===id?'page':undefined} onClick={()=>setConfigurationPage(id)}>{t(label)}</button>)}</nav>
 <div className="settings-body" key={configurationPage}>
 {configurationPage==='lang'&&<><h3>Language</h3><label>{t('Langue de l’interface')}<select aria-label={t('Langue de l’interface')} value={language} onChange={e=>setLanguage(e.target.value as Language)}><option value="fr" lang="fr">Français</option><option value="en" lang="en">English</option></select></label><label>{t('Langue d’affichage des commandes')}<select aria-label={t('Langue d’affichage des commandes')} value={commandLanguage} onChange={e=>setCommandLanguage(e.target.value as Language)}><option value="fr" lang="fr">Français</option><option value="en" lang="en">English</option></select></label><p>{t('La langue d’affichage des commandes ne modifie jamais les alias ni les raccourcis clavier.')}</p><p>{t('Le changement de langue est immédiat et conservé sur cet appareil.')}</p></>}
 {configurationPage==='general'&&<><h3>{t("Général")}</h3>{references.warningSetting}<label>{t("Unité de saisie et d’affichage")}<select aria-label={t("Unité de saisie")} value={unit} onChange={e=>setUnit(e.target.value as LengthUnit)}><option value="m">{t("Mètres (m)")}</option><option value="cm">{t("Centimètres (cm)")}</option><option value="mm">{t("Millimètres (mm)")}</option></select></label><p>{t("Les valeurs sans suffixe utilisent cette unité. Les dimensions du dessin restent identiques. L’espace papier reste en millimètres.")}</p></>}
 {configurationPage==='grid'&&<><h3>{t("Grille et résolution")}</h3><GridConfiguration value={drawingGrid} onChange={updateGrid} unit={unit} bindings={bindings} modelScale={gridScale} paperScale={view.scale} initialSpace={paper?'paper':'model'}/><p>{t("Ces réglages sont enregistrés dans le dessin. Les raccourcis se personnalisent dans Aide → Raccourcis clavier.")}</p></>}
 {configurationPage==='selection'&&<><h3>{t("Sélection")}</h3><fieldset className="selection-settings"><legend>{t("Sélection")}</legend>
 <label><span><input type="checkbox" role="switch" checked={selectionPreferences.lasso} onChange={e=>updateSelectionPreferences({lasso:e.target.checked})}/> {t("Autoriser le lasso en maintenant le bouton")}</span><small>{t("Dans une zone vide : maintenez et glissez pour le lasso ; cliquez puis relâchez et cliquez le second coin pour un rectangle. Lasso désactivé : le glissement trace un rectangle. Les sélections s’ajoutent ; Maj retire ; Échap annule.")}</small></label>
 <label><span><input type="checkbox" role="switch" checked={selectionPreferences.blue} onChange={e=>updateSelectionPreferences({blue:e.target.checked})}/> {t("Sélection bleue — entièrement contenus")}</span><small>{t("Rectangle : gauche vers droite. Lasso : mouvement initial vers la droite. Seuls les objets entièrement dans la zone sont sélectionnés ; ceux qui dépassent sont exclus.")}</small></label>
 <label><span><input type="checkbox" role="switch" checked={selectionPreferences.green} onChange={e=>updateSelectionPreferences({green:e.target.checked})}/> {t("Sélection verte — touchés ou contenus")}</span><small>{t("Rectangle : droite vers gauche. Lasso : mouvement initial vers la gauche. Les objets dans la zone ou touchant ou traversant son bord sont sélectionnés.")}</small></label>
 </fieldset></>}
 </div></div></section></div>}

 <footer aria-label={t("Barre de statut")}><nav className="layout-tabs" aria-label={t("Espaces du projet")}><button className="tab-scroll" aria-label={t("Défiler les layouts vers la gauche")} title={t("Layouts précédents")} disabled={!tabScroll.left} onClick={()=>scrollTabs(-1)}><ChevronLeft size={14}/></button><div className="layout-tab-strip" ref={layoutStrip} onScroll={updateTabScroll}><button aria-current={!layout?'page':undefined} className={!layout?'current':''} onClick={()=>switchSpace(null)}>{t("Objets")}</button>{doc.layouts.map(l=><button key={l.id} title={t(layoutDisplayName(l.name))} aria-current={layout?.id===l.id?'page':undefined} className={layout?.id===l.id?'current':''} onClick={()=>switchSpace(l.id)}>{layoutDisplayName(l.name)}</button>) }<button className="add-layout" aria-label={t("Ajouter un layout")} title={t("Ajouter un layout")} onClick={addLayout}><Plus size={14}/></button></div><button className="tab-scroll" aria-label={t("Défiler les layouts vers la droite")} title={t("Layouts suivants")} disabled={!tabScroll.right} onClick={()=>scrollTabs(1)}><ChevronRight size={14}/></button>{viewport&&<button className="return-paper" onClick={()=>{clear();setViewportId(null);setTool('select');}}>{t("Revenir au papier")}</button>}</nav><div className="command-entry" ref={commandAnchor}>{message!=='Prêt à dessiner'&&suggestions.length===0&&<div className="command-help" role="status" aria-live="polite" style={{maxWidth:helpMaxWidth}}>{t(statusText)}</div>}<input id={scope+"-command"} role="combobox" aria-label={t("Commande")} aria-autocomplete="list" aria-expanded={suggestions.length>0} aria-controls={scope+"-suggestions"} aria-activedescendant={suggestions.length?scope+'-option-'+commandIndex:undefined} value={commandText} placeholder={t("Entrer une commande")} title={t("Ctrl+Espace : toutes les commandes")} onChange={e=>{setCommandText(e.target.value.toUpperCase());setCommandIndex(0);}} onBlur={()=>setPaletteOpen(false)} onKeyDown={e=>{if(e.nativeEvent.isComposing||e.keyCode===229){e.stopPropagation();return;}if(e.repeat&&(e.key==='Enter'||e.key===' ')){e.preventDefault();return;}if(repeatIdle&&!commandText&&!paletteOpen&&isRepeatKey(e.nativeEvent,bindings)){e.preventDefault();if(!e.repeat)repeatLastTool();return;}if(repeatIdle&&!commandText&&!paletteOpen&&(e.key==='Enter'||e.key===' '))return;if((e.ctrlKey||e.metaKey)&&e.code==='Space'){e.preventDefault();setPaletteOpen(true);setCommandIndex(0);return;}if(e.key==='Enter'){e.preventDefault();executeCommand();if(document.activeElement===e.currentTarget)e.currentTarget.blur();}if(e.key==='Escape'){e.preventDefault();cancelTool();e.currentTarget.blur();}if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setCommandIndex(i=>(i+(e.key==='ArrowDown'?1:-1)+suggestions.length)%Math.max(1,suggestions.length));}}}/>{suggestions.length>0&&<div id={scope+"-suggestions"} role="listbox" className="command-suggestions">{suggestions.map((c,i)=><button id={scope+'-option-'+i} role="option" className={i===separatorIndex?'command-group-start':undefined} aria-selected={i===commandIndex} key={c.id} onMouseDown={e=>e.preventDefault()} onClick={()=>{executeCommand(c.id);(document.activeElement as HTMLElement)?.blur();}}><strong className="command-name">{commandName(c.id,c.name)}</strong><span className="command-shortcut">{bindings[c.id]?.[0]&&<kbd>{bindings[c.id][0]}</kbd>}</span><span className="command-description">{t(c.label)}</span></button>)}</div>}</div><span className="status-spacer" aria-hidden="true"/><div className="status-drafting"><button className={`status-mode ${grid?'enabled':''}`} aria-label={t("Afficher la grille")} aria-pressed={grid} title={t(statusTooltip(bindings,'grid','Grille',grid,true))} onClick={toggleGrid} onContextMenu={e=>{e.preventDefault();setConfigurationPage('grid');setConfiguration(true);}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M6 2v20M12 2v20M18 2v20M2 6h20M2 12h20M2 18h20"/></svg></button><button className={`status-mode ${snap?'enabled':''}`} aria-label={t("Résolution / accrochage à la grille")} aria-pressed={snap} title={t(statusTooltip(bindings,'gridSnap','Résolution / accrochage à la grille',snap,true))} onClick={toggleGridSnap} onContextMenu={e=>{e.preventDefault();setConfigurationPage('grid');setConfiguration(true);}}><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{[5,12,19].flatMap(x=>[5,12,19].map(y=><rect key={`${x}-${y}`} x={x-1.5} y={y-1.5} width="3" height="3"/>))}</svg></button><button className={`status-mode ${effectiveOrtho?'enabled':''}`} aria-label={t("Mode orthogonal")} aria-pressed={effectiveOrtho} title={t(statusTooltip(bindings,'ortho','Orthogonal',effectiveOrtho)+(shiftHeld?' temporairement':'')+' · Maj : inverser temporairement')} onClick={toggleOrtho}><svg className="ortho-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" focusable="false"><path d="M4 3v17h17M4 14h6v6"/></svg></button><StatusPrecision bindings={bindings} settings={settings} setSettings={setSettings} kinds={osnapKinds} setKinds={setOsnapKinds}/></div></footer></div></UnitContext.Provider>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
