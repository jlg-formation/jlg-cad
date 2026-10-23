import {test,expect} from 'bun:test';
import {trimShape,trimSweep,segments} from '../src/geometry';
import type {PathShape,Shape,Point} from '../src/model';

const path=(points:Point[],closed=false):PathShape=>({id:'path',type:'polyline',a:points[0],b:points.at(-1)!,nodes:points.map(p=>({p})),closed,color:'#abcdef',layerId:'walls'});
const source=path([{x:0,y:0},{x:20,y:0},{x:30,y:10},{x:40,y:10},{x:50,y:20}]);
const boundary:Shape={id:'boundary',type:'line',a:{x:10,y:-5},b:{x:10,y:5},color:'#fff'};

test('intersection on a distant segment does not expand click or sweep removal',()=>{
 const before=structuredClone(source),target=segments(source)[3];
 const preview=trimShape(source,[boundary],{x:45,y:15},true);
 expect(preview.flatMap(segments)).toEqual([target]);
 const remaining=trimShape(source,[boundary],{x:45,y:15});
 expect(remaining.flatMap(segments)).toEqual(segments(source).slice(0,3));
 const sweep=trimSweep([source],[boundary],[{x:43,y:17},{x:47,y:13}])[0];
 expect(sweep.removed.flatMap(segments)).toEqual([target]);
 expect(sweep.remaining).toEqual(remaining);
 expect(source).toEqual(before);
});

test('shared endpoint with another object does not trim several polyline segments',()=>{
 const touching:Shape={...boundary,a:{x:0,y:0},b:{x:0,y:-10}};
 const preview=trimShape(source,[touching],{x:35,y:10},true);
 expect(preview.flatMap(segments)).toEqual([segments(source)[2]]);
 const remaining=trimShape(source,[touching],{x:35,y:10});
 expect(remaining).toHaveLength(2);
 expect(remaining.flatMap(segments)).toEqual(segments(source).filter((_,i)=>i!==2));
 expect(new Set(remaining.map(s=>s.id)).size).toBe(2);
});

test('local intersections still delimit a partial segment without crossing vertices',()=>{
 const preview=trimShape(source,[boundary],{x:15,y:0},true);
 expect(preview.flatMap(segments)).toEqual([{kind:'line',a:{x:10,y:0},b:{x:20,y:0}}]);
});

test('closed polyline with one contact respects vertices on either side of seam',()=>{
 const closed=path([{x:0,y:0},{x:20,y:0},{x:20,y:20},{x:0,y:20}],true);
 const touching:Shape={...boundary,a:{x:20,y:0},b:{x:30,y:-10}};
 for(const index of [0,3]){
  const side=segments(closed)[index];
  const click={x:(side.a.x+side.b.x)/2,y:(side.a.y+side.b.y)/2};
  expect(trimShape(closed,[touching],click,true).flatMap(segments)).toEqual([side]);
  expect(trimShape(closed,[touching],click).flatMap(segments)).toHaveLength(3);
 }
});
