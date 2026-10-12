import {test,expect} from 'bun:test';
import {rectangleEndpoint,relativeRectangleEndpoint,resolveCommand} from '../src/drafting';
test('rectangle relatif : quatre quadrants, unités et décimales françaises',()=>{
 const a={x:10,y:20};
 for(const x of [-120,120])for(const y of [-80,80])expect(relativeRectangleEndpoint(a,`@${x},${y}`,'mm')).toEqual({x:10+x,y:20-y});
 expect(relativeRectangleEndpoint(a,'1,2;0,8','m')).toEqual({x:1210,y:-780});
 expect(relativeRectangleEndpoint(a,'120 mm;80 mm','m')).toEqual({x:130,y:-60});
 expect(resolveCommand('REC')?.id).toBe('rect');
});
test('dimensions précises indépendantes du pointeur, quadrant conservé',()=>{
 for(const x of [-1,1])for(const y of [-1,1])expect(rectangleEndpoint({x:0,y:0},{x,y},'120','80','mm')).toEqual({x:x*120,y:y*80});
 for(const text of ['0','-1','abc'])expect(()=>rectangleEndpoint({x:0,y:0},{x:1,y:1},text,'80','mm')).toThrow();
 for(const text of ['@0,80','@120,0','@1,2,3'])expect(()=>relativeRectangleEndpoint({x:0,y:0},text,'mm')).toThrow();
});
