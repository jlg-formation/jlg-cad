import {expect,test} from 'bun:test';
import {itemInSelection,rectangleSelection,signedArea,validLasso,readSelectionPreferences} from '../src/selection';
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
test('preferences default to rectangle, both directions enabled, and survive serialization',()=>{
 expect(readSelectionPreferences('broken')).toEqual({lasso:false,blue:true,green:true});
 expect(readSelectionPreferences('{"lasso":true,"blue":false,"green":"bad"}')).toEqual({lasso:true,blue:false,green:true});
});
