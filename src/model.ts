import {defaultGrid,readGrid,type DrawingGrid} from './grid';
import {synchronizeDrawing} from './associations';
import { segments, dimensionGeometry } from './geometry';
import {validateHatchStyle,hatchBounds} from './hatch';
import {toModernDxf} from './dxf-modern';
import {polygonArea} from './hatch';
export type Point = { x: number; y: number };
export type BaseShape = { id: string; a: Point; b: Point; color: string; layerId?: string };
export type SimpleShape = { [K in 'line'|'rect'|'circle']: BaseShape & { type: K } }['line'|'rect'|'circle'];
export type ArcShape = BaseShape & {type:'arc';bulge:number};
export type Node = { p: Point; bulge?: number; in?: Point; out?: Point; smooth?: boolean };
export type PathShape = BaseShape & { type: 'polyline' | 'bezier'; nodes: Node[]; closed: boolean };
export type DimensionReference={id:string;segment:number;point:number;feature:'a'|'b'|'center'|'at'|'intersection';t?:number;other?:{id:string;segment:number}};
export type Dimension = BaseShape & { type: 'dimension'; offset: number; height: number; kind?: 'linear'|'diameter'|'angular'|'arcLength'|'radius'|'ordinate'|'jogged'; points?:Point[]; sweep?:number; axis?:'x'|'y'; basis?:Point; basisHandedness?:number; references?:DimensionReference[]; angleSources?:{id:string;segment:number;position:number}[]; circleId?: string; linearAngle?: number; paperLink?:{viewportId?:string;model:Dimension}; paperHidden?:boolean;angularQuadrants?:boolean;associationWarning?:string };
export type HatchStyle = {pattern:'SOLID'|'ANSI31'|'CROSS'|'BRICK'|'CONCRETE'|'USER';scale:number;angle:number;spacing:number;double:boolean;origin:Point;islands:'normal'|'outer'|'ignore';associative:boolean;mirrored?:boolean};
export type HatchRegion = {loops:Point[][];boundaryLoops?:Point[][];outerSourceIds?:string[];sourceIds:string[];seed:Point};
export type HatchShape = BaseShape & HatchStyle & {type:'hatch';regions:HatchRegion[];boundaryVersion?:number;detachedReason?:string};
export type Shape = SimpleShape | ArcShape | PathShape | Dimension | HatchShape | TextItem;
export type TextItem = BaseShape & { type: 'text'; text: string; height: number; rotation?:number; align?:'left'|'center'|'right'; vertical?:'top'|'baseline'|'middle'|'bottom' };
export type Viewport = BaseShape & { type: 'viewport'; center: Point; denominator: number; locked: boolean; printBorder: boolean };
export type PaperItem = Shape | TextItem | Viewport;
export type Layout = { id: string; name: string; format: 'A4' | 'A3'; orientation: 'portrait' | 'landscape'; monochrome: boolean; items: PaperItem[] };
export type Layer = { id: string; name: string; color: string; visible: boolean; locked: boolean };
export const defaultLayers = (): Layer[] => [{id:'0',name:'Dessin',color:'#b5ddd6',visible:true,locked:false},{id:'murs',name:'Murs',color:'#a6e0cf',visible:true,locked:false},{id:'ouvertures',name:'Ouvertures',color:'#e6b776',visible:true,locked:false},{id:'cotes',name:'Cotations',color:'#94bfea',visible:true,locked:false}];
export type Drawing = { format: 'jlg-cad'; version: 9; name: string; units: 'mm'; shapes: Shape[]; layouts: Layout[]; layers: Layer[]; grid?:DrawingGrid };
export const documentOf = (name: string, shapes: Shape[], layouts: Layout[] = [], layers: Layer[] = defaultLayers()): Drawing => ({ format: 'jlg-cad', version: 9, name, units: 'mm', shapes, layouts, layers, grid:defaultGrid() });
export const visibleShapes = (doc: Drawing) => doc.shapes.filter(s=>doc.layers.find(l=>l.id===(s.layerId||'0'))?.visible!==false);
export const lockedShape = (doc: Drawing, s: Shape) => !!doc.layers.find(l=>l.id===(s.layerId||'0'))?.locked;
export const newLayout = (id: string, name: string): Layout => ({ id, name, format: 'A4', orientation: 'landscape', monochrome: true, items: [] });
export function paperSize(layout: Layout): Point {
  const [short,long] = layout.format === 'A3' ? [297,420] : [210,297];
  return layout.orientation === 'landscape' ? { x:long,y:short } : { x:short,y:long };
}
export function bounds(item: PaperItem) {
  if(item.type==='text'){const ps=textCorners(item),x=Math.min(...ps.map(p=>p.x)),y=Math.min(...ps.map(p=>p.y));return{x,y,width:Math.max(...ps.map(p=>p.x))-x,height:Math.max(...ps.map(p=>p.y))-y};}
  if(item.type==='hatch'){const {a,b}=hatchBounds(item.regions);return{x:a.x,y:a.y,width:b.x-a.x,height:b.y-a.y};}
  if(item.type==='arc'||item.type==='polyline'||item.type==='bezier') {
    const points=item.type==='arc'?[item.a,item.b]:item.nodes.flatMap(n=>[n.p,...(n.in?[n.in]:[]),...(n.out?[n.out]:[])]);
    // Include only extrema on the arc, so import dimensions and framing remain meaningful.
    if(item.type==='arc'||item.type==='polyline')for(const seg of segments(item))if(seg.kind==='arc')for(let i=0;i<4;i++){const angle=i*Math.PI/2,tau=2*Math.PI,delta=seg.sweep>0?((angle-seg.start)%tau+tau)%tau:((seg.start-angle)%tau+tau)%tau;if(delta<=Math.abs(seg.sweep)+1e-10)points.push({x:seg.center.x+seg.radius*Math.cos(angle),y:seg.center.y+seg.radius*Math.sin(angle)});}
    const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y));return{x,y,width:Math.max(...points.map(p=>p.x))-x,height:Math.max(...points.map(p=>p.y))-y};
  }
  if(item.type==='dimension'&&(item.kind==='diameter'||item.linearAngle!==undefined||!!item.points)){const d=dimensionGeometry(item),ps=[...d.lines.flat(),...d.arrows.flat(),d.label];const x=Math.min(...ps.map(p=>p.x))-item.height,y=Math.min(...ps.map(p=>p.y))-item.height;return{x,y,width:Math.max(...ps.map(p=>p.x))-x+item.height,height:Math.max(...ps.map(p=>p.y))-y+item.height};}
  if(item.type==='dimension'){const dx=item.b.x-item.a.x,dy=item.b.y-item.a.y,length=Math.hypot(dx,dy)||1,n={x:-dy/length*item.offset,y:dx/length*item.offset},ps=[item.a,item.b,{x:item.a.x+n.x,y:item.a.y+n.y},{x:item.b.x+n.x,y:item.b.y+n.y}];const x=Math.min(...ps.map(p=>p.x)),y=Math.min(...ps.map(p=>p.y));return{x,y,width:Math.max(...ps.map(p=>p.x))-x,height:Math.max(...ps.map(p=>p.y))-y};}
  const radius = item.type === 'circle' ? Math.hypot(item.b.x-item.a.x,item.b.y-item.a.y) : 0;
  return item.type === 'circle' ? {x:item.a.x-radius,y:item.a.y-radius,width:radius*2,height:radius*2} : {x:Math.min(item.a.x,item.b.x),y:Math.min(item.a.y,item.b.y),width:Math.abs(item.b.x-item.a.x),height:Math.abs(item.b.y-item.a.y)};
}
export function textCorners(s:TextItem):Point[]{
 const lines=s.text.split('\n'),width=Math.max(1,...lines.map(l=>l.length))*s.height*.65,height=lines.length*s.height*1.2;
 const x=s.align==='center'?-width/2:s.align==='right'?-width:0,y=s.vertical==='baseline'?-s.height*.8:s.vertical==='bottom'?-height:s.vertical==='middle'?-height/2:0;
 const angle=(s.rotation||0)*Math.PI/180,c=Math.cos(angle),sin=Math.sin(angle);
 return [{x,y},{x:x+width,y},{x:x+width,y:y+height},{x,y:y+height}].map(p=>({x:s.a.x+c*p.x-sin*p.y,y:s.a.y+sin*p.x+c*p.y}));
}
export function textLineOffset(s:TextItem):number{const extra=(s.text.split('\n').length-1)*s.height*1.2;return s.vertical==='bottom'?-extra:s.vertical==='middle'?-extra/2:0;}
export function modelToPaper(p: Point, viewport: Viewport): Point {
  const r=bounds(viewport);
  return {x:r.x+r.width/2+(p.x-viewport.center.x)/viewport.denominator,y:r.y+r.height/2+(p.y-viewport.center.y)/viewport.denominator};
}
export function paperToModel(p: Point, viewport: Viewport): Point {
  const r=bounds(viewport);
  return {x:viewport.center.x+(p.x-r.x-r.width/2)*viewport.denominator,y:viewport.center.y+(p.y-r.y-r.height/2)*viewport.denominator};
}
export function fitViewport(viewport: Viewport, shapes: Shape[]): Viewport {
  if(!shapes.length)return viewport;
  const boxes=shapes.map(bounds),left=Math.min(...boxes.map(r=>r.x)),top=Math.min(...boxes.map(r=>r.y)),right=Math.max(...boxes.map(r=>r.x+r.width)),bottom=Math.max(...boxes.map(r=>r.y+r.height)),r=bounds(viewport);
  const required=Math.max((right-left)/(r.width*.9),(bottom-top)/(r.height*.9),.01);
  const denominator=[.01,.02,.05,.1,.2,.5,1,2,5,10,20,50,100,200,500,1000,2000,5000,10000].find(n=>n>=required)||10000;
  return {...viewport,center:{x:(left+right)/2,y:(top+bottom)/2},denominator};
}
export function parseDrawing(text: string): Drawing {
  const d = JSON.parse(text);
  const point = (p: Point) => p && Number.isFinite(p.x) && Number.isFinite(p.y) && Math.abs(p.x) <= 1e7 && Math.abs(p.y) <= 1e7;
  const base = (s: PaperItem) => s && typeof s.id === 'string' && point(s.a) && point(s.b) && typeof s.color === 'string' && /^#[0-9a-f]{6}$/i.test(s.color);
  const unique = (items: {id:string}[]) => items.every(s=>s&&typeof s.id==='string') && new Set(items.map(s=>s.id)).size === items.length;
  const hatchValid=(s:HatchShape)=>{
    try{
      validateHatchStyle(s);
      const loopValid=(loop:Point[])=>Array.isArray(loop)&&loop.length>=3&&loop.length<=20000&&loop.every(point)&&Math.abs(polygonArea(loop))>1e-6;
      const loopsValid=(loops:Point[][])=>Array.isArray(loops)&&loops.length>0&&loops.length<=1000&&loops.every(loopValid);
      const idsValid=(ids:string[])=>Array.isArray(ids)&&ids.length<=50000&&ids.every(id=>typeof id==='string'&&id.length>0)&&new Set(ids).size===ids.length;
      return point(s.origin)&&d.version>=5&&Array.isArray(s.regions)&&s.regions.length>0&&s.regions.length<=1000
        &&s.regions.every(r=>point(r.seed)&&idsValid(r.sourceIds)&&loopsValid(r.loops)&&(r.boundaryLoops===undefined||loopsValid(r.boundaryLoops))&&(r.outerSourceIds===undefined||idsValid(r.outerSourceIds)&&r.outerSourceIds.every(id=>r.sourceIds.includes(id))))
        &&s.regions.reduce((sum,r)=>sum+r.loops.flat().length+(r.boundaryLoops?.flat().length||0),0)<=100000
        &&(s.boundaryVersion===undefined||Number.isSafeInteger(s.boundaryVersion)&&s.boundaryVersion>=0&&s.boundaryVersion<1e7)
        &&(s.detachedReason===undefined||typeof s.detachedReason==='string');
    }catch{return false;}
  };
  const validDimensionData=(s:Dimension)=>{
   if(s.kind!==undefined&&!['linear','diameter','angular','arcLength','radius','ordinate','jogged'].includes(s.kind))return false;
   if(s.linearAngle!==undefined&&!Number.isFinite(s.linearAngle))return false;
   const extended=['angular','arcLength','radius','ordinate','jogged'].includes(s.kind||'');
   if(extended&&!s.points)return false;
   if(s.points&&!extended&&s.kind!=='diameter')return false;
   if((extended||s.references||s.angleSources)&&d.version<8)return false;
   if(s.points&&(!Array.isArray(s.points)||s.points.length!==(s.kind==='ordinate'?3:s.kind==='jogged'?6:4)||!s.points.every(point)))return false;
   if(s.points&&s.kind!=='ordinate'&&Math.hypot(s.points[0].x-s.points[1].x,s.points[0].y-s.points[1].y)<.001)return false;
   if(s.sweep!==undefined&&(!Number.isFinite(s.sweep)||Math.abs(s.sweep)>Math.PI*2+1e-8))return false;
   if(s.kind==='arcLength'&&(!s.sweep||Math.abs(s.sweep)>=Math.PI*2-1e-8))return false;
   if(s.basisHandedness!==undefined&&s.basisHandedness!==1&&s.basisHandedness!==-1)return false;
   if(s.basis&&(!point(s.basis)||Math.abs(Math.hypot(s.basis.x,s.basis.y)-1)>1e-6))return false;
   if(s.axis!==undefined&&!['x','y'].includes(s.axis))return false;
   if(s.references&&(!Array.isArray(s.references)||s.references.length>12||!s.references.every(r=>typeof r.id==='string'&&Number.isInteger(r.segment)&&r.segment>=0&&Number.isInteger(r.point)&&r.point>=0&&r.point<(s.points?.length||2)&&['a','b','center','at','intersection'].includes(r.feature)&&(r.feature!=='at'||Number.isFinite(r.t)&&r.t!>=0&&r.t!<=1)&&(r.feature!=='intersection'||!!r.other&&typeof r.other.id==='string'&&Number.isInteger(r.other.segment)&&r.other.segment>=0))))return false;
   if(s.angleSources&&(!Array.isArray(s.angleSources)||s.angleSources.length!==2||!s.angleSources.every(r=>typeof r.id==='string'&&Number.isInteger(r.segment)&&r.segment>=0&&Number.isFinite(r.position)&&r.position>=0&&r.position<=1)))return false;
   if(s.angularQuadrants!==undefined&&typeof s.angularQuadrants!=='boolean')return false;
   if(s.paperHidden!==undefined&&typeof s.paperHidden!=='boolean')return false;
   if(s.associationWarning!==undefined&&typeof s.associationWarning!=='string')return false;
   if(s.paperLink){
    if(d.version<9||!s.paperLink.model||s.paperLink.model.paperLink||s.paperLink.model.type!=='dimension'||!base(s.paperLink.model)||!Number.isFinite(s.paperLink.model.offset)||!Number.isFinite(s.paperLink.model.height)||s.paperLink.model.height<=0||s.paperLink.model.height>1e7||!validDimensionData(s.paperLink.model))return false;
    if(s.paperLink.viewportId!==undefined&&(typeof s.paperLink.viewportId!=='string'||!s.paperLink.viewportId))return false;
   }
   return true;
  };
  const list = (items: PaperItem[], paper=false) => Array.isArray(items) && items.length <= 50000 && unique(items) && items.every(s => base(s) && (s.layerId===undefined||typeof s.layerId==='string') && ((s.type==='hatch'&&hatchValid(s)) || ['line','rect','circle'].includes(s.type) || (s.type==='arc'&&d.version>=7&&Number.isFinite(s.bulge)&&Math.abs(s.bulge)>1e-12&&Math.abs(s.bulge)<1e12&&Math.hypot(s.b.x-s.a.x,s.b.y-s.a.y)>1e-8) || ((s.type==='polyline'||s.type==='bezier') && Array.isArray(s.nodes) && s.nodes.length>=2 && s.nodes.length<=5000 && typeof s.closed==='boolean' && s.nodes.every(n=>point(n.p) && (n.bulge===undefined||Number.isFinite(n.bulge)&&Math.abs(n.bulge)<1e4) && (!n.in||point(n.in)) && (!n.out||point(n.out)) && (n.smooth===undefined||typeof n.smooth==='boolean'))) || (s.type==='dimension'&&(!s.paperLink||paper)&&(s.kind===undefined||['linear','diameter','angular','arcLength','radius','ordinate','jogged'].includes(s.kind))&&validDimensionData(s)&&(s.linearAngle===undefined||s.kind!=='diameter'&&Number.isFinite(s.linearAngle))&&(s.circleId===undefined||d.version>=4&&s.kind==='diameter'&&typeof s.circleId==='string'&&s.circleId.length>0)&&Number.isFinite(s.offset)&&Math.abs(s.offset)<=1e7&&Number.isFinite(s.height)&&s.height>0&&s.height<=1e5) || ((s.type==='text' && (paper||d.version>=6) && typeof s.text==='string' && s.text.length<=10000 && Number.isFinite(s.height) && s.height>0 && s.height<=1e5 && (s.rotation===undefined||Number.isFinite(s.rotation)) && (s.align===undefined||['left','center','right'].includes(s.align)) && (s.vertical===undefined||['top','baseline','middle','bottom'].includes(s.vertical))) || (paper && s.type==='viewport' && point(s.center) && Number.isFinite(s.denominator) && s.denominator>=.01 && s.denominator<=10000 && typeof s.locked==='boolean' && typeof s.printBorder==='boolean' && bounds(s).width>0 && bounds(s).height>0))));
  if (!d || d.format !== 'jlg-cad' || ![1,2,3,4,5,6,7,8,9].includes(d.version) || d.units !== 'mm' || typeof d.name !== 'string' || !list(d.shapes)) throw new Error('Ce fichier n’est pas un projet JLG CAD valide.');
  if(d.version===1) return documentOf(d.name,d.shapes);
  if(!Array.isArray(d.layouts) || d.layouts.length>100 || !unique(d.layouts) || !d.layouts.every((l:Layout)=>l && typeof l.id==='string' && typeof l.name==='string' && ['A4','A3'].includes(l.format) && ['portrait','landscape'].includes(l.orientation) && typeof l.monochrome==='boolean' && list(l.items,true))) throw new Error('Les présentations du fichier sont invalides.');
  if(d.version>=3&&(!Array.isArray(d.layers)||!d.layers.length||d.layers.length>200||!unique(d.layers)||!d.layers.some((l:Layer)=>l.id==='0')||!d.layers.every((l:Layer)=>typeof l.name==='string'&&/^#[0-9a-f]{6}$/i.test(l.color)&&typeof l.visible==='boolean'&&typeof l.locked==='boolean')||d.shapes.some((s:Shape)=>s.layerId&&!d.layers.some((l:Layer)=>l.id===s.layerId))))throw new Error('Les calques du fichier sont invalides.');
  const validateLinks=(items:PaperItem[])=>{
   const byId=new Map(items.map(s=>[s.id,s])),modelById=new Map<string,PaperItem>(d.shapes.map((s:Shape)=>[s.id,s]));
   const dimensionSource=(sources:Map<string,PaperItem>,id:string,segment:number)=>{const target=sources.get(id);return target&&!['dimension','hatch','text','viewport'].includes(target.type)?segments(target as Shape)[segment]:undefined;};
   const dimensionLinks=(s:Dimension,sources:Map<string,PaperItem>)=>{
    if(s.references?.some(r=>{const part=dimensionSource(sources,r.id,r.segment);return !part||r.feature==='center'&&part.kind!=='arc'||r.feature==='intersection'&&(!r.other||!dimensionSource(sources,r.other.id,r.other.segment));}))return false;
    if(s.angleSources?.some(r=>dimensionSource(sources,r.id,r.segment)?.kind!=='line'))return false;
    return !s.circleId||d.version>=4&&sources.get(s.circleId)?.type==='circle';
   };
   return items.every(s=>{
    if(s.type==='dimension'){
     if(!dimensionLinks(s,byId))return false;
     if(s.paperLink){
      if(s.references?.length||s.angleSources?.length||s.circleId)return false;
      if(s.paperLink.viewportId&&byId.get(s.paperLink.viewportId)?.type!=='viewport')return false;
      if(!s.paperLink.viewportId&&(s.paperLink.model.references?.length||s.paperLink.model.angleSources?.length||s.paperLink.model.circleId))return false;
      return dimensionLinks(s.paperLink.model,modelById);
     }
     return true;
    }
    return s.type!=='hatch'||!s.associative||s.regions.every(r=>r.sourceIds.length>0&&r.sourceIds.every(id=>{const source=byId.get(id);return source&&!['hatch','dimension','text','viewport'].includes(source.type);}));
   });
  };
  if(!validateLinks(d.shapes)||!d.layouts.every((l:Layout)=>validateLinks(l.items)))throw new Error('La liaison d’une cotation à son cercle est invalide.');
  return synchronizeDrawing({...documentOf(d.name,d.shapes,d.layouts,d.version>=3?d.layers:defaultLayers()),grid:readGrid(d.grid)});
}
export function toDxf(shapes: Shape[], layers: Layer[] = defaultLayers(),displayUnit:'m'|'cm'|'mm'='mm') {
  return toModernDxf(shapes,layers,displayUnit);
}

export function layoutDisplayName(name:string){return name.replace(/^Présentation (\d+)$/,'Layout $1');}
export function nextLayoutName(layouts:Pick<Layout,'name'>[]){const numbers=layouts.map(l=>/^(?:Layout|Présentation) (\d+)$/i.exec(l.name)).filter(m=>m!==null).map(m=>Number(m![1]));return 'Layout '+(Math.max(0,...numbers)+1);}
