import {expect,test} from 'bun:test';
import {continueLine,lineClosingPoint,type Line} from '../src/line-session';
import {lineEndpoint} from '../src/drafting';

const start:Line={id:'first',type:'line',a:{x:0,y:0},b:{x:900,y:500},color:'#abcdef',layerId:'murs'};

test('four successive lines are independent and continue exactly from each confirmed endpoint',()=>{
 let draft=start;const lines:Line[]=[];
 for(const [index,end] of [{x:100,y:0},{x:100,y:200},{x:300,y:200},{x:300,y:400}].entries()){
  const next=continueLine(draft,end,'next-'+index);lines.push(next.segment);
  expect(next.preview.a).toEqual(end);expect(next.preview.b).toEqual(end);
  expect(next.preview.id).not.toBe(next.segment.id);draft=next.preview;
 }
 expect(new Set(lines.map(s=>s.id)).size).toBe(4);
 expect(lines.map(s=>s.type)).toEqual(['line','line','line','line']);
 expect(lines[1].a).toEqual(lines[0].b);expect(lines[3].a).toEqual(lines[2].b);
 expect(lines.every(s=>s.layerId==='murs'&&s.color==='#abcdef')).toBe(true);
 expect(start.b).toEqual({x:900,y:500});
 // Ending the command discards only draft; all four confirmed lines remain.
 expect(lines).toHaveLength(4);
});

test('precise lengths use the new origin and closure creates another independent line',()=>{
 const first=continueLine(start,lineEndpoint(start.a,{x:100,y:0},'10 cm','mm',false,0,''),'second');
 const second=continueLine(first.preview,lineEndpoint(first.preview.a,{x:100,y:200},'20 cm','mm',false,0,''),'third');
 expect(first.segment.b).toEqual({x:100,y:0});expect(second.segment.b.x).toBeCloseTo(100);expect(second.segment.b.y).toBeCloseTo(200);
 const close=continueLine(second.preview,lineClosingPoint([first.segment,second.segment]),'fourth');
 expect(close.segment.a).toEqual(second.segment.b);expect(close.segment.b).toEqual(start.a);
 expect(close.segment.id).toBe('third');
});

test('rejects zero length and non-finite points without changing the preview',()=>{
 for(const end of [start.a,{x:NaN,y:0},{x:Infinity,y:0}])expect(()=>continueLine(start,end,'next')).toThrow();
 expect(start.id).toBe('first');expect(start.a).toEqual({x:0,y:0});
 expect(()=>lineClosingPoint([])).toThrow();expect(()=>lineClosingPoint([start])).toThrow();
});
