import {defaultGrid,readGrid,type DrawingGrid} from './grid';
import {synchronizeDrawing} from './associations';
import { segments, flatten, dimensionGeometry } from './geometry';
import {validateHatchStyle,hatchBounds} from './hatch';
import {toModernDxf} from './dxf-modern';
import {polygonArea} from './hatch';
export type Point = { x: number; y: number };
export type BaseShape = { id: string; a: Point; b: Point; color: string; layerId?: string };
export type SimpleShape = { [K in 'line'|'rect'|'circle']: BaseShape & { type: K } }['line'|'rect'|'circle'];
export type Node = { p: Point; bulge?: number; in?: Point; out?: Point; smooth?: boolean };
export type PathShape = BaseShape & { type: 'polyline' | 'bezier'; nodes: Node[]; closed: boolean };
export type Dimension = BaseShape & { type: 'dimension'; offset: number; height: number; kind?: 'linear'|'diameter'; circleId?: string; linearAngle?: number };
export type HatchStyle = {pattern:'SOLID'|'ANSI31'|'CROSS'|'BRICK'|'CONCRETE'|'USER';scale:number;angle:number;spacing:number;double:boolean;origin:Point;islands:'normal'|'outer'|'ignore';associative:boolean;mirrored?:boolean};
export type HatchRegion = {loops:Point[][];boundaryLoops?:Point[][];outerSourceIds?:string[];sourceIds:string[];seed:Point};
export type HatchShape = BaseShape & HatchStyle & {type:'hatch';regions:HatchRegion[];boundaryVersion?:number;detachedReason?:string};
export type Shape = SimpleShape | PathShape | Dimension | HatchShape;
export type TextItem = BaseShape & { type: 'text'; text: string; height: number };
export type Viewport = BaseShape & { type: 'viewport'; center: Point; denominator: number; locked: boolean; printBorder: boolean };
export type PaperItem = Shape | TextItem | Viewport;
export type Layout = { id: string; name: string; format: 'A4' | 'A3'; orientation: 'portrait' | 'landscape'; monochrome: boolean; items: PaperItem[] };
export type Layer = { id: string; name: string; color: string; visible: boolean; locked: boolean };
export const defaultLayers = (): Layer[] => [{id:'0',name:'Dessin',color:'#b5ddd6',visible:true,locked:false},{id:'murs',name:'Murs',color:'#a6e0cf',visible:true,locked:false},{id:'ouvertures',name:'Ouvertures',color:'#e6b776',visible:true,locked:false},{id:'cotes',name:'Cotations',color:'#94bfea',visible:true,locked:false}];
export type Drawing = { format: 'jlg-cad'; version: 5; name: string; units: 'mm'; shapes: Shape[]; layouts: Layout[]; layers: Layer[]; grid?:DrawingGrid };
export const documentOf = (name: string, shapes: Shape[], layouts: Layout[] = [], layers: Layer[] = defaultLayers()): Drawing => ({ format: 'jlg-cad', version: 5, name, units: 'mm', shapes, layouts, layers, grid:defaultGrid() });
export const visibleShapes = (doc: Drawing) => doc.shapes.filter(s=>doc.layers.find(l=>l.id===(s.layerId||'0'))?.visible!==false);
export const lockedShape = (doc: Drawing, s: Shape) => !!doc.layers.find(l=>l.id===(s.layerId||'0'))?.locked;
export const newLayout = (id: string, name: string): Layout => ({ id, name, format: 'A4', orientation: 'landscape', monochrome: true, items: [] });
export function paperSize(layout: Layout): Point {
  const [short,long] = layout.format === 'A3' ? [297,420] : [210,297];
  return layout.orientation === 'landscape' ? { x:long,y:short } : { x:short,y:long };
}
export function bounds(item: PaperItem) {
  if(item.type==='hatch'){const {a,b}=hatchBounds(item.regions);return{x:a.x,y:a.y,width:b.x-a.x,height:b.y-a.y};}
  if(item.type==='polyline'||item.type==='bezier') {
    const points=item.nodes.flatMap(n=>[n.p,...(n.in?[n.in]:[]),...(n.out?[n.out]:[])]);
    // A bulged arc can extend beyond its chord. Include its full circle conservatively.
    if(item.type==='polyline')item.nodes.forEach((n,i)=>{const next=item.nodes[(i+1)%item.nodes.length];if(!next||(!item.closed&&i===item.nodes.length-1)||!n.bulge)return;const dx=next.p.x-n.p.x,dy=next.p.y-n.p.y,b=n.bulge,c={x:(n.p.x+next.p.x)/2-dy*(1-b*b)/(4*b),y:(n.p.y+next.p.y)/2+dx*(1-b*b)/(4*b)},r=Math.hypot(dx,dy)*(1+b*b)/(4*Math.abs(b));points.push({x:c.x-r,y:c.y-r},{x:c.x+r,y:c.y+r});});
    const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y));return{x,y,width:Math.max(...points.map(p=>p.x))-x,height:Math.max(...points.map(p=>p.y))-y};
  }
  if(item.type==='dimension'&&(item.kind==='diameter'||item.linearAngle!==undefined)){const d=dimensionGeometry(item),ps=[...d.lines.flat(),...d.arrows.flat(),d.label];const x=Math.min(...ps.map(p=>p.x))-item.height,y=Math.min(...ps.map(p=>p.y))-item.height;return{x,y,width:Math.max(...ps.map(p=>p.x))-x+item.height,height:Math.max(...ps.map(p=>p.y))-y+item.height};}
  if(item.type==='dimension'){const dx=item.b.x-item.a.x,dy=item.b.y-item.a.y,length=Math.hypot(dx,dy)||1,n={x:-dy/length*item.offset,y:dx/length*item.offset},ps=[item.a,item.b,{x:item.a.x+n.x,y:item.a.y+n.y},{x:item.b.x+n.x,y:item.b.y+n.y}];const x=Math.min(...ps.map(p=>p.x)),y=Math.min(...ps.map(p=>p.y));return{x,y,width:Math.max(...ps.map(p=>p.x))-x,height:Math.max(...ps.map(p=>p.y))-y};}
  const radius = item.type === 'circle' ? Math.hypot(item.b.x-item.a.x,item.b.y-item.a.y) : 0;
  return item.type === 'circle' ? {x:item.a.x-radius,y:item.a.y-radius,width:radius*2,height:radius*2} : {x:Math.min(item.a.x,item.b.x),y:Math.min(item.a.y,item.b.y),width:Math.abs(item.b.x-item.a.x),height:Math.abs(item.b.y-item.a.y)};
}
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
  const list = (items: PaperItem[], paper=false) => Array.isArray(items) && items.length <= 50000 && unique(items) && items.every(s => base(s) && (s.layerId===undefined||typeof s.layerId==='string') && ((s.type==='hatch'&&hatchValid(s)) || ['line','rect','circle'].includes(s.type) || ((s.type==='polyline'||s.type==='bezier') && Array.isArray(s.nodes) && s.nodes.length>=2 && s.nodes.length<=5000 && typeof s.closed==='boolean' && s.nodes.every(n=>point(n.p) && (n.bulge===undefined||Number.isFinite(n.bulge)&&Math.abs(n.bulge)<1e4) && (!n.in||point(n.in)) && (!n.out||point(n.out)) && (n.smooth===undefined||typeof n.smooth==='boolean'))) || (s.type==='dimension'&&(s.kind===undefined||s.kind==='linear'||s.kind==='diameter')&&(s.linearAngle===undefined||s.kind!=='diameter'&&Number.isFinite(s.linearAngle))&&(s.circleId===undefined||d.version>=4&&s.kind==='diameter'&&typeof s.circleId==='string'&&s.circleId.length>0)&&Number.isFinite(s.offset)&&Math.abs(s.offset)<=1e7&&Number.isFinite(s.height)&&s.height>0&&s.height<=1e5) || (paper && ((s.type==='text' && typeof s.text==='string' && s.text.length<=10000 && Number.isFinite(s.height) && s.height>=.5 && s.height<=100) || (s.type==='viewport' && point(s.center) && Number.isFinite(s.denominator) && s.denominator>=.01 && s.denominator<=10000 && typeof s.locked==='boolean' && typeof s.printBorder==='boolean' && bounds(s).width>0 && bounds(s).height>0)))));
  if (!d || d.format !== 'jlg-cad' || ![1,2,3,4,5].includes(d.version) || d.units !== 'mm' || typeof d.name !== 'string' || !list(d.shapes)) throw new Error('Ce fichier n’est pas un projet JLG CAD valide.');
  if(d.version===1) return documentOf(d.name,d.shapes);
  if(!Array.isArray(d.layouts) || d.layouts.length>100 || !unique(d.layouts) || !d.layouts.every((l:Layout)=>l && typeof l.id==='string' && typeof l.name==='string' && ['A4','A3'].includes(l.format) && ['portrait','landscape'].includes(l.orientation) && typeof l.monochrome==='boolean' && list(l.items,true))) throw new Error('Les présentations du fichier sont invalides.');
  if(d.version>=3&&(!Array.isArray(d.layers)||!d.layers.length||d.layers.length>200||!unique(d.layers)||!d.layers.some((l:Layer)=>l.id==='0')||!d.layers.every((l:Layer)=>typeof l.name==='string'&&/^#[0-9a-f]{6}$/i.test(l.color)&&typeof l.visible==='boolean'&&typeof l.locked==='boolean')||d.shapes.some((s:Shape)=>s.layerId&&!d.layers.some((l:Layer)=>l.id===s.layerId))))throw new Error('Les calques du fichier sont invalides.');
  const validateLinks=(items:PaperItem[])=>{const byId=new Map(items.map(s=>[s.id,s]));return items.every(s=>s.type==='hatch'?(!s.associative||s.regions.every(r=>r.sourceIds.length>0&&r.sourceIds.every(id=>{const source=byId.get(id);return source&&source.type!=='hatch'&&source.type!=='dimension'&&source.type!=='text'&&source.type!=='viewport';}))):s.type!=='dimension'||!s.circleId||d.version>=4&&byId.get(s.circleId)?.type==='circle');};
  if(!validateLinks(d.shapes)||!d.layouts.every((l:Layout)=>validateLinks(l.items)))throw new Error('La liaison d’une cotation à son cercle est invalide.');
  return synchronizeDrawing({...documentOf(d.name,d.shapes,d.layouts,d.version>=3?d.layers:defaultLayers()),grid:readGrid(d.grid)});
}
export function toDxf(shapes: Shape[], layers: Layer[] = defaultLayers(),displayUnit:'m'|'cm'|'mm'='mm') {
  if(shapes.some(s=>s.type==='hatch'))return toModernDxf(shapes,layers,displayUnit);
  const names=new Map(layers.map((l,i)=>[l.id,l.id==='0'?'0':`${l.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,80)}_${i}`]));
  const pairs: (string | number)[] = [0,'SECTION',2,'HEADER',9,'$ACADVER',1,'AC1009',0,'ENDSEC',0,'SECTION',2,'TABLES',0,'TABLE',2,'LAYER',70,layers.length];
  for(const l of layers)pairs.push(0,'LAYER',2,names.get(l.id)!,70,l.locked?4:0,62,l.visible?7:-7,6,'CONTINUOUS');
  pairs.push(0,'ENDTAB',0,'ENDSEC',0,'SECTION',2,'ENTITIES');
  let layer='0';
  const line = (a: Point,b: Point) => pairs.push(0,'LINE',8,layer,10,a.x,20,-a.y,30,0,11,b.x,21,-b.y,31,0);
  const polyline=(nodes:{p:Point;bulge?:number}[],closed:boolean)=>{pairs.push(0,'POLYLINE',8,layer,66,1,70,closed?1:0,10,0,20,0,30,0);for(const n of nodes)pairs.push(0,'VERTEX',8,layer,10,n.p.x,20,-n.p.y,30,0,42,-(n.bulge||0));pairs.push(0,'SEQEND',8,layer);};
  for (const s of shapes) {
    layer=names.get(s.layerId||'0')||'0';
    if(s.type==='hatch')continue;
    else if (s.type === 'line') line(s.a,s.b);
    else if (s.type === 'circle') pairs.push(0,'CIRCLE',8,layer,10,s.a.x,20,-s.a.y,30,0,40,Math.hypot(s.b.x-s.a.x,s.b.y-s.a.y));
    else if(s.type==='polyline')polyline(s.nodes,s.closed);
    else if(s.type==='bezier'){const nodes=segments(s).flatMap((seg,i)=>flatten(seg,.1).slice(i?1:0).map(p=>({p:p.p})));if(s.closed)nodes.pop();polyline(nodes,s.closed);}
    else if(s.type==='dimension'){const d=dimensionGeometry(s,displayUnit);d.lines.forEach(([a,b])=>line(a,b));d.arrows.forEach(ps=>pairs.push(0,'SOLID',8,layer,10,ps[0].x,20,-ps[0].y,30,0,11,ps[1].x,21,-ps[1].y,31,0,12,ps[2].x,22,-ps[2].y,32,0,13,ps[2].x,23,-ps[2].y,33,0));pairs.push(0,'TEXT',8,layer,10,d.label.x,20,-d.label.y,30,0,40,s.height,1,d.text.replace('Ø','%%c'),50,d.angle,72,1,11,d.label.x,21,-d.label.y,31,0);}
    else { const c = { x:s.b.x,y:s.a.y }, d = { x:s.a.x,y:s.b.y }; line(s.a,c); line(c,s.b); line(s.b,d); line(d,s.a); }
  }
  pairs.push(0,'ENDSEC',0,'EOF');
  return pairs.join('\r\n')+'\r\n';
}

export function layoutDisplayName(name:string){return name.replace(/^Présentation (\d+)$/,'Layout $1');}
export function nextLayoutName(layouts:Pick<Layout,'name'>[]){const numbers=layouts.map(l=>/^(?:Layout|Présentation) (\d+)$/i.exec(l.name)).filter(m=>m!==null).map(m=>Number(m![1]));return 'Layout '+(Math.max(0,...numbers)+1);}
