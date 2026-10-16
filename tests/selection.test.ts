import {expect,test} from 'bun:test';
import {itemInSelection,rectangleSelection,signedArea,validLasso,readSelectionPreferences,startSelection,moveSelection,releaseSelection,combineSelection} from '../src/selection';
import {type Shape} from '../src/model';
const line=(a:{x:number;y:number},b:{x:number;y:number}):Shape=>({id:'1',type:'line',a,b,color:'#abcdef'});
const box=rectangleSelection({x:0,y:0},{x:10,y:10});
test('blue contains whole objects, green includes crossing, touching and collinear objects',()=>{
 for(const s of [line({x:2,y:2},{x:8,y:8}),line({x:0,y:0},{x:10,y:0})])expect(itemInSelection(s,box,false)).toBe(true);
 const through=line({x:-5,y:5},{x:15,y:5});expect(itemInSelection(through,box,false)).toBe(false);expect(itemInSelection(through,box,true)).toBe(true);
 expect(itemInSelection(line({x:-5,y:0},{x:15,y:0}),box,true)).toBe(true);
 expect(itemInSelection(line({x:-5,y:-5},{x:0,y:0}),box,true)).toBe(true);
 expect(itemInSelection(line({x:-5,y:-5},{x:-1,y:-1}),box,true)).toBe(false);
});
test('circle selection uses the actual circumference, including tangency',()=>{
 const circle:Shape={...line({x:0,y:0},{x:10,y:0}),type:'circle'};
 expect(itemInSelection(circle,rectangleSelection({x:6,y:6},{x:7,y:7}),true)).toBe(false);
 expect(itemInSelection(circle,rectangleSelection({x:10,y:-1},{x:11,y:1}),true)).toBe(true);
 expect(itemInSelection(circle,rectangleSelection({x:-10,y:-10},{x:10,y:10}),false)).toBe(true);
 expect(itemInSelection(circle,box,false)).toBe(false);
});
test('concave lasso excludes a line leaving the zone despite contained endpoints',()=>{
 const polygon=[{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:6,y:10},{x:6,y:4},{x:4,y:4},{x:4,y:10},{x:0,y:10}];
 const s=line({x:2,y:8},{x:8,y:8});expect(itemInSelection(s,polygon,false)).toBe(false);expect(itemInSelection(s,polygon,true)).toBe(true);
});
test('arc and Bézier bulges count outside the selection despite contained endpoints',()=>{
 const curve:Shape={...line({x:2,y:5},{x:8,y:5}),type:'bezier',closed:false,nodes:[{p:{x:2,y:5},out:{x:2,y:-20}},{p:{x:8,y:5},in:{x:8,y:-20}}]};
 expect(itemInSelection(curve,box,false)).toBe(false);expect(itemInSelection(curve,box,true)).toBe(true);
 const arc:Shape={...curve,type:'polyline',nodes:[{p:{x:2,y:5},bulge:3},{p:{x:8,y:5}}]};expect(itemInSelection(arc,box,false)).toBe(false);
});
test('lasso winding is clockwise with screen Y down; crossings and tiny traces are refused',()=>{
 expect(signedArea(box)).toBeGreaterThan(0);expect(signedArea([...box].reverse())).toBeLessThan(0);expect(validLasso(box)).toBe(true);
 expect(validLasso([{x:0,y:0},{x:10,y:10},{x:0,y:10},{x:10,y:0}])).toBe(false);
 expect(validLasso([{x:0,y:0},{x:10,y:10},{x:0,y:0}])).toBe(false);
});
test('preferences enable automatic lasso, migrate legacy settings, and preserve explicit new choices',()=>{
 expect(readSelectionPreferences('broken')).toEqual({lasso:true,blue:true,green:true});
 expect(readSelectionPreferences('{"lasso":true,"blue":false,"green":"bad"}')).toEqual({lasso:true,blue:false,green:true});
});


