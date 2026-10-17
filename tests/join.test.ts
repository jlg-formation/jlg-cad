import {expect,test} from 'bun:test';
import {joinItems,joinDrawing,joinTolerance} from '../src/join';
import {documentOf,parseDrawing,newLayout,toDxf,bounds,type Shape,type Point,type ArcShape,type PathShape,type HatchShape} from '../src/model';
import {segments,at,distance,nearestPart,mirrorShape,rotateShape,offsetShape,trimShape,translateItem,extendShape} from '../src/geometry';
import {analyzeBoundaries,createHatch,pickRegion,defaultHatchStyle,hatchContains} from '../src/hatch';
import {synchronizeDrawing} from '../src/associations';
import {importDxf} from '../src/dxf-import';
import {encodeClipboard,decodeClipboard,pasteClipboard} from '../src/clipboard';
import {objectGrips,moveGrip} from '../src/grips';
import {resolveCommand} from '../src/drafting';
import {readBindings} from '../src/shortcuts';

const base={color:'#123456',layerId:'0'};
const line=(id:string,a:Point,b:Point):Shape=>({...base,id,type:'line',a,b});
const poly=(id:string,points:Point[],closed=false):PathShape=>({...base,id,type:'polyline',a:points[0],b:points.at(-1)!,nodes:points.map(p=>({p})),closed});
const arc=(id:string,start:number,end:number,r=100):ArcShape=>{const p=(t:number)=>({x:r*Math.cos(t*Math.PI/180),y:-r*Math.sin(t*Math.PI/180)});return {...base,id,type:'arc',a:p(start),b:p(end),bulge:Math.tan(-(end-start)*Math.PI/720)};};
const join=(shapes:Shape[],source?:string)=>joinItems(shapes,shapes.map(s=>s.id),source);

test('JOIN and FILLET have distinct English and French aliases; legacy bindings follow the old fillet',()=>{
 for(const name of ['JOIN','J','JOINDRE'])expect(resolveCommand(name)?.id).toBe('join');
 for(const name of ['FILLET','RACCORD','RACCORDER'])expect(resolveCommand(name)?.id).toBe('fillet');
 expect(readBindings(JSON.stringify({join:['Q']})).fillet).toEqual(['Q']);expect(readBindings(JSON.stringify({join:['Q']})).join).toEqual([]);
 expect(readBindings(JSON.stringify({join:['Q'],fillet:['W']})).join).toEqual(['Q']);
});

test('collinear lines with gaps, reversed endpoints, overlaps and duplicates become one line',()=>{
 const shapes=[line('a',{x:20,y:0},{x:10,y:0}),line('b',{x:50,y:0},{x:30,y:0}),line('c',{x:15,y:0},{x:40,y:0}),line('d',{x:50,y:0},{x:30,y:0})];
 const result=join(shapes);expect(result.items).toHaveLength(1);expect(result.items[0].type).toBe('line');expect(result.items[0].a).toEqual({x:50,y:0});expect(result.items[0].b).toEqual({x:10,y:0});expect(result.joined).toBe(4);
});

test('explicit line source keeps its properties and ignores angled lines and polylines',()=>{
 const a={...line('a',{x:0,y:0},{x:10,y:0}),color:'#abcdef',layerId:'murs'},b=line('b',{x:20,y:0},{x:30,y:0}),c=line('c',{x:10,y:0},{x:10,y:10}),p=poly('p',[{x:30,y:0},{x:40,y:0}]);
 const result=join([b,c,p,a],'a');expect(result.items).toHaveLength(3);expect(result.items.find(s=>s.id==='a')).toMatchObject({type:'line',a:a.a,b:b.b,color:a.color,layerId:'murs'});expect(result.ignored).toBe(2);
});

test('an unordered chain reverses objects, closes a contour, and leaves closed objects untouched',()=>{
 const a=line('a',{x:0,y:0},{x:100,y:0}),b=line('b',{x:100,y:100},{x:100,y:0}),c=line('c',{x:0,y:100},{x:100,y:100}),d=line('d',{x:0,y:0},{x:0,y:100});
 const untouched=poly('closed',[{x:300,y:0},{x:400,y:0},{x:400,y:100}],true),result=join([b,d,untouched,a,c]);
 expect(result.items).toHaveLength(2);const joined=result.items.find(s=>s.id!=='closed') as PathShape;expect(joined.type).toBe('polyline');expect(joined.closed).toBe(true);expect(joined.nodes).toHaveLength(4);expect(result.items.find(s=>s.id==='closed')).toBe(untouched);
});

