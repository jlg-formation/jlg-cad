import {expect,test} from 'bun:test';
import {diameterDimension,dimensionGeometry,distance,mapItem,mirrorShape} from '../src/geometry';
import {bounds,documentOf,parseDrawing,toDxf,type Shape,type Dimension} from '../src/model';
const circle:Extract<Shape,{type:'circle'}>={id:'c',type:'circle',a:{x:100,y:200},b:{x:150,y:200},color:'#abcdef'};
test('diamètre : deux extrémités sur le cercle, ligne centrale et flèches extérieures',()=>{
 const d=diameterDimension(circle,{x:-40,y:160},{...circle,id:'d'},5),g=dimensionGeometry(d);
 expect(distance(d.a,d.b)).toBeCloseTo(100);expect((d.a.x+d.b.x)/2).toBeCloseTo(100);expect((d.a.y+d.b.y)/2).toBeCloseTo(200);
 expect(g.text).toBe('Ø100 mm');expect(g.arrows).toHaveLength(2);expect(g.arrows[0][0]).toEqual(d.a);expect(g.arrows[1][0]).toEqual(d.b);
 expect(g.angle).toBeGreaterThanOrEqual(-90);expect(g.angle).toBeLessThanOrEqual(90);expect(bounds(d).x).toBeLessThan(d.a.x);
});
test('diamètre : fichiers, DXF avec symbole et flèches, mises à échelle et miroir',()=>{
 const d=diameterDimension(circle,{x:-40,y:160},{...circle,id:'d'},5);
 expect(parseDrawing(JSON.stringify(documentOf('Plan',[circle,d]))).shapes[1]).toEqual(d);
 const dxf=toDxf([d]);expect(dxf).toContain('%%c100 mm');expect(dxf).toContain('SOLID');
 const scaled=mapItem(d,p=>({x:p.x/10,y:p.y/10}),.1);expect(distance(scaled.a,scaled.b)).toBeCloseTo(10);expect(scaled.height).toBe(.5);expect(scaled.offset).toBeCloseTo(d.offset/10);
 expect((mirrorShape(d,{x:0,y:0},{x:100,y:0}) as Dimension).offset).toBe(d.offset);
 expect(()=>parseDrawing(JSON.stringify(documentOf('Bad',[{...d,kind:'unknown'} as Dimension])))).toThrow();
});

import {createPdf} from '../src/pdf';
import {newLayout} from '../src/model';
import {inflateSync} from 'node:zlib';
test('diamètre : PDF vectoriel avec texte et flèches pleines',()=>{
 const d=diameterDimension(circle,{x:0,y:120},{...circle,id:'d'},5),layout={...newLayout('paper','Plan'),items:[d]};
 const pdf=createPdf(documentOf('Plan',[]),[layout]).output();
 const stream=inflateSync(Buffer.from(pdf.match(/stream\n([\s\S]*?)\nendstream/)![1],'latin1')).toString('latin1');
 expect(stream).toContain('Ø100 mm');expect(stream).toContain('f');expect(pdf).not.toContain('/Subtype /Image');
});

test('diamètre : conversion de l’affichage m/cm/mm sans changer la géométrie',()=>{
 const d=diameterDimension(circle,{x:0,y:120},{...circle,id:'d'},5);
 expect(dimensionGeometry(d,'m').text).toBe('Ø0,1 m');expect(dimensionGeometry(d,'cm').text).toBe('Ø10 cm');expect(dimensionGeometry(d,'mm').text).toBe('Ø100 mm');
 expect(toDxf([d],undefined,'m')).toContain('%%c0,1 m');expect(distance(d.a,d.b)).toBeCloseTo(100);
});

test('diamètre : les cotations papier et objet exportées respectent les mètres du projet',()=>{
 const d=diameterDimension(circle,{x:0,y:120},{...circle,id:'d'},5);
 const layout={...newLayout('paper','Plan'),items:[d,{id:'v',type:'viewport' as const,a:{x:10,y:10},b:{x:200,y:200},center:{x:100,y:200},denominator:10,color:'#abcdef',locked:false,printBorder:false}]};
 const pdf=createPdf(documentOf('Plan',[circle,d]),[layout],'m').output();
 const stream=inflateSync(Buffer.from(pdf.match(/stream\n([\s\S]*?)\nendstream/)![1],'latin1')).toString('latin1');
 expect(stream.match(/Ø0,1 m/g)).toHaveLength(2);
 expect(stream).not.toContain('Ø100 mm');
});
