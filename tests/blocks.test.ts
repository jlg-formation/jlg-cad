import {expect,test} from 'bun:test';
import {createBlock,insertBlock,explodeBlocks,redefineBlock} from '../src/blocks';
import {documentOf,parseDrawing,bounds,toDxf,newLayout,type BlockShape,type Shape} from '../src/model';
import {rotateShape,mirrorShape,translateItem,distance,trimShape} from '../src/geometry';
import {synchronizeDrawing} from '../src/associations';
import {importBlockDefinitions,copySelection,encodeClipboard,decodeClipboard,pasteClipboard} from '../src/clipboard';
import {scaleSelection} from '../src/scale';
import {importDxf,decodeDxf} from '../src/dxf-import';
import {rectangleSelection,itemInSelection} from '../src/selection';
import {resolvePaletteCommand} from '../src/command-palette';
import {defaults,readBindings,conflict} from '../src/shortcuts';
import {createPdf} from '../src/pdf';
const rect:Shape={id:'chair',type:'rect',a:{x:10,y:20},b:{x:110,y:70},color:'#abcdef',layerId:'0'};
let n=0;const id=()=>`test-${++n}`;
const source=()=>createBlock(documentOf('Plan',[rect]),[rect.id],'Mobilier',{x:10,y:20},id);
const instance=(s:Shape)=>s as BlockShape;
test('definition, chosen base, linked insertions, redefinition and one-instance explosion',()=>{
 const first=source(),definition=first.blocks![0];expect(first.shapes).toHaveLength(1);expect(first.shapes[0].type).toBe('block');expect(definition.shapes[0].a).toEqual({x:0,y:0});
 const next=insertBlock(first,definition.id,{x:500,y:300},2,90,id);expect(next.shapes).toHaveLength(2);const box=bounds(next.shapes[1]);expect(box.x).toBeCloseTo(500);expect(box.y).toBeCloseTo(100);expect(box.width).toBeCloseTo(100);expect(box.height).toBeCloseTo(200);
 const changed=redefineBlock(next,definition.id,definition.shapes.map(s=>translateItem(s,5,0)));expect(instance(changed.shapes[0]).entities[0].a.x).toBeCloseTo(15);expect(instance(changed.shapes[1]).entities[0].a.y).toBeCloseTo(290);
 const exploded=explodeBlocks(changed,[changed.shapes[1].id],id);expect(exploded.shapes[0].type).toBe('block');expect(exploded.shapes[1].type).toBe('polyline');expect(parseDrawing(JSON.stringify(exploded))).toEqual(exploded);expect(first.shapes[0].a).toEqual({x:10,y:20});
});
test('save, rotation, mirror, scale and shared edit keep occurrence transforms',()=>{
 let doc=source();const def=doc.blocks![0];doc=insertBlock(doc,def.id,{x:200,y:400},3,37,id);doc={...doc,shapes:doc.shapes.map(s=>mirrorShape(rotateShape(s,{x:10,y:20},40),{x:0,y:0},{x:0,y:10}))};
 doc=scaleSelection(doc,doc.shapes.map(s=>s.id),{x:20,y:10},2);const restored=parseDrawing(JSON.stringify(doc));
 for(let i=0;i<doc.shapes.length;i++){expect(bounds(restored.shapes[i]).width).toBeCloseTo(bounds(doc.shapes[i]).width);expect(instance(restored.shapes[i]).entities[0].a.x).toBeCloseTo(instance(doc.shapes[i]).entities[0].a.x);}
 const updated=redefineBlock(restored,def.id,[{id:'line',type:'line',a:{x:0,y:0},b:{x:20,y:0},color:'#123456'}]);
 expect(distance(instance(updated.shapes[0]).entities[0].a,instance(updated.shapes[0]).entities[0].b)).toBeCloseTo(40);expect(distance(instance(updated.shapes[1]).entities[0].a,instance(updated.shapes[1]).entities[0].b)).toBeCloseTo(120);
});
test('clipboard imports definitions, resolves name conflicts and keeps shared edits on copies',()=>{
 const doc=source(),copied=copySelection(doc,[doc.shapes[0].id],{x:0,y:0},{x:500,y:0},id);expect(copied.blocks).toHaveLength(1);expect(instance(copied.shapes[0]).definitionId).toBe(instance(copied.shapes[1]).definitionId);
 const other=source(),merged=pasteClipboard(other,decodeClipboard(encodeClipboard(doc,doc.shapes)),{x:100,y:100},id);expect(merged.blocks).toHaveLength(2);expect(merged.blocks![1].name).toBe('Mobilier (2)');expect(instance(merged.shapes[1]).entities[0].a).toEqual({x:100,y:100});expect(parseDrawing(JSON.stringify(merged))).toEqual(merged);
});
test('DXF preserves static definitions, repeated instances, rotation and reflection',()=>{
 let doc=source();doc=insertBlock(doc,doc.blocks![0].id,{x:300,y:-100},2,90,id);doc={...doc,shapes:doc.shapes.map((s,i)=>i?mirrorShape(s,{x:0,y:0},{x:0,y:10}):s)};
 const text=toDxf(doc.shapes,doc.layers,'mm',doc.blocks);expect(text).toContain('INSERT');expect(text).toContain('Mobilier');const result=importDxf(text,'Plan').drawing;expect(result.shapes).toHaveLength(2);expect(result.shapes.every(s=>s.type==='block')).toBe(true);
 for(let i=0;i<2;i++){const original=bounds(doc.shapes[i]),actual=bounds(result.shapes[i]);for(const key of ['x','y','width','height'] as const)expect(actual[key]).toBeCloseTo(original[key]);}
 expect(result.blocks).toHaveLength(1);
});
test('atomic selection, protected objects, invalid definitions and unsupported operations',()=>{
 const doc=source();expect(itemInSelection(doc.shapes[0],rectangleSelection({x:0,y:0},{x:120,y:80}),false)).toBe(true);expect(itemInSelection(doc.shapes[0],rectangleSelection({x:90,y:40},{x:150,y:80}),false)).toBe(false);expect(itemInSelection(doc.shapes[0],rectangleSelection({x:90,y:40},{x:150,y:80}),true)).toBe(true);
 expect(()=>trimShape(doc.shapes[0],[],{x:10,y:20})).toThrow('bloc');expect(()=>createBlock(doc,doc.shapes.map(s=>s.id),'mobilier',{x:0,y:0},id)).toThrow('nom');expect(()=>insertBlock(doc,doc.blocks![0].id,{x:0,y:0},0,0,id)).toThrow();
 const locked={...doc,layers:doc.layers.map(l=>({...l,locked:true}))};expect(()=>explodeBlocks(locked,[doc.shapes[0].id],id)).toThrow('verrouillé');expect(()=>redefineBlock(doc,doc.blocks![0].id,[])).toThrow();expect(()=>parseDrawing(JSON.stringify({...doc,blocks:[]}))).toThrow();
 expect(()=>parseDrawing(JSON.stringify({...doc,blocks:[{...doc.blocks![0],shapes:[doc.shapes[0]]}]}))).toThrow();
});
test('PDF and legacy migration retain block contents, bilingual commands and alias migration',()=>{
 const doc=source(),layout={...newLayout('p','Plan'),items:[{id:'v',type:'viewport' as const,a:{x:0,y:0},b:{x:100,y:100},center:{x:50,y:50},denominator:10,locked:false,printBorder:false,color:'#ffffff'}]};expect(createPdf({...doc,layouts:[layout]},[layout]).output('arraybuffer').byteLength).toBeGreaterThan(500);
 expect(parseDrawing(JSON.stringify({...documentOf('old',[]),version:9,blocks:undefined})).blocks).toEqual([]);
 for(const [name,action] of [['B','block'],['BLOC','block'],['I','insert'],['INSERER','insert'],['X','explode'],['DECOMPOS','explode'],['BE','bedit'],['MODIFBLOC','bedit'],['FERMERBLOC','bclose']])expect(resolvePaletteCommand(name,defaults())?.id).toBe(action);
 const bindings=readBindings(JSON.stringify({bezier:['B'],trim:['X']}));expect(bindings.bezier).toEqual(['BEZ']);expect(bindings.trim).toEqual(['TR']);expect(conflict(bindings,'block','B')).toBeUndefined();
});