test('legacy rectangle preference migrates, new opt-out persists',()=>{
 expect(readSelectionPreferences('{"lasso":false,"blue":false}')).toEqual({lasso:true,blue:false,green:true});
 expect(readSelectionPreferences('{"version":2,"lasso":false}').lasso).toBe(false);
});
test('click release followed by movement remains a rectangle with lasso enabled',()=>{
 const s=startSelection({x:20,y:20},['old'],false);
 expect(releaseSelection(s,{x:21,y:21},true)).toBe(false);
 expect(s.phase).toBe('rectangle');
 moveSelection(s,{x:60,y:60},true);expect(s.phase).toBe('rectangle');expect(s.crossing).toBe(false);
 moveSelection(s,{x:0,y:60},true);expect(s.crossing).toBe(true);
 expect(releaseSelection(s,{x:0,y:60},true)).toBe(false);
});
test('held movement starts a lasso after tolerance, and direction stays fixed when looping',()=>{
 const s=startSelection({x:20,y:20},[],false,0);
 moveSelection(s,{x:22,y:21},true,100);expect(s.phase).toBe('pending');
 moveSelection(s,{x:10,y:20},true,200);expect(s.phase).toBe('lasso');expect(s.crossing).toBe(true);
 moveSelection(s,{x:60,y:60},true);expect(s.crossing).toBe(true);
 expect(releaseSelection(s,{x:20,y:60},true)).toBe(true);
 const right=startSelection({x:20,y:20},[],false,0);
 moveSelection(right,{x:30,y:20},true,200);moveSelection(right,{x:0,y:40},true,300);expect(right.crossing).toBe(false);
});
test('disabled lasso allows drag rectangles and release detects movement without move event',()=>{
 const s=startSelection({x:20,y:20},[],false,0);
 expect(releaseSelection(s,{x:60,y:60},false,250)).toBe(true);expect(s.phase).toBe('dragRectangle');
 const l=startSelection({x:20,y:20},[],false,0);expect(releaseSelection(l,{x:60,y:60},true,250)).toBe(true);expect(l.phase).toBe('lasso');
});
test('successive selections accumulate, Shift only removes, and snapshot survives cancellation',()=>{
 const previous=['a','b'],s=startSelection({x:0,y:0},previous,true);previous.push('c');
 expect(s.previous).toEqual(['a','b']);
 expect(combineSelection(s.previous,['b','d'],false)).toEqual(['a','b','d']);
 expect(combineSelection(s.previous,['b','d'],true)).toEqual(['a']);
 expect(combineSelection(s.previous,[],false)).toEqual(['a','b']);
});

test('moving quick clicks keep their first corner and wait for the second click',()=>{
 for(const lasso of [true,false]){
  const s=startSelection({x:20,y:20},['old'],true,1000);
  moveSelection(s,{x:50,y:30},lasso,1050);
  expect(s.phase).toBe('pending');
  expect(s.points).toEqual([{x:20,y:20},{x:50,y:30}]);
  expect(releaseSelection(s,{x:80,y:40},lasso,1199)).toBe(false);
  expect(s.phase).toBe('rectangle');
  expect(s.points).toEqual([{x:20,y:20},{x:80,y:40}]);
  moveSelection(s,{x:0,y:60},lasso,1500);
  expect(s.phase).toBe('rectangle');expect(s.crossing).toBe(true);
  expect(s.previous).toEqual(['old']);expect(s.remove).toBe(true);
 }
});

test('quick release works without move events and holding still never starts a drag',()=>{
 for(const lasso of [true,false]){
  const quick=startSelection({x:0,y:0},[],false,0);
  expect(releaseSelection(quick,{x:100,y:50},lasso,100)).toBe(false);
  expect(quick.phase).toBe('rectangle');
  const still=startSelection({x:0,y:0},[],false,0);
  expect(releaseSelection(still,{x:1,y:1},lasso,500)).toBe(false);
  expect(still.phase).toBe('rectangle');
 }
});
