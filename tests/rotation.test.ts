import {expect,test} from 'bun:test';
import {documentOf,type Shape} from '../src/model';
import {rotationAngle,rotateSelection} from '../src/rotation';

const base={x:10,y:20};
const line:Shape={id:'a',type:'line',a:base,b:{x:110,y:20},color:'#ffffff',layerId:'epais'};

test('signed degrees, French decimals and typed angle override pointer movement',()=>{
 expect(rotationAngle(base,{x:10,y:-80},'')).toBe(90);
 expect(rotationAngle(base,{x:10,y:120},'')).toBe(-90);
 expect(rotationAngle(base,{x:10,y:120},'22,5°')).toBe(22.5);
 expect(rotationAngle(base,{x:110,y:20},'-90')).toBe(-90);
 expect(()=>rotationAngle(base,base,'-')).toThrow();
 expect(()=>rotationAngle(base,base,'Infinity')).toThrow();
});

test('selection rotates around the chosen pivot without mutating the original document',()=>{
 const other:Shape={...line,id:'b',a:{x:10,y:120},b:{x:110,y:120}};
 const untouched:Shape={...line,id:'c'};
 const doc=documentOf('Plan',[line,other,untouched]);
 const next=rotateSelection(doc,['a','b'],base,90);
 expect(next.shapes[0].a).toEqual(base);
 expect(next.shapes[0].b.x).toBeCloseTo(10);
 expect(next.shapes[0].b.y).toBeCloseTo(-80);
 expect(next.shapes[1].a.x).toBeCloseTo(110);
 expect(next.shapes[1].a.y).toBeCloseTo(20);
 expect(next.shapes[2]).toBe(untouched);
 expect(doc.shapes).toEqual([line,other,untouched]);
 const restored=rotateSelection(next,['a','b'],base,-90);
 expect(restored.shapes[1].b.x).toBeCloseTo(other.b.x);
 expect(restored.shapes[1].b.y).toBeCloseTo(other.b.y);
});

test('a locked member blocks the entire rotation',()=>{
 const doc=documentOf('Plan',[line,{...line,id:'b',layerId:'0'}]);
 doc.layers.find(l=>l.id==='epais')!.locked=true;
 expect(()=>rotateSelection(doc,['a','b'],base,90)).toThrow('verrouillé');
 expect(doc.shapes[1].b).toEqual(line.b);
 expect(()=>rotateSelection(doc,[],base,90)).toThrow();
 expect(()=>rotateSelection(doc,['b'],base,NaN)).toThrow();
});
