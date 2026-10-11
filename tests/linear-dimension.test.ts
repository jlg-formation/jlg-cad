import {expect,test} from 'bun:test';
import {linearDimension,dimensionGeometry,rotateShape,mirrorShape,nearestPart,mapItem} from '../src/geometry';
import {documentOf,parseDrawing,toDxf,type Shape} from '../src/model';
import {resolveCommand} from '../src/drafting';
const base={id:'d',color:'#abcdef',a:{x:0,y:0},b:{x:0,y:0}};
const a={x:0,y:0},b={x:4000,y:3000};
test('DIMLINEAR et DLI activent uniquement la cotation linéaire',()=>{
 expect(resolveCommand('DIMLINEAR')?.id).toBe('linearDimension');expect(resolveCommand('dli')?.id).toBe('linearDimension');expect(resolveCommand('DAL')).toBeUndefined();
});
test('placement horizontal ou vertical mesure la projection, pas la diagonale',()=>{
 const horizontal=linearDimension(a,b,{x:2000,y:-1000},base,500),vertical=linearDimension(a,b,{x:5000,y:1500},base,500);
 const h=dimensionGeometry(horizontal,'m'),v=dimensionGeometry(vertical,'m');expect(h.text).toBe('4 m');expect(v.text).toBe('3 m');expect(h.lines[2][0].y).toBeCloseTo(h.lines[2][1].y);expect(v.lines[2][0].x).toBeCloseTo(v.lines[2][1].x);expect(h.arrows).toHaveLength(2);
 expect(()=>linearDimension(a,a,b,base,500)).toThrow();
});
test('un côté de rectangle fournit ses deux extrémités sans mesurer tout le contour',()=>{
 const rect:Shape={...base,id:'r',type:'rect',a,b};const side=nearestPart(rect,{x:2000,y:0}).segment;
 expect(dimensionGeometry(linearDimension(side.a,side.b,{x:2000,y:-1000},base,500),'m').text).toBe('4 m');
});
test('fichiers, export et transformations conservent la projection de DIMLINEAR',()=>{
 const d=linearDimension(a,b,{x:2000,y:-1000},base,500);
 expect(parseDrawing(JSON.stringify(documentOf('Plan',[d]))).shapes[0]).toEqual(d);expect(toDxf([d],undefined,'m')).toContain('4 m');
 expect(dimensionGeometry(rotateShape(d,a,30) as typeof d,'m').text).toBe('4 m');expect(dimensionGeometry(mirrorShape(d,a,{x:0,y:1}) as typeof d,'m').text).toBe('4 m');
 const scaled=mapItem(d,p=>({x:p.x/50,y:p.y/50}),1/50);expect(scaled.height).toBe(10);expect(dimensionGeometry(scaled,'mm').text).toBe('80 mm');
 const bad={...d,linearAngle:Infinity};expect(()=>parseDrawing(JSON.stringify(documentOf('Plan',[bad])))).toThrow();
});