test('one operation joins independent chains, while gaps, isolated and unsupported objects survive',()=>{
 const items=[line('a',{x:0,y:0},{x:10,y:0}),line('b',{x:10,y:0},{x:10,y:10}),line('c',{x:100,y:0},{x:110,y:0}),line('d',{x:110,y:0},{x:110,y:10}),line('gap',{x:10,y:11},{x:20,y:20}),{...base,id:'circle',type:'circle' as const,a:{x:500,y:0},b:{x:501,y:0}}];
 const result=join(items);expect(result.resultIds).toHaveLength(2);expect(result.joined).toBe(4);expect(result.ignored).toBe(2);expect(result.items).toHaveLength(4);
});

test('polyline source extends at both ends, preserves its identity and never fills a gap',()=>{
 const p=poly('p',[{x:10,y:0},{x:10,y:10}]),left=line('left',{x:0,y:0},{x:10,y:0}),right=line('right',{x:10,y:20},{x:10,y:10}),gap=line('gap',{x:10,y:21},{x:10,y:30});
 const result=join([gap,right,left,p],'p'),joined=result.items.find(s=>s.id==='p') as PathShape;
 expect(joined.a).toEqual({x:0,y:0});expect(joined.b).toEqual({x:10,y:20});expect(joined.nodes).toHaveLength(4);expect(result.items.find(s=>s.id==='gap')).toBe(gap);
});

test('joins and reverses circular segments without flattening them into straight edges',()=>{
 const a=arc('arc',0,90),p=poly('p',[a.b,{x:0,y:-200}]),end=line('end',{x:200,y:0},a.a);
 const result=join([p,a,end]),joined=result.items[0] as PathShape;expect(result.items).toHaveLength(1);expect(joined.type).toBe('polyline');expect(segments(joined).filter(s=>s.kind==='arc')).toHaveLength(1);
 const curve=segments(joined).find(s=>s.kind==='arc')!;if(curve.kind==='arc')expect(curve.radius).toBeCloseTo(100);
 expect(segments(joined).map(s=>s.kind)).toEqual(['line','arc','line']);
});

test('same-circle arcs fill gaps; explicit arc sources ignore polylines and other circles',()=>{
 const a=arc('a',0,60),b=arc('b',90,180),other=arc('other',180,250,200),p=poly('p',[b.b,{x:-200,y:0}]);
 const result=join([a,b,other,p],'a');expect(result.items).toHaveLength(3);const joined=result.items.find(s=>s.id==='a')!;expect(joined.type).toBe('arc');const curve=segments(joined)[0];if(curve.kind==='arc'){expect(curve.radius).toBeCloseTo(100);expect(curve.sweep).toBeCloseTo(-Math.PI);}
});

test('a full circular union and Close on an arc produce a true circle',()=>{
 const result=join([arc('a',0,180),arc('b',180,360)]);expect(result.items).toHaveLength(1);expect(result.items[0].type).toBe('circle');
 const a=arc('a',10,80),closed=joinItems([a],['a'],'a',true);expect(closed.items[0].type).toBe('circle');expect(closed.items[0].id).toBe('a');expect(distance(closed.items[0].a,closed.items[0].b)).toBeCloseTo(100);
});

test('branching vertices are not resolved by arbitrary selection order',()=>{
 const a=line('a',{x:0,y:0},{x:10,y:0}),b=line('b',{x:10,y:0},{x:20,y:10}),c=line('c',{x:10,y:0},{x:20,y:-10});
 expect(join([a,b,c]).joined).toBe(0);expect(join([c,a,b]).joined).toBe(0);
});

test('numerical endpoint tolerance is fixed in model millimetres',()=>{
 const a=poly('a',[{x:0,y:0},{x:10,y:0}]);
 expect(join([a,line('b',{x:10+joinTolerance/2,y:0},{x:10,y:10})],'a').joined).toBe(2);
 expect(join([a,line('b',{x:10+joinTolerance*2,y:0},{x:10,y:10})],'a').joined).toBe(0);
});

test('locked objects and explicit locked sources remain protected; paper space is isolated',()=>{
 const a=line('a',{x:0,y:0},{x:10,y:0}),b={...line('b',{x:10,y:0},{x:10,y:10}),layerId:'murs'};const doc=documentOf('x',[a,b]);doc.layers=doc.layers.map(l=>l.id==='murs'?{...l,locked:true}:l);
 expect(joinDrawing(doc,['a','b']).result.joined).toBe(0);expect(()=>joinDrawing(doc,['a','b'],'b')).toThrow();
 const layout={...newLayout('paper','Layout 1'),items:[a,{...b,layerId:undefined}]};doc.layouts=[layout];const result=joinDrawing(doc,['a','b'],undefined,false,'paper');expect(result.drawing.shapes).toBe(doc.shapes);expect(result.drawing.layouts[0].items).toHaveLength(1);
});

