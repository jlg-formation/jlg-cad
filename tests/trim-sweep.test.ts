import {test,expect} from 'bun:test';
import {trimSweep,segments,distance} from '../src/geometry';
import {clipTrimEdge,isTrimDrag} from '../src/trim-gesture';
import type {Shape,Point} from '../src/model';

const line=(id:string,a:Point,b:Point):Shape=>({id,type:'line',a,b,color:'#fff',layerId:'walls'});
const vertical=(x:number)=>line('v'+x,{x,y:-100},{x,y:100});
const length=(shapes:Shape[])=>shapes.flatMap(segments).reduce((n,s)=>n+(s.kind==='arc'?s.radius*Math.abs(s.sweep):distance(s.a,s.b)),0);
const canonical=(result:ReturnType<typeof trimSweep>)=>result.map(r=>({id:r.sourceId,remaining:r.remaining.map(s=>({...s,id:''})),removed:r.removed.map(s=>({...s,id:''}))}));

test('fast sweep trims multiple objects against the original boundary and keeps attributes',()=>{
 const shapes=[0,10,20,30,40].map(y=>line('h'+y,{x:-10,y},{x:10,y}));const before=structuredClone(shapes);
 const result=trimSweep(shapes,[vertical(0)],[{x:5,y:-10},{x:5,y:50}]);
 expect(result).toHaveLength(5);for(const r of result){expect(length(r.remaining)).toBeCloseTo(10);expect(length(r.removed)).toBeCloseTo(10);expect(r.remaining[0].layerId).toBe('walls');}
 expect(shapes).toEqual(before);
});
test('both tails of one line, repeated visits, reverse direction and preview agree',()=>{
 const shape=line('a',{x:-10,y:0},{x:20,y:0}),bounds=[vertical(0),vertical(10)];
 const path=[{x:-5,y:-5},{x:-5,y:5},{x:15,y:5},{x:15,y:-5},{x:-5,y:-5},{x:-5,y:5}];
 const result=trimSweep([shape],bounds,path);expect(result).toHaveLength(1);expect(length(result[0].remaining)).toBeCloseTo(10);expect(length(result[0].removed)).toBeCloseTo(20);
 expect(canonical(result)).toEqual(canonical(trimSweep([shape],bounds,[...path].reverse())));
});
test('multiple central cuts create distinct retained fragments',()=>{
 const shape=line('a',{x:-10,y:0},{x:40,y:0});
 const result=trimSweep([shape],[0,10,20,30].map(vertical),[{x:5,y:-5},{x:5,y:5},{x:25,y:5},{x:25,y:-5}])[0];
 expect(result.remaining).toHaveLength(3);expect(new Set(result.remaining.map(s=>s.id)).size).toBe(3);expect(length(result.remaining)).toBeCloseTo(30);
});
test('closed circle wraps across arc seam and ignores tangency',()=>{
 const circle:Shape={id:'c',type:'circle',a:{x:0,y:0},b:{x:10,y:0},color:'#fff'};
 const result=trimSweep([circle],[vertical(0)],[{x:15,y:0},{x:5,y:0}])[0];
 expect(length(result.remaining)).toBeCloseTo(Math.PI*10,5);expect(length(result.removed)).toBeCloseTo(Math.PI*10,5);
 expect(trimSweep([circle],[vertical(0)],[{x:10,y:-20},{x:10,y:20}])).toEqual([]);
});
test('no limits, exact boundary contacts and collinear strokes do nothing',()=>{
 const shape=line('a',{x:-10,y:0},{x:10,y:0});
 expect(trimSweep([shape],[],[{x:5,y:-5},{x:5,y:5}])).toEqual([]);
 expect(trimSweep([shape],[vertical(0)],[{x:0,y:-5},{x:0,y:5}])).toEqual([]);
 expect(trimSweep([shape],[vertical(0)],[{x:-5,y:0},{x:5,y:0}])).toEqual([]);
});
test('drag threshold uses screen pixels; clipping preserves crossing edges and rejects outside edges',()=>{
 expect(isTrimDrag({x:0,y:0},{x:2,y:2})).toBe(false);expect(isTrimDrag({x:0,y:0},{x:4,y:0})).toBe(true);
 const box={x:0,y:0,width:10,height:10};
 expect(clipTrimEdge({x:-10,y:5},{x:20,y:5},box)).toEqual([{x:0,y:5},{x:10,y:5}]);
 expect(clipTrimEdge({x:-10,y:-5},{x:20,y:-5},box)).toEqual([]);
 const shape=line('a',{x:-10,y:0},{x:10,y:0});
 expect(trimSweep([shape],[vertical(0)],[],[[{x:5,y:-5},{x:5,y:-1}],[{x:5,y:1},{x:5,y:5}]])).toEqual([]);
});

test('rectangle and Bezier retain their geometry and unsupported objects are ignored',()=>{
 const rect:Shape={id:'r',type:'rect',a:{x:-10,y:-10},b:{x:10,y:10},color:'#fff'};
 const result=trimSweep([rect],[vertical(0)],[{x:5,y:-20},{x:5,y:20}])[0];
 expect(result.remaining).toHaveLength(1);expect(length(result.remaining)).toBeCloseTo(40);expect(length(result.removed)).toBeCloseTo(40);
 const bezier:Shape={id:'b',type:'bezier',a:{x:-10,y:0},b:{x:10,y:0},color:'#fff',closed:false,nodes:[{p:{x:-10,y:0},out:{x:-5,y:0}},{p:{x:10,y:0},in:{x:5,y:0}}]};
 const cut=trimSweep([bezier],[vertical(0)],[{x:5,y:-5},{x:5,y:5}])[0];
 expect(cut.remaining[0].type).toBe('bezier');expect(length(cut.remaining)).toBeCloseTo(10,2);
 const text:Shape={id:'t',type:'text',a:{x:5,y:0},b:{x:5,y:0},color:'#fff',text:'hello',height:3};
 expect(trimSweep([text],[vertical(0)],[{x:5,y:-5},{x:5,y:5}])).toEqual([]);
});
