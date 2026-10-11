export type Point = { x: number; y: number };
export type Shape = { id: string; type: 'line' | 'rect' | 'circle'; a: Point; b: Point; color: string };
export type Drawing = { format: 'jlg-cad'; version: 1; name: string; units: 'mm'; shapes: Shape[] };
export const documentOf = (name: string, shapes: Shape[]): Drawing => ({ format: 'jlg-cad', version: 1, name, units: 'mm', shapes });
export function parseDrawing(text: string): Drawing {
  const d = JSON.parse(text);
  const point = (p: Point) => p && Number.isFinite(p.x) && Number.isFinite(p.y) && Math.abs(p.x) <= 1e7 && Math.abs(p.y) <= 1e7;
  if (d.format !== 'jlg-cad' || d.version !== 1 || d.units !== 'mm' || typeof d.name !== 'string' || !Array.isArray(d.shapes) || d.shapes.length > 50000 || d.shapes.some((s: Shape) => !s || typeof s.id !== 'string' || !['line','rect','circle'].includes(s.type) || !point(s.a) || !point(s.b) || typeof s.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(s.color)) || new Set(d.shapes.map((s: Shape) => s.id)).size !== d.shapes.length) throw new Error('Ce fichier n’est pas un projet JLG CAD valide.');
  return d;
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
