import {test,expect} from 'bun:test';
import {threePointArc,segments} from '../src/geometry';
import {resolveCommand} from '../src/drafting';
import {cursorMode} from '../src/cursor';
const base={id:'arc',color:'#fff',a:{x:0,y:0},b:{x:0,y:0}};
test('ARC and A select the three-point tool with a point cursor',()=>{
 for(const command of ['A','arc','ARC'])expect(resolveCommand(command)?.id).toBe('arc');
 expect(cursorMode({tool:'arc',hasSource:false,selectingDimension:false,choosingBoundaries:false,positioning:false,editingText:false})).toBe('point');
});
test('exact circular arc through the second point in either direction, including major arcs',()=>{
 for(const [start,middle,end,sweep] of [[0,Math.PI/2,Math.PI,Math.PI],[0,-Math.PI/2,-Math.PI,-Math.PI],[0,Math.PI,3*Math.PI/2,3*Math.PI/2],[0,-Math.PI,-3*Math.PI/2,-3*Math.PI/2]]){
  const point=(angle:number)=>({x:120+50*Math.cos(angle),y:-80+50*Math.sin(angle)});
  const shape=threePointArc(point(start),point(middle),point(end),base),seg=segments(shape)[0];
  expect(shape.type).toBe('arc');expect(segments(shape)).toHaveLength(1);expect(seg.kind).toBe('arc');
  if(seg.kind==='arc'){expect(seg.radius).toBeCloseTo(50);expect(seg.center.x).toBeCloseTo(120);expect(seg.center.y).toBeCloseTo(-80);expect(seg.sweep).toBeCloseTo(sweep);}
 }
});
test('rejects coincident and collinear points',()=>{
 expect(()=>threePointArc({x:0,y:0},{x:1,y:1},{x:2,y:2},base)).toThrow('alignés');
 expect(()=>threePointArc({x:0,y:0},{x:0,y:0},{x:1,y:2},base)).toThrow('distincts');
});
