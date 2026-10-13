import {test,expect} from 'bun:test';
import {trimShape,segments,distance,offsetShape} from '../src/geometry';
import type {PathShape,Point} from '../src/model';

const path=(points:Point[]):PathShape=>({id:'triangle',type:'polyline',color:'#abcdef',a:points[0],b:points[points.length-1],nodes:points.map(p=>({p})),closed:false});
const h=500*Math.sqrt(3);
const source=path([{x:-200,y:0},{x:1000,y:0},{x:500,y:h},{x:-100,y:-h/5}]);

test('trim both tails of one self-intersecting polyline in either order',()=>{
 for(const clicks of [[{x:-150,y:0},{x:-50,y:-h/10}],[{x:-50,y:-h/10},{x:-150,y:0}]]){
  let result:PathShape=structuredClone(source);
  for(const click of clicks){const next=trimShape(result,[result],click);expect(next).toHaveLength(1);result=next[0] as PathShape;}
  expect(result.nodes).toHaveLength(4);
  expect(distance(result.a,{x:0,y:0})).toBeLessThan(.001);
  expect(distance(result.b,result.a)).toBeLessThan(.001);
  expect(segments(result)).toHaveLength(3);
  expect((offsetShape(result,30,{x:500,y:100}) as PathShape).closed).toBe(true);
 }
 expect(source.nodes).toHaveLength(4);
 expect(source.a.x).toBe(-200);
});

test('self intersection preview matches exactly the removed tail',()=>{
 const preview=trimShape(source,[],{x:-150,y:0},true);
 expect(preview).toHaveLength(1);
 expect(preview[0].a).toEqual(source.a);
 expect(distance(preview[0].b,{x:0,y:0})).toBeLessThan(.001);
});

test('ordinary polyline vertices do not create cut boundaries',()=>{
 expect(()=>trimShape(path([{x:0,y:0},{x:1000,y:0},{x:500,y:h}]),[],{x:500,y:0})).toThrow('Aucune intersection');
 const closed={...path([{x:0,y:0},{x:1000,y:0},{x:500,y:h}]),closed:true};
 expect(()=>trimShape(closed,[],{x:500,y:0})).toThrow('Aucune intersection');
});

test('self intersection with an arc preserves the remaining arc',()=>{
 const arc={...path([{x:-1500,y:500},{x:1500,y:500},{x:1000,y:0},{x:-1000,y:0}]),nodes:[{p:{x:-1500,y:500}},{p:{x:1500,y:500}},{p:{x:1000,y:0},bulge:1},{p:{x:-1000,y:0}}]};
 const result=trimShape(arc,[],{x:-1400,y:500});
 expect(result).toHaveLength(1);
 expect(segments(result[0]).some(s=>s.kind==='arc')).toBe(true);
 expect(result[0].a.x).toBeCloseTo(-Math.sqrt(750000),6);
});
