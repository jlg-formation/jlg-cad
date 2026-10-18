import {expect,test} from 'bun:test';
import {documentOf,parseDrawing,toDxf,type Shape,type Dimension} from '../src/model';
import {diameterDimension,dimensionGeometry,distance,translateItem} from '../src/geometry';
import {synchronizeDrawing,synchronizeDimensions} from '../src/associations';
import {moveSelectionObjects,copySelection,encodeClipboard,decodeClipboard,pasteClipboard} from '../src/clipboard';
import {moveGrip,objectGrips} from '../src/grips';
import {resolveCommand} from '../src/drafting';
const circle:Extract<Shape,{type:'circle'}>={id:'c',type:'circle',a:{x:100,y:200},b:{x:150,y:200},color:'#abcdef'};
const dim:Dimension={...diameterDimension(circle,{x:-50,y:120},{...circle,id:'d'},5),circleId:'c'};
const original=documentOf('Linked',[circle,dim]);
test('Copier une sélection relie les nouvelles cotes aux nouveaux cercles',()=>{
 let n=0;const next=copySelection(original,['c','d'],{x:0,y:0},{x:500,y:0},()=>`copy-${++n}`);
 const copiedCircle=next.shapes[2],copiedDimension=next.shapes[3] as Dimension;
 expect(copiedCircle.a).toEqual({x:600,y:200});expect(copiedDimension.circleId).toBe(copiedCircle.id);
 const alone=copySelection(original,['d'],{x:0,y:0},{x:500,y:0},()=>`copy-${++n}`);
 expect((alone.shapes[2] as Dimension).circleId).toBeUndefined();expect(original.shapes[1]).toEqual(dim);
});
test('associative diameter follows radius and center while retaining angle and text gap',()=>{
 const changed={...circle,a:{x:300,y:400},b:{x:400,y:400}};
 const next=synchronizeDrawing({...original,shapes:[changed,dim]},original),d=next.shapes[1] as Dimension;
 expect(distance(d.a,d.b)).toBeCloseTo(200);expect((d.a.x+d.b.x)/2).toBeCloseTo(300);expect((d.a.y+d.b.y)/2).toBeCloseTo(400);expect(d.offset).toBe(dim.offset);
 expect(dimensionGeometry(d).angle).toBeCloseTo(dimensionGeometry(dim).angle);expect(dimensionGeometry(d,'m').text).toBe('Ø0,2 m');
 expect(original.shapes[1]).toEqual(dim);expect(original.shapes[0]).toEqual(circle);
});
test('deleting a circle cascades to all linked dimensions; undo snapshot restores both',()=>{
 const second={...dim,id:'d2'};const saved=documentOf('Plan',[circle,dim,second]);
 const deleted=synchronizeDrawing({...saved,shapes:[dim,second]},saved);expect(deleted.shapes).toHaveLength(0);
 expect(parseDrawing(JSON.stringify(saved)).shapes).toEqual(saved.shapes);
 expect(synchronizeDrawing({...saved,shapes:[circle]},saved).shapes).toEqual([circle]);
});
test('native v4 preserves and resolves links, refuses dangling links, reads independent v3',()=>{
 const stale={...dim,a:{x:0,y:0},b:{x:1,y:0}};const loaded=parseDrawing(JSON.stringify({...original,version:4,shapes:[circle,stale]}));
 expect(loaded.version).toBe(9);expect((loaded.shapes[1] as Dimension).circleId).toBe('c');expect(distance(loaded.shapes[1].a,loaded.shapes[1].b)).toBeCloseTo(100);
 expect(()=>parseDrawing(JSON.stringify({...original,shapes:[dim]}))).toThrow();
 expect(()=>parseDrawing(JSON.stringify({...original,shapes:[{...circle,type:'line'},dim]}))).toThrow();
 const {circleId,...independent}=dim;const old=parseDrawing(JSON.stringify({...original,version:3,shapes:[circle,independent]}));expect((old.shapes[1] as Dimension).circleId).toBeUndefined();
 expect(synchronizeDrawing({...old,shapes:[{...circle,b:{x:200,y:200}},independent]},old).shapes[1]).toEqual(independent);
});
test('copy/paste pair creates new link, changing copied radius leaves original untouched',()=>{
 const data=decodeClipboard(encodeClipboard(original,[circle,dim]));let counter=0;
 const pasted=pasteClipboard(original,data,{x:500,y:600},()=> 'new-'+(++counter));
 const c=pasted.shapes[2] as typeof circle,d=pasted.shapes[3] as Dimension;expect(c.id).not.toBe('c');expect(d.circleId).toBe(c.id);
 const edited=synchronizeDrawing({...pasted,shapes:pasted.shapes.map(s=>s.id===c.id?{...c,b:{x:c.a.x+80,y:c.a.y}}:s)},pasted);
 expect(distance(edited.shapes[3].a,edited.shapes[3].b)).toBeCloseTo(160);expect(edited.shapes[1]).toEqual(dim);
});
test('copying dimension alone produces independent snapshot without importing its circle',()=>{
 const data=decodeClipboard(encodeClipboard(original,[dim]));expect(data.drawing.shapes).toHaveLength(1);expect((data.drawing.shapes[0] as Dimension).circleId).toBeUndefined();
 let counter=0;const pasted=pasteClipboard(documentOf('Blank',[]),data,{x:500,y:600},()=> 'new-'+(++counter));expect(pasted.shapes).toHaveLength(1);
});
test('placement grip changes annotation position without changing circle measurement',()=>{
 expect(objectGrips(dim)).toHaveLength(1);const moved=moveGrip(dim,'placement-0',{x:100,y:-100}) as Dimension;
 const next=synchronizeDimensions([circle,moved],[circle,dim])[1] as Dimension;expect(distance(next.a,next.b)).toBeCloseTo(100);expect(next.circleId).toBe('c');expect(next.offset).toBeGreaterThan(dim.offset);
 const dragged=synchronizeDimensions([circle,translateItem(dim,-50,-50)],[circle,dim])[1] as Dimension;expect(distance(dragged.a,dragged.b)).toBeCloseTo(100);
});
test('DDI, accented and unaccented diameter commands resolve to circle-only tool',()=>{
 for(const name of ['DDI','diamètre','DIAMETRE','DIMDIAMETER'])expect(resolveCommand(name)?.id).toBe('diameter');expect(resolveCommand('D')?.id).toBe('dimension');
});
test('exports use the synchronized diameter snapshot',()=>{
 const next=synchronizeDrawing({...original,shapes:[{...circle,b:{x:250,y:200}},dim]},original);
 expect(toDxf(next.shapes,undefined,'m')).toContain('%%c0,3 m');
});

test('Déplacer le cercle et sa cote ensemble applique une seule translation en conservant la liaison',()=>{
 const next=synchronizeDrawing(moveSelectionObjects(original,['c','d'],{x:30,y:20},{x:530,y:120}),original);
 expect(next.shapes).toHaveLength(2);
 expect(next.shapes[0].a).toEqual({x:600,y:300});
 const moved=next.shapes[1] as Dimension;
 expect(moved.circleId).toBe('c');expect(moved.id).toBe('d');
 expect(moved.a.x).toBeCloseTo(dim.a.x+500);expect(moved.a.y).toBeCloseTo(dim.a.y+100);
 expect(moved.b.x).toBeCloseTo(dim.b.x+500);expect(moved.b.y).toBeCloseTo(dim.b.y+100);
 expect(original.shapes).toEqual([circle,dim]);
});
