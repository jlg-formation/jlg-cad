import {test,expect} from 'bun:test';
import {offsetShape,segments,distance} from '../src/geometry';
import type {PathShape,Node,Point} from '../src/model';

const path=(nodes:Node[],closed=false):PathShape=>({id:'contour',type:'polyline',color:'#abcdef',nodes,a:nodes[0].p,b:nodes[nodes.length-1].p,closed});
const expectContinuous=(shape:PathShape)=>{
 const parts=segments(shape);
 expect(shape.closed).toBe(true);
 for(let i=0;i<parts.length;i++)expect(distance(parts[i].b,parts[(i+1)%parts.length].a)).toBeLessThan(.001);
};

test('coincident octagon endpoints offset like an explicitly closed contour on both sides',()=>{
 const nodes=Array.from({length:8},(_,i)=>({p:{x:1000*Math.cos(i*Math.PI/4),y:1000*Math.sin(i*Math.PI/4)}}));
 const source=path([...nodes,{p:{...nodes[0].p}}]),before=structuredClone(source);
 for(const side of [{x:0,y:0},{x:1500,y:0}]){
  const result=offsetShape(source,100,side) as PathShape;
  expectContinuous(result);
  expect(result.nodes).toEqual((offsetShape(path(nodes,true),100,side) as PathShape).nodes);
  expectContinuous(offsetShape(result,50,side) as PathShape);
 }
 expect(source).toEqual(before);
});

test('coincident endpoints preserve the closing arc',()=>{
 const source=path([{p:{x:1000,y:0},bulge:1},{p:{x:-1000,y:0},bulge:1},{p:{x:1000,y:0}}]);
 const result=offsetShape(source,100,{x:0,y:0}) as PathShape;
 expectContinuous(result);
 expect(segments(result)).toHaveLength(2);
 for(const part of segments(result)){
  expect(part.kind).toBe('arc');
  if(part.kind==='arc')expect(part.radius).toBeCloseTo(900,8);
 }
});

test('closure absorbs numerical noise but preserves a real opening',()=>{
 const nodes=[{p:{x:0,y:0}},{p:{x:1000,y:0}},{p:{x:1000,y:1000}},{p:{x:0,y:1000}}];
 const side:Point={x:500,y:100};
 expectContinuous(offsetShape(path([...nodes,{p:{x:0,y:.0001}}]),100,side) as PathShape);
 expect((offsetShape(path([...nodes,{p:{x:0,y:1}}]),100,{x:500,y:-100}) as PathShape).closed).toBe(false);
 expect(()=>offsetShape(path([...nodes,{p:{x:0,y:0}}]),600,side)).toThrow();
});
