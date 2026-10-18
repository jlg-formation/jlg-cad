import {test,expect} from 'bun:test';
import {makeDimension,circularDefinition,directedLinearDimension,lineAngleDefinition,type SpecializedDimensionTool} from '../src/dimension-kinds';
import {dimensionGeometry,rotateShape,mirrorShape,mapItem,threePointArc,distance,segments} from '../src/geometry';
import {documentOf,parseDrawing,toDxf,bounds,type Dimension,type Shape} from '../src/model';
import {synchronizeDimensions} from '../src/associations';
import {copySelection} from '../src/clipboard';
import {createPdf} from '../src/pdf';
import {resolveCommand} from '../src/drafting';
import {objectGrips,moveGrip} from '../src/grips';
const zero={x:0,y:0},base={id:'d',color:'#abcdef',a:zero,b:zero},options={direction:'',axis:'auto' as const,datum:zero};
const points=[zero,{x:1000,y:0},{x:0,y:-1000}],pointer={x:1500,y:-1500};
const make=(tool:SpecializedDimensionTool,ps=points,p=pointer)=>makeDimension(tool,ps,p,base,20,options,-Math.PI/2);

test('all eight explicit dimension commands resolve independently',()=>{
 for(const [command,id] of [['DLI','linearDimension'],['DAL','alignedDimension'],['DAN','angularDimension'],['DAR','arcDimension'],['DRA','radius'],['DDI','diameter'],['DOR','ordinate'],['DJO','jogged']])expect(resolveCommand(command)?.id).toBe(id);
});
test('inclined side: aligned length differs from vertical and horizontal projections',()=>{
 const a=zero,b={x:4000,y:3000};
 expect(dimensionGeometry(make('alignedDimension',[a,b])).text).toBe('5 000 mm');
 expect(dimensionGeometry(directedLinearDimension(a,b,{x:0,y:-100},base,20)).text).toBe('4 000 mm');
 expect(dimensionGeometry(directedLinearDimension(a,b,pointer,base,20,90)).text).toBe('3 000 mm');
 expect(dimensionGeometry(make('alignedDimension',[a,b])).arrows.length).toBe(2);
});
test('angular placement selects minor or reflex sector; two line mode selects the quadrant',()=>{
 expect(dimensionGeometry(make('angularDimension')).text).toBe('90°');
 expect(dimensionGeometry(make('angularDimension',[zero,{x:1000,y:0},{x:-1000,y:0}])).text).toBe('180°');
 expect(dimensionGeometry(make('angularDimension',points,{x:-500,y:500})).text).toBe('270°');
 const d={...make('angularDimension',points,{x:-500,y:500}),angleSources:[{id:'a',segment:0,position:.5},{id:'b',segment:0,position:.5}]};
 expect(dimensionGeometry(d).text).toBe('90°');
 const g=dimensionGeometry(d);
 for(const [a,b] of g.lines.slice(-2))expect(Math.min(Math.abs(a.x-b.x),Math.abs(a.y-b.y))).toBeLessThan(1e-6);
});
test('arc length measures circular path, not chord, and mirrors preserve length',()=>{
 const d=make('arcDimension');expect(dimensionGeometry(d).text).toBe('⌒ 1570,7963 mm');
 expect(dimensionGeometry(mirrorShape(d,zero,{x:0,y:1}) as Dimension).text).toBe(dimensionGeometry(d).text);
 const arc=threePointArc({x:1000,y:0},{x:Math.sqrt(500000),y:-Math.sqrt(500000)},{x:0,y:-1000},base),def=circularDefinition(arc,arc.a);
 expect(Math.abs(def.sweep)).toBeCloseTo(Math.PI/2);expect(distance(def.points[0],def.points[1])).toBeCloseTo(1000);
 expect(()=>makeDimension('arcDimension',points,pointer,base,20,options,Math.PI*2)).toThrow();
});
test('radius, arc diameter and jogged radius use the real radius, regardless of override center',()=>{
 expect(dimensionGeometry(make('radius')).text).toBe('R1000 mm');
 const d=makeDimension('diameter',points,pointer,base,20,options);expect(dimensionGeometry(d).text).toBe('Ø2000 mm');
 const jog=make('jogged',[...points,{x:900,y:-900},{x:1100,y:-1200}]);
 expect(dimensionGeometry(jog).text).toBe('R1000 mm');expect(jog.points).toHaveLength(6);
 expect(dimensionGeometry(jog).lines).toHaveLength(4);
});
test('ordinate uses configurable datum, axis, Y-up convention and signed values',()=>{
 const d=makeDimension('ordinate',[{x:2000,y:-3000}],pointer,base,20,{...options,axis:'y',datum:{x:1000,y:-1000}});
 expect(dimensionGeometry(d,'m').text).toBe('2 m');
 const x=makeDimension('ordinate',[{x:500,y:0}],{x:500,y:-100},base,20,{...options,axis:'x',datum:{x:1000,y:0}});
 expect(dimensionGeometry(x).text).toBe('-500 mm');
 expect(dimensionGeometry(rotateShape(d,zero,37) as Dimension,'m').text).toBe('2 m');
 expect(dimensionGeometry(mirrorShape(d,zero,{x:1,y:0}) as Dimension,'m').text).toBe('2 m');
});
test('all definitions survive native save, copy/paste, transforms and vector exports',()=>{
 for(const tool of ['alignedDimension','angularDimension','arcDimension','radius','ordinate','jogged'] as const){
  const d=make(tool,tool==='jogged'?[...points,{x:500,y:-500},{x:750,y:-750}]:points),doc=documentOf('Cotations',[d]);
  expect(parseDrawing(JSON.stringify(doc)).shapes[0]).toEqual(d);
  const copied=copySelection(doc,['d'],zero,{x:300,y:400},()=> 'copy').shapes[1] as Dimension;
  expect(dimensionGeometry(copied).text).toBe(dimensionGeometry(d).text);
  expect(dimensionGeometry(rotateShape(d,zero,30) as Dimension).text).toBe(dimensionGeometry(d).text);
  expect(bounds(d).width).toBeGreaterThan(0);expect(toDxf([d])).toContain('TEXT');
  const pdf=createPdf(doc,[{id:'sheet',name:'Test',format:'A4',orientation:'portrait',monochrome:false,items:[{...mapItem(d,p=>({x:p.x/50+70,y:p.y/50+70}),1/50),id:'paper'}]}]).output();
  expect(pdf).toContain('%PDF');
 }
});
test('native loader rejects incomplete definitions and bad references',()=>{
 const d=make('arcDimension');
 for(const malformed of [{...d,points:[zero]},{...d,sweep:NaN},{...d,points:undefined},{...d,references:[{id:'missing',segment:0,point:0,feature:'center'}]}])expect(()=>parseDrawing(JSON.stringify(documentOf('x',[malformed as Dimension])))).toThrow();
});
test('endpoint-linked aligned dimensions follow edits, copied pairs bind to copies',()=>{
 const line:Shape={...base,id:'line',type:'line',a:zero,b:{x:1000,y:0}};
 const d={...make('alignedDimension',[line.a,line.b]),references:[{id:line.id,segment:0,point:0,feature:'a' as const},{id:line.id,segment:0,point:1,feature:'b' as const}]};
 const resized={...line,b:{x:2000,y:0}};const next=synchronizeDimensions([resized,d],[line,d]);expect(dimensionGeometry(next[1] as Dimension).text).toBe('2 000 mm');
 let id=0;const copied=copySelection(documentOf('x',[line,d]),['line','d'],zero,{x:500,y:500},()=> 'copy'+(++id));
 const copiedDimension=copied.shapes[3] as Dimension;expect(copiedDimension.references?.every(r=>r.id===copied.shapes[2].id)).toBe(true);
 const detached=copySelection(documentOf('x',[line,d]),['d'],zero,pointer,()=> 'snapshot').shapes[2] as Dimension;expect(detached.references?.length||0).toBe(0);
});
test('circular and angular associations recalculate after geometry edits',()=>{
 const circle:Shape={...base,id:'circle',type:'circle',a:zero,b:{x:1000,y:0}},def=circularDefinition(circle,zero);
 const d={...make('radius',def.points),references:[{id:'circle',segment:0,point:0,feature:'center' as const},{id:'circle',segment:0,point:1,feature:'a' as const}]};
 const resized={...circle,b:{x:2000,y:0}};expect(dimensionGeometry(synchronizeDimensions([resized,d])[1] as Dimension).text).toBe('R2000 mm');
 const a:Shape={...base,id:'a',type:'line',a:zero,b:{x:1000,y:0}},b:Shape={...base,id:'b',type:'line',a:zero,b:{x:0,y:-1000}};
 const angle={...make('angularDimension',lineAngleDefinition(a,b,a.b,b.b)),angleSources:[{id:'a',segment:0,position:1},{id:'b',segment:0,position:1}]};
 const edited={...b,b:{x:1000,y:-1000}};expect(dimensionGeometry(synchronizeDimensions([a,edited,angle])[2] as Dimension).text).toBe('45°');
 expect(segments(resized)[0].kind).toBe('arc');
});
test('placement grip changes the annotation without changing the measured value',()=>{
 for(const tool of ['radius','angularDimension','arcDimension','ordinate','jogged'] as const){
  const d=make(tool,tool==='jogged'?[...points,{x:500,y:-500},{x:700,y:-700}]:points),grip=objectGrips(d)[0],next=moveGrip(d,grip.key,{x:2000,y:-2000}) as Dimension;
  expect(dimensionGeometry(next).text).toBe(dimensionGeometry(d).text);
 }
});
