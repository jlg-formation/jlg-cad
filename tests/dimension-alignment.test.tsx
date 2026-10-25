import {expect,test} from 'bun:test';
import {renderToStaticMarkup} from 'react-dom/server';
import {dimensionLine,dimensionAlignment,type AlignmentState} from '../src/dimension-alignment';
import {DimensionAlignmentGuide} from '../src/dimension-alignment-ui';
import {dimensionGeometry,sub,linearDimension,distance} from '../src/geometry';
import {moveGrip,objectGrips} from '../src/grips';
import {documentOf,parseDrawing,toDxf,type Dimension,type Viewport,type Point} from '../src/model';
import {paperDimensionClick,updatePaperDimensionPlacement} from '../src/paper-dimensions';
import {synchronizeDrawing} from '../src/associations';
import {objectSnapKinds,StatusPrecision} from '../src/status-precision';
import {initialSettings} from '../src/architecture';

const base={id:'ref',color:'#94bfea'};
const reference:Dimension={...base,type:'dimension',kind:'linear',a:{x:0,y:1000},b:{x:24000,y:1000},linearAngle:0,height:500,offset:-5000};
const target:Dimension={...reference,id:'target',a:{x:30000,y:6000},b:{x:52000,y:6000},height:300,offset:-6000};
const scale=.01;
function acquire(ref=reference,d=target,p=dimensionLine(ref)!.a,zoom=scale){
 const first=dimensionAlignment({},p,d,[ref],zoom,0);
 expect(first.guide).toBeNull();
 return dimensionAlignment(first.state,p,d,[ref],zoom,301);
}

test('acquires after 300 ms, keeps a distant reference and snaps the 22 m line to the 24 m line',()=>{
 const acquired=acquire();expect(acquired.state.referenceId).toBe('ref');
 const p={x:41000,y:-3900},result=dimensionAlignment(acquired.state,p,target,[reference],scale,400);
 expect(result.point).toEqual({x:41000,y:-4000});expect(result.guide?.active).toBe(true);
 const placed=linearDimension(target.a,target.b,result.point,target,target.height);
 expect(dimensionLine(placed)!.a.y).toBe(-4000);
 expect(dimensionGeometry(placed,'m').text).toBe('22 m');expect(dimensionGeometry(reference,'m').text).toBe('24 m');
 expect(placed.a).toEqual(target.a);expect(placed.b).toEqual(target.b);
});

test('requires continuous hover; another reference replaces the first only after acquisition',()=>{
 const second={...reference,id:'second',offset:-10000};
 let result=dimensionAlignment({},dimensionLine(reference)!.a,target,[reference,second],scale,0);
 result=dimensionAlignment(result.state,{x:0,y:10000},target,[reference,second],scale,200);
 expect(result.state.pendingId).toBeUndefined();expect(result.guide).toBeNull();
 result=dimensionAlignment(result.state,dimensionLine(reference)!.a,target,[reference,second],scale,400);
 expect(result.state.referenceId).toBeUndefined();
 result=dimensionAlignment(result.state,dimensionLine(reference)!.a,target,[reference,second],scale,701);
 result=dimensionAlignment(result.state,dimensionLine(second)!.a,target,[reference,second],scale,800);
 expect(result.state.referenceId).toBe('ref');
 result=dimensionAlignment(result.state,dimensionLine(second)!.a,target,[reference,second],scale,1101);
 expect(result.state.referenceId).toBe('second');
});

test('screen tolerances and hysteresis are independent of zoom',()=>{
 for(const zoom of [.01,1,10]){
  const acquired=acquire(reference,target,dimensionLine(reference)!.a,zoom);
  const at=(pixels:number,state:AlignmentState)=>dimensionAlignment(state,{x:40000,y:-4000+pixels/zoom},target,[reference],zoom,500);
  const snapped=at(7,acquired.state);expect(snapped.guide?.active).toBe(true);
  expect(at(11,snapped.state).guide?.active).toBe(true);
  const released=at(13,snapped.state);expect(released.guide?.active).toBe(false);
  expect(at(9,released.state).guide?.active).toBe(false);
  expect(at(7,released.state).guide?.active).toBe(true);
 }
});

test('vertical, inclined and reversed axes align without changing anchors or measurements',()=>{
 for(const angle of [Math.PI/2,Math.PI/5]){
  const ref={...reference,linearAngle:angle,b:{x:reference.a.x+24000*Math.cos(angle),y:reference.a.y+24000*Math.sin(angle)}};
  const d={...target,linearAngle:angle+Math.PI,b:{x:target.a.x-22000*Math.cos(angle),y:target.a.y-22000*Math.sin(angle)}};
  const source=dimensionLine(ref)!,correction=sub(objectGrips(d)[0].point,dimensionLine(d)!.a);
  const acquired=acquire(ref,d);
  const pointer={x:source.a.x+correction.x+100*source.axis.x,y:source.a.y+correction.y+100*source.axis.y};
  const result=dimensionAlignment(acquired.state,pointer,d,[ref],scale,500,correction);
  expect(result.guide?.active).toBe(true);
  const aligned=moveGrip(d,'placement-0',result.point) as Dimension,line=dimensionLine(aligned)!;
  const separation=(line.a.x-source.a.x)*source.normal.x+(line.a.y-source.a.y)*source.normal.y;
  expect(separation).toBeCloseTo(0,8);expect(aligned.a).toEqual(d.a);expect(aligned.b).toEqual(d.b);
  expect(dimensionGeometry(aligned).text).toBe(dimensionGeometry(d).text);
 }
});