test('hatch dependencies follow consumed boundaries and survive later edits, save and undo snapshots',()=>{
 const edges=[line('a',{x:0,y:0},{x:100,y:0}),line('b',{x:100,y:0},{x:100,y:100}),line('c',{x:100,y:100},{x:0,y:100}),line('d',{x:0,y:100},{x:0,y:0})];
 const h=createHatch({...base,id:'h',a:{x:0,y:0},b:{x:100,y:100}},[pickRegion(analyzeBoundaries(edges),{x:40,y:40})],defaultHatchStyle),doc=documentOf('x',[...edges,h]),snapshot=JSON.stringify(doc);
 const next=synchronizeDrawing(joinDrawing(doc,edges.map(s=>s.id)).drawing,doc),joined=next.shapes.find(s=>s.type==='polyline')!,hatch=next.shapes.find(s=>s.type==='hatch') as HatchShape;
 expect(hatch.associative).toBe(true);expect(hatch.regions[0].sourceIds).toEqual([joined.id]);expect(hatchContains(hatch,{x:50,y:50})).toBe(true);expect(parseDrawing(JSON.stringify(next))).toEqual(next);
 const moved=synchronizeDrawing({...next,shapes:next.shapes.map(s=>s.id===joined.id?translateItem(s,200,0):s)},next),movedHatch=moved.shapes.find(s=>s.type==='hatch') as HatchShape;
 expect(movedHatch.associative).toBe(true);expect(hatchContains(movedHatch,{x:250,y:50})).toBe(true);expect(JSON.stringify(doc)).toBe(snapshot);
});

test('native arcs persist through files, clipboard, DXF, transforms and grip editing',()=>{
 const a=arc('a',350,430),doc=documentOf('x',[a]);expect(parseDrawing(JSON.stringify(doc))).toEqual(doc);expect(bounds(a).width).toBeGreaterThan(0);
 for(const shapes of [[a],[a,{...base,id:'text',type:'text' as const,a:{x:0,y:0},b:{x:0,y:0},height:2,text:'x'}]]){
  const exported=toDxf(shapes,doc.layers),imported=importDxf(exported,'x').drawing.shapes.find(s=>s.type==='arc')!;expect(imported).toBeDefined();expect(segments(imported)[0].kind).toBe('arc');expect(distance(at(segments(a)[0],.5),at(segments(imported)[0],.5))).toBeLessThan(1e-6);
 }
 const pasted=pasteClipboard(documentOf('blank',[]),decodeClipboard(encodeClipboard(doc,[a],{x:0,y:0})),{x:20,y:30},()=>crypto.randomUUID());expect(pasted.shapes[0].type).toBe('arc');
 expect(mirrorShape(a,{x:0,y:0},{x:100,y:0})).toMatchObject({type:'arc',bulge:-a.bulge});expect(rotateShape(a,{x:0,y:0},90).type).toBe('arc');expect(offsetShape(a,10,{x:0,y:0}).type).toBe('arc');
 expect(objectGrips(a)).toHaveLength(4);const edited=moveGrip(a,'control-0',{x:80,y:-50});expect(edited.type).toBe('arc');expect(distance(nearestPart(edited as Shape,{x:80,y:-50}).point,{x:80,y:-50})).toBeLessThan(1e-6);
});

test('arc joins across angle zero do not accidentally create a full circle',()=>{
 for(const source of ['a',undefined]){const result=join([arc('a',350,370),arc('b',380,410)],source);expect(result.items).toHaveLength(1);expect(result.items[0].type).toBe('arc');const s=segments(result.items[0] as Shape)[0];if(s.kind==='arc')expect(s.sweep).toBeCloseTo(-Math.PI/3);}
});

test('a shallow native arc remains an ARC in display and DXF instead of disappearing',()=>{
 const a=arc('shallow',0,.000001,1000);expect(segments(a)[0].kind).toBe('arc');
 const restored=importDxf(toDxf([a]),'x').drawing.shapes;expect(restored).toHaveLength(1);expect(restored[0].type).toBe('arc');
});

test('arcs of different circles join end to end as an exact polyline',()=>{
 const a=arc('a',0,180),b=translateItem(arc('b',0,180),-200,0),result=join([b,a]);expect(result.items).toHaveLength(1);expect(result.items[0].type).toBe('polyline');expect(segments(result.items[0] as Shape).map(s=>s.kind)).toEqual(['arc','arc']);
});

