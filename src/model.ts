import { segments, flatten, dimensionGeometry } from './geometry';
export type Point = { x: number; y: number };
export type BaseShape = { id: string; a: Point; b: Point; color: string; layerId?: string };
export type SimpleShape = { [K in 'line'|'rect'|'circle']: BaseShape & { type: K } }['line'|'rect'|'circle'];
export type Node = { p: Point; bulge?: number; in?: Point; out?: Point; smooth?: boolean };
export type PathShape = BaseShape & { type: 'polyline' | 'bezier'; nodes: Node[]; closed: boolean };
export type Dimension = BaseShape & { type: 'dimension'; offset: number; height: number };
export type Shape = SimpleShape | PathShape | Dimension;
export type TextItem = BaseShape & { type: 'text'; text: string; height: number };
export type Viewport = BaseShape & { type: 'viewport'; center: Point; denominator: number; locked: boolean; printBorder: boolean };
export type PaperItem = Shape | TextItem | Viewport;
export type Layout = { id: string; name: string; format: 'A4' | 'A3'; orientation: 'portrait' | 'landscape'; monochrome: boolean; items: PaperItem[] };
export type Layer = { id: string; name: string; color: string; visible: boolean; locked: boolean };
export const defaultLayers = (): Layer[] => [{id:'0',name:'Dessin',color:'#b5ddd6',visible:true,locked:false},{id:'murs',name:'Murs',color:'#a6e0cf',visible:true,locked:false},{id:'ouvertures',name:'Ouvertures',color:'#e6b776',visible:true,locked:false},{id:'cotes',name:'Cotations',color:'#94bfea',visible:true,locked:false}];
export type Drawing = { format: 'jlg-cad'; version: 3; name: string; units: 'mm'; shapes: Shape[]; layouts: Layout[]; layers: Layer[] };
export const documentOf = (name: string, shapes: Shape[], layouts: Layout[] = [], layers: Layer[] = defaultLayers()): Drawing => ({ format: 'jlg-cad', version: 3, name, units: 'mm', shapes, layouts, layers });
export const visibleShapes = (doc: Drawing) => doc.shapes.filter(s=>doc.layers.find(l=>l.id===(s.layerId||'0'))?.visible!==false);
export const lockedShape = (doc: Drawing, s: Shape) => !!doc.layers.find(l=>l.id===(s.layerId||'0'))?.locked;
export const newLayout = (id: string, name: string): Layout => ({ id, name, format: 'A4', orientation: 'landscape', monochrome: true, items: [] });
export function paperSize(layout: Layout): Point {
  const [short,long] = layout.format === 'A3' ? [297,420] : [210,297];
  return layout.orientation === 'landscape' ? { x:long,y:short } : { x:short,y:long };
}
export function bounds(item: PaperItem) {
  if(item.type==='polyline'||item.type==='bezier') {
    const points=item.nodes.flatMap(n=>[n.p,...(n.in?[n.in]:[]),...(n.out?[n.out]:[])]);
    // A bulged arc can extend beyond its chord. Include its full circle conservatively.
    if(item.type==='polyline')item.nodes.forEach((n,i)=>{const next=item.nodes[(i+1)%item.nodes.length];if(!next||(!item.closed&&i===item.nodes.length-1)||!n.bulge)return;const dx=next.p.x-n.p.x,dy=next.p.y-n.p.y,b=n.bulge,c={x:(n.p.x+next.p.x)/2-dy*(1-b*b)/(4*b),y:(n.p.y+next.p.y)/2+dx*(1-b*b)/(4*b)},r=Math.hypot(dx,dy)*(1+b*b)/(4*Math.abs(b));points.push({x:c.x-r,y:c.y-r},{x:c.x+r,y:c.y+r});});
    const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y));return{x,y,width:Math.max(...points.map(p=>p.x))-x,height:Math.max(...points.map(p=>p.y))-y};
  }
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
  const list = (items: PaperItem[], paper=false) => Array.isArray(items) && items.length <= 50000 && unique(items) && items.every(s => base(s) && (s.layerId===undefined||typeof s.layerId==='string') && (['line','rect','circle'].includes(s.type) || ((s.type==='polyline'||s.type==='bezier') && Array.isArray(s.nodes) && s.nodes.length>=2 && s.nodes.length<=5000 && typeof s.closed==='boolean' && s.nodes.every(n=>point(n.p) && (n.bulge===undefined||Number.isFinite(n.bulge)&&Math.abs(n.bulge)<1e4) && (!n.in||point(n.in)) && (!n.out||point(n.out)) && (n.smooth===undefined||typeof n.smooth==='boolean'))) || (s.type==='dimension'&&Number.isFinite(s.offset)&&Math.abs(s.offset)<=1e7&&Number.isFinite(s.height)&&s.height>0&&s.height<=1e5) || (paper && ((s.type==='text' && typeof s.text==='string' && s.text.length<=10000 && Number.isFinite(s.height) && s.height>=.5 && s.height<=100) || (s.type==='viewport' && point(s.center) && Number.isFinite(s.denominator) && s.denominator>=.01 && s.denominator<=10000 && typeof s.locked==='boolean' && typeof s.printBorder==='boolean' && bounds(s).width>0 && bounds(s).height>0)))));
  if (!d || d.format !== 'jlg-cad' || ![1,2,3].includes(d.version) || d.units !== 'mm' || typeof d.name !== 'string' || !list(d.shapes)) throw new Error('Ce fichier n’est pas un projet JLG CAD valide.');
  if(d.version===1) return documentOf(d.name,d.shapes);
  if(!Array.isArray(d.layouts) || d.layouts.length>100 || !unique(d.layouts) || !d.layouts.every((l:Layout)=>l && typeof l.id==='string' && typeof l.name==='string' && ['A4','A3'].includes(l.format) && ['portrait','landscape'].includes(l.orientation) && typeof l.monochrome==='boolean' && list(l.items,true))) throw new Error('Les présentations du fichier sont invalides.');
  if(d.version===3&&(!Array.isArray(d.layers)||!d.layers.length||d.layers.length>200||!unique(d.layers)||!d.layers.some((l:Layer)=>l.id==='0')||!d.layers.every((l:Layer)=>typeof l.name==='string'&&/^#[0-9a-f]{6}$/i.test(l.color)&&typeof l.visible==='boolean'&&typeof l.locked==='boolean')||d.shapes.some((s:Shape)=>s.layerId&&!d.layers.some((l:Layer)=>l.id===s.layerId))))throw new Error('Les calques du fichier sont invalides.');
  return documentOf(d.name,d.shapes,d.layouts,d.version===3?d.layers:defaultLayers());
}
export function toDxf(shapes: Shape[], layers: Layer[] = defaultLayers()) {
  const names=new Map(layers.map((l,i)=>[l.id,l.id==='0'?'0':`${l.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,80)}_${i}`]));
  const pairs: (string | number)[] = [0,'SECTION',2,'HEADER',9,'$ACADVER',1,'AC1009',0,'ENDSEC',0,'SECTION',2,'TABLES',0,'TABLE',2,'LAYER',70,layers.length];
  for(const l of layers)pairs.push(0,'LAYER',2,names.get(l.id)!,70,l.locked?4:0,62,l.visible?7:-7,6,'CONTINUOUS');
  pairs.push(0,'ENDTAB',0,'ENDSEC',0,'SECTION',2,'ENTITIES');
  let layer='0';
  const line = (a: Point,b: Point) => pairs.push(0,'LINE',8,layer,10,a.x,20,-a.y,30,0,11,b.x,21,-b.y,31,0);
  const polyline=(nodes:{p:Point;bulge?:number}[],closed:boolean)=>{pairs.push(0,'POLYLINE',8,layer,66,1,70,closed?1:0,10,0,20,0,30,0);for(const n of nodes)pairs.push(0,'VERTEX',8,layer,10,n.p.x,20,-n.p.y,30,0,42,-(n.bulge||0));pairs.push(0,'SEQEND',8,layer);};
  for (const s of shapes) {
    layer=names.get(s.layerId||'0')||'0';
    if (s.type === 'line') line(s.a,s.b);
    else if (s.type === 'circle') pairs.push(0,'CIRCLE',8,layer,10,s.a.x,20,-s.a.y,30,0,40,Math.hypot(s.b.x-s.a.x,s.b.y-s.a.y));
    else if(s.type==='polyline')polyline(s.nodes,s.closed);
    else if(s.type==='bezier'){const nodes=segments(s).flatMap((seg,i)=>flatten(seg,.1).slice(i?1:0).map(p=>({p:p.p})));if(s.closed)nodes.pop();polyline(nodes,s.closed);}
    else if(s.type==='dimension'){const d=dimensionGeometry(s);d.lines.forEach(([a,b])=>line(a,b));pairs.push(0,'TEXT',8,layer,10,d.label.x,20,-d.label.y,30,0,40,s.height,1,`${Number(Math.hypot(s.b.x-s.a.x,s.b.y-s.a.y).toFixed(2))} mm`,50,d.angle,72,1,11,d.label.x,21,-d.label.y,31,0);}
    else { const c = { x:s.b.x,y:s.a.y }, d = { x:s.a.x,y:s.b.y }; line(s.a,c); line(c,s.b); line(s.b,d); line(d,s.a); }
  }
  pairs.push(0,'ENDSEC',0,'EOF');
  return pairs.join('\r\n')+'\r\n';
}
