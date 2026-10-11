export type Point = { x: number; y: number };
export type Shape = { id: string; type: 'line' | 'rect' | 'circle'; a: Point; b: Point; color: string };
export type TextItem = { id: string; type: 'text'; a: Point; b: Point; color: string; text: string; height: number };
export type Viewport = { id: string; type: 'viewport'; a: Point; b: Point; color: string; center: Point; denominator: number; locked: boolean; printBorder: boolean };
export type PaperItem = Shape | TextItem | Viewport;
export type Layout = { id: string; name: string; format: 'A4' | 'A3'; orientation: 'portrait' | 'landscape'; monochrome: boolean; items: PaperItem[] };
export type Drawing = { format: 'jlg-cad'; version: 2; name: string; units: 'mm'; shapes: Shape[]; layouts: Layout[] };
export const documentOf = (name: string, shapes: Shape[], layouts: Layout[] = []): Drawing => ({ format: 'jlg-cad', version: 2, name, units: 'mm', shapes, layouts });
export const newLayout = (id: string, name: string): Layout => ({ id, name, format: 'A4', orientation: 'landscape', monochrome: true, items: [] });
export function paperSize(layout: Layout): Point {
  const [short,long] = layout.format === 'A3' ? [297,420] : [210,297];
  return layout.orientation === 'landscape' ? { x:long,y:short } : { x:short,y:long };
}
export function bounds(item: PaperItem) {
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
  const unique = (items: {id:string}[]) => new Set(items.map(s=>s.id)).size === items.length;
  const list = (items: PaperItem[], paper=false) => Array.isArray(items) && items.length <= 50000 && unique(items) && items.every(s => base(s) && (['line','rect','circle'].includes(s.type) || (paper && ((s.type==='text' && typeof s.text==='string' && s.text.length<=10000 && Number.isFinite(s.height) && s.height>=.5 && s.height<=100) || (s.type==='viewport' && point(s.center) && Number.isFinite(s.denominator) && s.denominator>=.01 && s.denominator<=10000 && typeof s.locked==='boolean' && typeof s.printBorder==='boolean' && bounds(s).width>0 && bounds(s).height>0)))));
  if (d.format !== 'jlg-cad' || ![1,2].includes(d.version) || d.units !== 'mm' || typeof d.name !== 'string' || !list(d.shapes)) throw new Error('Ce fichier n’est pas un projet JLG CAD valide.');
  if(d.version===1) return documentOf(d.name,d.shapes);
  if(!Array.isArray(d.layouts) || d.layouts.length>100 || !unique(d.layouts) || !d.layouts.every((l:Layout)=>l && typeof l.id==='string' && typeof l.name==='string' && ['A4','A3'].includes(l.format) && ['portrait','landscape'].includes(l.orientation) && typeof l.monochrome==='boolean' && list(l.items,true))) throw new Error('Les présentations du fichier sont invalides.');
  return documentOf(d.name,d.shapes,d.layouts);
}
export function toDxf(shapes: Shape[]) {
  const pairs: (string | number)[] = [0,'SECTION',2,'HEADER',9,'$ACADVER',1,'AC1009',0,'ENDSEC',0,'SECTION',2,'ENTITIES'];
  const line = (a: Point,b: Point) => pairs.push(0,'LINE',8,'0',10,a.x,20,-a.y,30,0,11,b.x,21,-b.y,31,0);
  for (const s of shapes) {
    if (s.type === 'line') line(s.a,s.b);
    else if (s.type === 'circle') pairs.push(0,'CIRCLE',8,'0',10,s.a.x,20,-s.a.y,30,0,40,Math.hypot(s.b.x-s.a.x,s.b.y-s.a.y));
    else { const c = { x:s.b.x,y:s.a.y }, d = { x:s.a.x,y:s.b.y }; line(s.a,c); line(c,s.b); line(s.b,d); line(d,s.a); }
  }
  pairs.push(0,'ENDSEC',0,'EOF');
  return pairs.join('\r\n')+'\r\n';
}