test('grip placement compensates text offset for different text heights, including legacy dimensions',()=>{
 for(const height of [100,800])for(const kind of ['linear',undefined] as const){
  const d={...target,height,kind},line=dimensionLine(d)!,grip=objectGrips(d)[0];
  expect(grip.key).toBe('placement-0');
  const correction=sub(grip.point,line.a),acquired=acquire(reference,d);
  const result=dimensionAlignment(acquired.state,{x:40000,y:-4000+correction.y+20},d,[reference],scale,500,correction);
  const edited=moveGrip(d,grip.key,result.point) as Dimension;
  expect(dimensionLine(edited)!.a.y).toBeCloseTo(-4000,9);
  expect(edited.a).toEqual(d.a);expect(edited.b).toEqual(d.b);expect(edited.height).toBe(height);
 }
});

test('ignores the edited dimension, hidden, angular and nonparallel references and decorative attachment lines',()=>{
 const invalid=[target,{...reference,id:'hidden',paperHidden:true},{...reference,id:'angle',kind:'angular' as const,points:[reference.a,reference.b,reference.a]}, {...reference,id:'vertical',linearAngle:Math.PI/2}];
 const result=dimensionAlignment({referenceId:'hidden'},dimensionLine(reference)!.a,target,invalid,scale,1000);
 expect(result.guide).toBeNull();expect(result.state.referenceId).toBeUndefined();
 const attachment={x:0,y:0};
 expect(dimensionAlignment({},attachment,target,[reference],scale,0).state.pendingId).toBeUndefined();
});

test('paper creation aligns outside different scale viewports, retains actual values and survives editing and saving',()=>{
 const v1:Viewport={id:'v1',type:'viewport',color:'#000000',a:{x:10,y:30},b:{x:130,y:130},center:{x:12000,y:5000},denominator:250,locked:true,printBorder:false};
 const v2:Viewport={...v1,id:'v2',a:{x:160,y:60},b:{x:280,y:160},denominator:500,center:{x:11000,y:5000}};
 const layout={id:'sheet',name:'Plan',format:'A4' as const,orientation:'landscape' as const,monochrome:true,items:[v1,v2]};
 const settings={height:3,direction:'',axis:'auto' as const,datum:{x:0,y:0},angularMode:'lines' as const};
 const wall1={...base,id:'wall1',type:'line' as const,a:{x:0,y:0},b:{x:24000,y:0}},wall2={...wall1,id:'wall2',b:{x:22000,y:0}};
 const create=(v:Viewport,wall:typeof wall1,id:string,p:Point)=>paperDimensionClick('linearDimension',{viewportId:v.id,points:[wall.a,wall.b]},layout,[wall],p,.1,{...base,id,a:wall.a,b:wall.b},settings).dimension!;
 const ref=create(v1,wall1,'paper1',{x:70,y:15}),d=create(v2,wall2,'paper2',{x:220,y:35});
 const acquired=acquire(ref,d,dimensionLine(ref)!.a,4),result=dimensionAlignment(acquired.state,{x:220,y:16},d,[ref],4,500);
 expect(result.guide?.active).toBe(true);
 const created=create(v2,wall2,'paper2',result.point);
 expect(dimensionLine(created)!.a.y).toBeCloseTo(15);expect(dimensionGeometry(created,'m').text).toBe('22 m');
 const grip=objectGrips(d)[0],correction=sub(grip.point,dimensionLine(d)!.a);
 const reposition=dimensionAlignment(acquired.state,{x:220,y:15+correction.y+1},d,[ref],4,500,correction);
 const edited=updatePaperDimensionPlacement(moveGrip(d,grip.key,reposition.point) as Dimension,v2);
 const original=documentOf('Paper',[wall1,wall2],[{...layout,items:[v1,v2,ref,d]}]);
 const updated=synchronizeDrawing({...original,layouts:[{...layout,items:[v1,v2,ref,edited]}]},original);
 const saved=parseDrawing(JSON.stringify(updated)),actual=saved.layouts[0].items.find(s=>s.id===d.id) as Dimension;
 expect(dimensionLine(actual)!.a.y).toBeCloseTo(15,9);expect(dimensionGeometry(actual,'m').text).toBe('22 m');
 expect(actual.paperLink!.model.references).toEqual(d.paperLink!.model.references);expect(saved.shapes).toEqual([wall1,wall2]);
 expect(toDxf([actual],undefined,'m')).toContain('22 m');
 expect(distance(actual.a,d.a)).toBeCloseTo(0);expect(distance(actual.b,d.b)).toBeCloseTo(0);
});

test('OSnap exposes the enabled option and guides remain an inert screen overlay',()=>{
 expect(objectSnapKinds).toContain('Alignement des cotations');
 const menu=renderToStaticMarkup(<StatusPrecision bindings={{}} settings={initialSettings} setSettings={()=>{}} kinds={objectSnapKinds} setKinds={()=>{}}/>);
 expect(menu).toContain('Réglages des accrochages');
 const guide=acquire().guide,svg=renderToStaticMarkup(<DimensionAlignmentGuide guide={guide} scale={1} span={1000}/>);
 expect(svg).toContain('pointer-events="none"');expect(svg).toContain('stroke-dasharray');
});