test('almost-full native arcs split exactly when becoming a polyline, and remain saveable',()=>{
 const a=arc('a',0,359.9999),p=poly('p',[a.b,{x:200,y:200}]),result=join([a,p],'p'),joined=result.items.find(s=>s.id==='p') as PathShape;
 expect(joined.type).toBe('polyline');expect(segments(joined).filter(s=>s.kind==='arc')).toHaveLength(2);expect(parseDrawing(JSON.stringify(documentOf('x',result.items as Shape[]))).shapes).toHaveLength(1);
});

test('native arcs retain their type and exact circle after trimming and extension',()=>{
 const a=arc('a',0,180),cut=line('cut',{x:0,y:-200},{x:0,y:10}),trimmed=trimShape(a,[cut],{x:70,y:-70});expect(trimmed).toHaveLength(1);expect(trimmed[0].type).toBe('arc');
 const small=arc('small',0,60),limit=line('limit',{x:-200,y:-50},{x:0,y:-50}),extended=extendShape(small,[limit],small.b);expect(extended.type).toBe('arc');const curve=segments(extended)[0];if(curve.kind==='arc'){expect(curve.radius).toBeCloseTo(100);expect(curve.sweep).toBeLessThan(-Math.PI/3);}
});

test('a notch is preserved even when two of its edges share the same infinite line',()=>{
 const points=[{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:20,y:10},{x:20,y:0},{x:30,y:0}],edges=points.slice(1).map((b,i)=>line(String(i),points[i],b)),result=join(edges),joined=result.items[0] as PathShape;
 expect(joined.nodes.map(n=>n.p)).toEqual(points);expect(segments(joined)).toHaveLength(5);
});

test('outer and island hatch dependencies are remapped independently',()=>{
 const loop=(prefix:string,x:number,size:number)=>{const p=[{x,y:x},{x:x+size,y:x},{x:x+size,y:x+size},{x,y:x+size}];return p.map((a,i)=>line(prefix+i,a,p[(i+1)%4]));};
 const edges=[...loop('outer',0,100),...loop('inner',20,30)],h=createHatch({...base,id:'h',a:{x:0,y:0},b:{x:100,y:100}},[pickRegion(analyzeBoundaries(edges),{x:10,y:10})],defaultHatchStyle),doc=documentOf('x',[...edges,h]),next=synchronizeDrawing(joinDrawing(doc,edges.map(s=>s.id)).drawing,doc),hatch=next.shapes.find(s=>s.type==='hatch') as HatchShape;
 expect(hatch.associative).toBe(true);expect(hatch.regions[0].sourceIds).toHaveLength(2);expect(hatch.regions[0].outerSourceIds).toHaveLength(1);expect(hatchContains(hatch,{x:10,y:10})).toBe(true);expect(hatchContains(hatch,{x:30,y:30})).toBe(false);
});

test('joined primitives preserve source colors and layer in DXF, including a closed arc',()=>{
 const a={...line('a',{x:0,y:0},{x:10,y:0}),color:'#abcdef',layerId:'murs'},b=line('b',{x:15,y:0},{x:20,y:0}),result=join([a,b],'a'),doc=documentOf('x',result.items as Shape[]),roundtrip=importDxf(toDxf(doc.shapes,doc.layers),'x').drawing;
 expect(roundtrip.shapes[0].color).toBe('#abcdef');expect(roundtrip.layers.find(l=>l.id===roundtrip.shapes[0].layerId)?.name).toContain('Murs');
 const closed=joinItems([{...arc('a',0,80),color:'#654321'}],['a'],'a',true),circle=importDxf(toDxf(closed.items as Shape[]),'x').drawing.shapes[0];expect(circle.type).toBe('circle');expect(circle.color).toBe('#654321');
});

test('legacy curved polylines stay polylines, and native arc validation rejects invalid data',()=>{
 const p={...poly('p',[{x:100,y:0},{x:0,y:-100}]),nodes:[{p:{x:100,y:0},bulge:-Math.tan(Math.PI/8)},{p:{x:0,y:-100}}]},old={...documentOf('old',[p]),version:6};
 expect(parseDrawing(JSON.stringify(old)).shapes[0].type).toBe('polyline');
 for(const bulge of [0,NaN,Infinity])expect(()=>parseDrawing(JSON.stringify(documentOf('x',[{...arc('a',0,90),bulge}])))).toThrow();
 expect(()=>parseDrawing(JSON.stringify({...documentOf('x',[arc('a',0,90)]),version:6}))).toThrow();
});
