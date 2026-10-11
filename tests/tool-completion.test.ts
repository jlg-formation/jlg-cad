import {expect,test} from 'bun:test';
import {completedPath,constructedItem} from '../src/tool-completion';
const base={id:'path',a:{x:0,y:0},b:{x:0,y:0},color:'#abcdef'};
test('Bézier completion keeps exactly the confirmed nodes and smooths the open curve',()=>{
 const nodes=[{p:{x:0,y:0}},{p:{x:100,y:100}},{p:{x:200,y:0}},{p:{x:300,y:50}}];
 const path=completedPath('bezier',base,nodes)!;
 expect(path.nodes.map(n=>n.p)).toEqual(nodes.map(n=>n.p));expect(path.closed).toBe(false);expect(path.b).toEqual({x:300,y:50});
 expect(path.nodes[1].out).toBeDefined();expect(nodes[1]).toEqual({p:{x:100,y:100}});
});
test('two-point curves survive exit, one point is insufficient, and arc data is preserved',()=>{
 expect(completedPath('bezier',base,[{p:{x:0,y:0}}])).toBeNull();
 expect(completedPath('bezier',base,[{p:{x:0,y:0}},{p:{x:100,y:50}}])?.nodes).toHaveLength(2);
 const path=completedPath('polyline',base,[{p:{x:0,y:0},bulge:1},{p:{x:100,y:50}}])!;expect(path.nodes[0].bulge).toBe(1);expect(path.closed).toBe(false);
});
test('unfinished degenerate shapes are not saved on exit',()=>{
 expect(constructedItem({...base,type:'line'})).toBe(false);
 expect(constructedItem({...base,type:'circle',b:{x:100,y:0}})).toBe(true);
 expect(constructedItem({...base,type:'rect',b:{x:100,y:0}})).toBe(false);
 expect(constructedItem({...base,type:'rect',b:{x:100,y:50}})).toBe(true);
});
