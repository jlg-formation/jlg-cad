import {test,expect} from 'bun:test';
import {trimShape,trimSweep,segments,distance} from '../src/geometry';
import type {Shape} from '../src/model';

const rect:Shape={id:'rectangle',type:'rect',a:{x:0,y:0},b:{x:100,y:60},color:'#abcdef',layerId:'walls'};
const length=(shapes:Shape[])=>shapes.flatMap(segments).reduce((sum,s)=>sum+distance(s.a,s.b),0);

test('all 24 orders of successive rectangle cuts remove all four sides',()=>{
 const sides=segments(rect);
 const orders=(ids:number[]):number[][]=>ids.length?ids.flatMap(id=>orders(ids.filter(other=>other!==id)).map(tail=>[id,...tail])):[[]];
 for(const order of orders([0,1,2,3])){
  let shapes:Shape[]=[structuredClone(rect)];
  for(const [step,index] of order.entries()){
   const side=sides[index],click={x:(side.a.x+side.b.x)/2,y:(side.a.y+side.b.y)/2};
   const target=shapes.find(s=>segments(s).some(part=>distance(part.a,side.a)<1e-8&&distance(part.b,side.b)<1e-8))!;
   expect(target).toBeDefined();
   const before=structuredClone(shapes);
   const preview=trimShape(target,shapes,click,true);
   expect(preview).toHaveLength(1);
   expect(segments(preview[0])).toEqual([side]);
   const remaining=trimShape(target,shapes,click);
   expect(shapes).toEqual(before);
   shapes=shapes.flatMap(s=>s.id===target.id?remaining:[s]);
   expect(shapes.flatMap(segments)).toHaveLength(3-step);
   expect(new Set(shapes.map(s=>s.id)).size).toBe(shapes.length);
   for(const s of shapes){expect(s.color).toBe(rect.color);expect(s.layerId).toBe(rect.layerId);}
  }
  expect(shapes).toEqual([]);
 }
});

test('second cut splits opposite sides or retains a connected L, including with sweep',()=>{
 const opened=trimShape(rect,[rect],{x:50,y:0})[0];
 const opposite=trimShape(opened,[opened],{x:50,y:60});
 expect(opposite).toHaveLength(2);
 expect(opposite.map(s=>segments(s).length)).toEqual([1,1]);
 const adjacent=trimShape(opened,[opened],{x:100,y:30});
 expect(adjacent).toHaveLength(1);
 expect(segments(adjacent[0])).toHaveLength(2);
 const sweep=trimSweep([opened],[opened],[{x:90,y:30},{x:110,y:30}])[0];
 expect(sweep.remaining).toEqual(adjacent);
 expect(length(sweep.removed)).toBeCloseTo(60);
 const last=opposite[0],part=segments(last)[0];
 expect(trimSweep([last],[last],[{x:part.a.x-10,y:30},{x:part.a.x+10,y:30}])[0].remaining).toEqual([]);
});

test('circle implementation seams are never used as fallback cut limits',()=>{
 const circle:Shape={id:'circle',type:'circle',a:{x:0,y:0},b:{x:10,y:0},color:'#fff'};
 expect(()=>trimShape(circle,[],{x:10,y:0})).toThrow('Aucune intersection');
});

test('isolated rectangle: each side can be removed, including across the contour seam',()=>{
 for(const source of [rect,{...rect,a:rect.b,b:rect.a}])for(const side of segments(source)){
  const click={x:(side.a.x+side.b.x)/2,y:(side.a.y+side.b.y)/2};
  const before=structuredClone(source);
  const result=trimShape(source,[source],click);
  const preview=trimShape(source,[source],click,true);
  expect(result).toHaveLength(1);
  expect(result[0].type).toBe('polyline');
  if(result[0].type!=='polyline')throw new Error('Expected polyline');
  expect(result[0].closed).toBe(false);
  expect(result[0].nodes).toHaveLength(4);
  expect(result[0].id).toBe(source.id);
  expect(result[0].color).toBe(source.color);
  expect(result[0].layerId).toBe(source.layerId);
  expect(segments(result[0])).toHaveLength(3);
  expect(segments(preview[0])).toEqual([side]);
  expect(length(result)+length(preview)).toBeCloseTo(320);
  expect(source).toEqual(before);
 }
});

test('isolated rectangle sweep removes only crossed sides and preview agrees',()=>{
 const result=trimSweep([rect],[rect],[{x:50,y:-10},{x:50,y:10}])[0];
 expect(result.remaining).toHaveLength(1);
 expect(segments(result.remaining[0])).toHaveLength(3);
 expect(length(result.remaining)).toBeCloseTo(220);
 expect(length(result.removed)).toBeCloseTo(100);
 const both=trimSweep([rect],[rect],[{x:50,y:-10},{x:50,y:70}])[0];
 expect(both.remaining).toHaveLength(2);
 expect(length(both.remaining)).toBeCloseTo(120);
 expect(length(both.removed)).toBeCloseTo(200);
});

test('rectangle cuts still follow external intersections instead of vertices',()=>{
 const boundary:Shape={id:'limit',type:'line',a:{x:50,y:-10},b:{x:50,y:70},color:'#fff'};
 const result=trimShape(rect,[rect,boundary],{x:75,y:0});
 expect(result).toHaveLength(1);
 expect(length(result)).toBeCloseTo(160);
 const tangent:Shape={...boundary,a:{x:-10,y:10},b:{x:10,y:-10}};
 expect(()=>trimShape(rect,[tangent],{x:75,y:0})).toThrow('Deux intersections');
});
