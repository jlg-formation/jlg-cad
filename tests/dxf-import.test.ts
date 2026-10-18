import {describe,expect,test} from 'bun:test';
import {importDxf,inspectDxf,decodeDxf,aciColor} from '../src/dxf-import';
import {documentOf,parseDrawing,toDxf,bounds,type PathShape,type ArcShape,type TextItem} from '../src/model';
import {segments,at,rotateShape,translateItem,trimShape} from '../src/geometry';
import {encodeClipboard,decodeClipboard,pasteClipboard} from '../src/clipboard';
import {createPdf} from '../src/pdf';
import {newLayout} from '../src/model';
import {readFileSync} from 'node:fs';

const pairs=(...items:(string|number)[])=>items.join('\n')+'\n';
const file=(body:string,unit:number|null=4,blocks='',tables='')=>pairs(0,'SECTION',2,'HEADER',9,'$ACADVER',1,'AC1018')+(unit===null?'':pairs(9,'$INSUNITS',70,unit))+pairs(0,'ENDSEC')+(tables?pairs(0,'SECTION',2,'TABLES')+tables+pairs(0,'ENDSEC'):'')+(blocks?pairs(0,'SECTION',2,'BLOCKS')+blocks+pairs(0,'ENDSEC'):'')+pairs(0,'SECTION',2,'ENTITIES')+body+pairs(0,'ENDSEC',0,'EOF');
const line=(...extra:(string|number)[])=>pairs(0,'LINE',10,1,20,2,11,3,21,4,...extra);
const block=(name:string,body:string,x=0,y=0)=>pairs(0,'BLOCK',2,name,10,x,20,y)+body+pairs(0,'ENDBLK');
describe('Import DXF 2D',()=>{
 test('symbol names are case-insensitive and unusual unknown types are still counted',()=>{
  const body=pairs(0,'INSERT',2,'fenetre',8,'murs',0,'__proto__'),tables=pairs(0,'LAYER',2,'Murs',62,3,70,2),result=importDxf(file(body,4,block('Fenetre',line()),tables),'x');expect(result.report.objects).toBe(1);expect(result.drawing.layers.filter(l=>l.name.toUpperCase()==='MURS')).toHaveLength(1);expect(result.drawing.layers[0].visible).toBe(true);expect(result.report.skipped['__proto__']).toBe(1);expect(aciColor(11)).toBe('#ff7f7f');expect(aciColor(20)).toBe('#ff3f00');
 });
 test('sample architecture file has six objects, exact plan extent and a decomposed window',()=>{
  const sample=readFileSync(new URL('./fixtures/import-2d.dxf',import.meta.url),'utf8'),result=importDxf(sample,'example.dxf');expect(result.report.objects).toBe(6);expect(result.report.blocks).toBe(1);const boxes=result.drawing.shapes.map(bounds);expect(Math.min(...boxes.map(b=>b.x))).toBeCloseTo(0);expect(Math.max(...boxes.map(b=>b.x+b.width))).toBeCloseTo(8000);expect(result.report.skipped).toEqual({});
 });
 test('MTEXT rotations use radians and respect direction-vector precedence',()=>{
  const body=pairs(0,'MTEXT',10,0,20,0,40,2,1,'Note',50,Math.PI/2)+pairs(0,'MTEXT',10,0,20,0,40,2,1,'Note',50,Math.PI/2,11,1,21,0)+pairs(0,'MTEXT',10,0,20,0,40,2,1,'Note',11,1,21,0,50,Math.PI/2);const shapes=importDxf(file(body),'x').drawing.shapes as TextItem[];expect(shapes.map(s=>Math.round(s.rotation!))).toEqual([-90,0,-90]);
 });
 test('multiline and accented text round-trips through downloaded DXF encoding',()=>{
  const t:TextItem={id:'t',type:'text',a:{x:10,y:20},b:{x:10,y:20},color:'#123456',height:3,text:'Église {A};\nØ échelle',rotation:-25,align:'center',vertical:'top'},doc=documentOf('x',[t]);const exported=toDxf(doc.shapes,doc.layers),decoded=decodeDxf(new TextEncoder().encode(exported).buffer),result=importDxf(decoded,'x').drawing.shapes[0] as TextItem;
  expect(result.text).toBe(t.text);expect(result.rotation).toBeCloseTo(-25);expect(result.align).toBe('center');expect(result.color).toBe(t.color);expect(result.a).toEqual(t.a);
 });
 test('invalid native text fields and legacy model text are refused; v5 still migrates',()=>{
  const t:TextItem={id:'t',type:'text',a:{x:0,y:0},b:{x:0,y:0},color:'#123456',text:'x',height:3};
  for(const patch of [{height:0},{rotation:Infinity},{align:'unsupported'},{vertical:'unsupported'}])expect(()=>parseDrawing(JSON.stringify(documentOf('x',[{...t,...patch} as TextItem])))).toThrow();
  expect(()=>parseDrawing(JSON.stringify({...documentOf('x',[t]),version:5}))).toThrow();expect(parseDrawing(JSON.stringify({...documentOf('x',[]),version:5})).version).toBe(9);
 });
 test('converts units, preserves origin, reflects Y, saves native and restores',()=>{
  const {drawing,report}=importDxf(file(line(),6),'maison.dxf');expect(drawing.name).toBe('maison');expect(drawing.shapes[0].a).toEqual({x:1000,y:-2000});expect(drawing.shapes[0].b).toEqual({x:3000,y:-4000});expect(report.objects).toBe(1);expect(parseDrawing(JSON.stringify(drawing))).toEqual(drawing);
 });
 test('unitless and unsupported units require explicit selection',()=>{
  expect(inspectDxf(file(line(),null)).unit).toBeNull();expect(()=>importDxf(file(line(),null),'x')).toThrow('unité');expect(importDxf(file(line(),null),'x','in').drawing.shapes[0].a.x).toBe(25.4);expect(()=>importDxf(file(line(),7),'x')).toThrow('unité');
 });
 test('imports layer state, truecolor, ACI and ByLayer colors',()=>{
  const tables=pairs(0,'LAYER',2,'0',62,7,70,0,0,'LAYER',2,'Murs',62,-1,70,4);
  const {drawing}=importDxf(file(line(8,'Murs')+line(8,'Murs',420,0x12ab34)+line(62,5),4,'',tables),'x');
  expect(drawing.layers.find(l=>l.name==='Murs')).toMatchObject({visible:false,locked:true,color:'#ff0000'});expect(drawing.shapes.map(s=>s.color)).toEqual(['#ff0000','#12ab34','#0000ff']);
 });
 test('exact arc wraps through zero and preserves its circular geometry',()=>{
  const s=importDxf(file(pairs(0,'ARC',10,0,20,0,40,10,50,350,51,10)),'x').drawing.shapes[0] as ArcShape;
  expect(s.bulge).toBeCloseTo(-Math.tan(20*Math.PI/720));const segment=segments(s)[0];expect(segment.kind).toBe('arc');expect(at(segment,.5).x).toBeCloseTo(10);expect(at(segment,.5).y).toBeCloseTo(0);
 });
 test('reads R12 POLYLINE/VERTEX and modern LWPOLYLINE with closure and bulges',()=>{
  const old=pairs(0,'POLYLINE',70,1,0,'VERTEX',10,0,20,0,42,1,0,'VERTEX',10,10,20,0,0,'VERTEX',10,10,20,10,0,'SEQEND');
  const modern=pairs(0,'LWPOLYLINE',90,3,70,1,10,0,20,0,42,1,10,10,20,0,10,10,20,10);
  const shapes=importDxf(file(old+modern),'x').drawing.shapes as PathShape[];expect(shapes[0].nodes).toEqual(shapes[1].nodes);expect(shapes[0].closed).toBe(true);expect(shapes[0].nodes[0].bulge).toBe(-1);
 });
 test('nested blocks apply base, rotation, scale and inherited layer/color',()=>{
  const blocks=block('inner',line(62,0),1,2)+block('outer',pairs(0,'INSERT',2,'inner',10,10,20,0,41,2,42,2,62,0));
  const body=pairs(0,'INSERT',2,'outer',10,100,20,100,50,90,8,'Furniture',62,3);
  const {drawing,report}=importDxf(file(body,4,blocks),'x');expect(report.blocks).toBe(2);expect(drawing.shapes[0].a.x).toBeCloseTo(100);expect(drawing.shapes[0].a.y).toBeCloseTo(-110);expect(drawing.shapes[0].b.x).toBeCloseTo(96);expect(drawing.shapes[0].b.y).toBeCloseTo(-114);expect(drawing.shapes[0].color).toBe('#00ff00');expect(drawing.layers.find(l=>l.id===drawing.shapes[0].layerId)?.name).toBe('Furniture');
 });
 test('block arrays and reflected arcs keep positions and bulge sign',()=>{
  const blocks=block('a',pairs(0,'ARC',10,0,20,0,40,2,50,0,51,90));const result=importDxf(file(pairs(0,'INSERT',2,'a',41,-1,42,1,70,2,44,10),4,blocks),'x');
  expect(result.drawing.shapes).toHaveLength(2);const s=result.drawing.shapes as ArcShape[];expect(s[0].bulge).toBeGreaterThan(0);expect(s[1].a.x-s[0].a.x).toBe(10);
 });
 test('nonuniform blocks retain lines and report unsupported curved geometry',()=>{
  const result=importDxf(file(pairs(0,'INSERT',2,'a',41,2,42,1),4,block('a',line()+pairs(0,'CIRCLE',10,0,20,0,40,5))),'x');expect(result.drawing.shapes).toHaveLength(1);expect(result.report.skipped['CIRCLE : échelle non uniforme']).toBe(1);
 });
 test('cycles, missing blocks, paper space, extrusion and unknown entities are reported',()=>{
  const result=importDxf(file(pairs(0,'INSERT',2,'loop',0,'INSERT',2,'missing')+line(67,1)+line(230,-1)+pairs(0,'SPLINE')+line(),4,block('loop',pairs(0,'INSERT',2,'loop'))),'x');expect(result.drawing.shapes).toHaveLength(1);expect(Object.values(result.report.skipped).reduce((a,b)=>a+b,0)).toBe(5);
 });
 test('imports editable texts, escapes, rotation, alignment and simple multiline MTEXT',()=>{
  const body=pairs(0,'TEXT',10,1,20,2,11,5,21,6,40,3,1,'Église %%c \\U+00E9',50,90,72,1,73,2,0,'MTEXT',10,0,20,0,40,4,71,1,3,'Première\\P',1,'Seconde');
  const {drawing}=importDxf(file(body),'x');const t=drawing.shapes[0] as TextItem;expect(t.text).toBe('Église Ø é');expect(t.a).toEqual({x:5,y:-6});expect(t.rotation).toBeCloseTo(-90);expect(t.align).toBe('center');expect((drawing.shapes[1] as TextItem).text).toBe('Première\nSeconde');expect(parseDrawing(JSON.stringify(drawing))).toEqual(drawing);
 });
 test('text survives clipboard, transformations, session-compatible native, DXF and PDF',()=>{
  const doc=importDxf(file(pairs(0,'TEXT',10,100,20,200,40,30,1,'Mur',50,30)),'x').drawing,t=doc.shapes[0] as TextItem;
  expect((rotateShape(t,t.a,45) as TextItem).rotation).toBeCloseTo(-75);expect((translateItem(t,1,2) as TextItem).rotation).toBeCloseTo(-30);expect(bounds(t).width).toBeGreaterThan(0);
  const pasted=pasteClipboard(documentOf('dest',[]),decodeClipboard(encodeClipboard(doc,[t])),{x:0,y:0},()=>crypto.randomUUID());expect((pasted.shapes[0] as TextItem).text).toBe('Mur');
  const roundtrip=importDxf(toDxf(doc.shapes,doc.layers),'x');expect((roundtrip.drawing.shapes[0] as TextItem).rotation).toBeCloseTo(-30);expect((roundtrip.drawing.shapes[0] as TextItem).vertical).toBe('baseline');
  const layout={...newLayout('p','p'),items:[t]};expect(createPdf({...doc,layouts:[layout]},[layout]).output('arraybuffer').byteLength).toBeGreaterThan(500);expect(()=>trimShape(t,[],t.a)).toThrow('textes');
 });
 test('rejects corrupt, binary, nonfinite, excessive coordinate and vertex data',()=>{
  for(const bad of ['abc','AutoCAD Binary DXF\0',file(line()).replace('ENDSEC\n0\nEOF',''),file(line()).replace('10\n1','10\nNaN'),file(line()).replace('10\n1','10\n10000001'),file(pairs(0,'LWPOLYLINE',90,4,10,0,20,0,10,1,20,1)),file(pairs(0,'POLYLINE',0,'VERTEX',10,0,20,0))])expect(()=>importDxf(bad,'x')).toThrow();
 });
 test('old Windows code page and modern UTF-8 preserve accents',()=>{
  const old=file(pairs(0,'TEXT',10,0,20,0,40,2,1,'église'));const bytes=Uint8Array.from([...old].map(c=>c.charCodeAt(0)));expect(decodeDxf(bytes.buffer)).toContain('église');const modern=old.replace('AC1018','AC1021');expect(decodeDxf(new TextEncoder().encode(modern).buffer)).toContain('église');
 });
 test('imports our R12 export exactly with chosen millimetres',()=>{
  const doc=documentOf('x',[{id:'c',type:'circle',a:{x:30,y:-40},b:{x:35,y:-40},color:'#ffffff'},{id:'l',type:'line',a:{x:1,y:-2},b:{x:3,y:-4},color:'#ffffff'}]);const result=importDxf(toDxf(doc.shapes,doc.layers),'x','mm');expect(result.drawing.shapes[0].a).toEqual(doc.shapes[0].a);expect(result.drawing.shapes[0].b).toEqual(doc.shapes[0].b);expect(result.drawing.shapes[1].a).toEqual(doc.shapes[1].a);
 });
});
