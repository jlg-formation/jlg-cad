import {expect,test} from 'bun:test';
import {documentOf,type Shape} from '../src/model';
import {scaleFactor,scaleSelection} from '../src/scale';
import {resolvePaletteCommand} from '../src/command-palette';
const base={x:10,y:20};
const line:Shape={id:'a',type:'line',a:base,b:{x:110,y:20},color:'#fff',layerId:'0'};
test('SCALE, ECHELLE and SC resolve to the scale tool',()=>{
 for(const name of ['SCALE','ECHELLE','SC'])expect(resolvePaletteCommand(name)?.id).toBe('scale');
});
test('positive factors, French decimals and reference lengths',()=>{
 expect(scaleFactor(base,{x:210,y:20},'',line)).toBe(2);
 expect(scaleFactor(base,base,'0,5',line)).toBe(.5);
 expect(scaleFactor(base,base,'',line,'100 cm','2 m')).toBe(2);
 for(const value of ['0','-2','Infinity','abc'])expect(()=>scaleFactor(base,base,value,line)).toThrow();
 expect(()=>scaleFactor(base,base,'',line,'-1 cm','2 cm')).toThrow();
});
test('scales a selection about a fixed base without changing originals or other objects',()=>{
 const text:Shape={...line,id:'text',type:'text',text:'Test',height:10};
 const other={...line,id:'other'};
 const doc=documentOf('Plan',[line,text,other]);
 const next=scaleSelection(doc,['a','text'],base,2);
 expect(next.shapes[0].a).toEqual(base);expect(next.shapes[0].b).toEqual({x:210,y:20});
 expect((next.shapes[1] as typeof text).height).toBe(20);expect(next.shapes[2]).toBe(other);
 expect(doc.shapes[0].b.x).toBe(110);
 expect(scaleSelection(next,['a','text'],base,.5).shapes[0]).toEqual(line);
});
test('copies preserve original objects and remap diameter associations',()=>{
 const circle:Shape={...line,id:'c',type:'circle'};
 const dim:Shape={...line,id:'d',type:'dimension',kind:'diameter',circleId:'c',height:5,offset:10};
 let id=0;const next=scaleSelection(documentOf('Plan',[circle,dim]),['c','d'],base,2,()=>`copy${++id}`);
 expect(next.shapes).toHaveLength(4);expect(next.shapes[0]).toBe(circle);
 expect((next.shapes[3] as typeof dim).circleId).toBe(next.shapes[2].id);
 expect((next.shapes[3] as typeof dim).height).toBe(10);
});
test('locked layers and invalid factors reject the whole operation',()=>{
 const doc=documentOf('Plan',[line]);doc.layers[0].locked=true;
 expect(()=>scaleSelection(doc,['a'],base,2)).toThrow('verrouillé');
 expect(()=>scaleSelection(doc,[],base,2)).toThrow();
 expect(()=>scaleSelection(doc,['a'],base,0)).toThrow();
 expect(doc.shapes[0]).toBe(line);
});