test('copy keeps internal layers; explosion remaps associative dimension sources',()=>{
 const primitive:Shape={...rect,layerId:'epais'},original=createBlock(documentOf('x',[primitive]),[primitive.id],'Mur',{x:0,y:0},id);
 const copied=pasteClipboard(documentOf('destination',[]),decodeClipboard(encodeClipboard(original,original.shapes)),{x:10,y:20},id);expect(copied.layers.some(l=>l.id===copied.blocks![0].shapes[0].layerId)).toBe(true);
 const circle:Shape={id:'c',type:'circle',a:{x:0,y:0},b:{x:10,y:0},color:'#ffffff'};
 const dimension:Shape={id:'d',type:'dimension',kind:'diameter',circleId:'c',a:{x:-10,y:0},b:{x:10,y:0},offset:0,height:2,color:'#ffffff'};
 const edited=redefineBlock(original,original.blocks![0].id,[circle,dimension]);const exploded=explodeBlocks(edited,[edited.shapes[0].id],id);expect(exploded.shapes[1].type).toBe('dimension');expect((exploded.shapes[1] as typeof dimension).circleId).toBe(exploded.shapes[0].id);expect(()=>parseDrawing(JSON.stringify(exploded))).not.toThrow();
});
test('native validation rejects unequal block scales and authoritative geometry beyond limits',()=>{
 const doc=source(),s=instance(doc.shapes[0]);expect(()=>parseDrawing(JSON.stringify({...doc,shapes:[{...s,yAxis:{x:s.a.x,y:s.a.y+2}}]}))).toThrow();
 const far={...doc,blocks:[{...doc.blocks![0],shapes:[{...rect,a:{x:1e7,y:0},b:{x:1e7,y:10}}]}],shapes:[{...s,a:{x:1e7,y:0},b:{x:1e7+1,y:0},yAxis:{x:1e7,y:1},entities:[]}]};expect(()=>parseDrawing(JSON.stringify(far))).toThrow();
});
test('DXF keeps accented block names in downloaded R2004 files',()=>{
 const doc=source();doc.blocks![0].name='Évier';const text=toDxf(doc.shapes,doc.layers,'mm',doc.blocks);const bytes=new TextEncoder().encode(text);const decoded=decodeDxf(bytes.buffer);expect(importDxf(decoded,'x').drawing.blocks![0].name).toBe('Évier');
});


test('recover a library from an old drawing without replacing objects, including unused and locked definitions',()=>{
 const sourceDoc=source(),destination=documentOf('Destination',[{...rect,id:'existing'}]),library={...sourceDoc,shapes:[],layers:sourceDoc.layers.map(l=>({...l,locked:true}))};
 const merged=importBlockDefinitions(destination,library,id);expect(merged.shapes).toEqual(destination.shapes);expect(merged.blocks).toHaveLength(1);expect(merged.blocks![0].name).toBe('Mobilier');
 const inserted=insertBlock(merged,merged.blocks![0].id,{x:500,y:200},1,0,id);expect(inserted.shapes).toHaveLength(2);expect(bounds(inserted.shapes[1])).toEqual({x:500,y:200,width:100,height:50});
 expect(()=>createBlock(destination,['existing'],'Arbre\n0',{x:0,y:0},id)).toThrow();
});
