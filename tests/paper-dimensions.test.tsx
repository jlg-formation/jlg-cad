import {test,expect} from 'bun:test';
import {inflateSync} from 'node:zlib';
import {renderToStaticMarkup} from 'react-dom/server';
import {paperDimensionClick,paperDimensionSnap,paperDimensionPreview,dimensionViewport,updatePaperDimensionPlacement,dimensionReferences,type PaperDimensionSession,type PaperDimensionSettings,type PaperDimensionTool} from '../src/paper-dimensions';
import {documentOf,modelToPaper,parseDrawing,type Dimension,type Point,type Shape,type Viewport,type Layout} from '../src/model';
import {dimensionGeometry,segments,threePointArc} from '../src/geometry';
import {synchronizeDrawing} from '../src/associations';
import {createPdf} from '../src/pdf';
import {moveGrip,objectGrips} from '../src/grips';
import {ArchitectureToolbar,CommandPanel,initialSettings} from '../src/architecture';
import {repeatableHistory} from '../src/repeat-command';

const zero={x:0,y:0},base={id:'paper-dimension',a:zero,b:zero,color:'#17242a'};
const wall:Shape={...base,id:'wall',type:'line',a:zero,b:{x:5000,y:0}};
const viewport:Viewport={...base,id:'view',type:'viewport',a:{x:20,y:20},b:{x:220,y:170},center:{x:2500,y:500},denominator:50,locked:true,printBorder:false};
const layout:Layout={id:'sheet',name:'Plan',format:'A4',orientation:'landscape',monochrome:true,items:[viewport]};
const settings:PaperDimensionSettings={direction:'',axis:'auto',datum:zero,height:3,angularMode:'lines'};
function dimension(tool:PaperDimensionTool='linearDimension',ps=[wall.a,wall.b],sheet={x:120,y:60},shapes:Shape[]=[wall],extra:Partial<PaperDimensionSession>={}){
 return paperDimensionClick(tool,{viewportId:'view',points:ps,...extra},layout,shapes,sheet,.1,base,settings).dimension!;
}
const withDimension=(d=dimension(),shapes=[wall])=>documentOf('Plan',shapes,[{...layout,items:[viewport,d]}]);
const paperDimension=(doc:ReturnType<typeof documentOf>)=>doc.layouts[0].items.find((s):s is Dimension=>s.type==='dimension')!;

test('paper workflow creates a real 5 m measurement through a locked viewport without any model dimension',()=>{
 let session:PaperDimensionSession|null=null,d:Dimension|undefined;
 for(const p of [modelToPaper(wall.a,viewport),modelToPaper(wall.b,viewport),{x:120,y:10}]){const result=paperDimensionClick('linearDimension',session,layout,[wall],p,.1,base,settings);session=result.session;d=result.dimension;}
 expect(session).toBeNull();expect(d?.height).toBe(3);expect(d?.paperLink?.viewportId).toBe('view');expect(dimensionGeometry(d!,'m').text).toBe('5 m');
 const doc=synchronizeDrawing(withDimension(d));expect(doc.shapes).toEqual([wall]);expect(doc.layouts[0].items).toHaveLength(2);expect(paperDimension(doc).paperLink?.model.references).toHaveLength(2);
});
test('model changes update paper anchors and values; scales and pans preserve printed height',()=>{
 const original=withDimension(),changed=synchronizeDrawing({...original,shapes:[{...wall,b:{x:6000,y:0}}]},original),d=paperDimension(changed);
 expect(dimensionGeometry(d,'m').text).toBe('6 m');expect(d.b).toEqual(modelToPaper({x:6000,y:0},viewport));
 const v={...viewport,denominator:100,center:{x:3500,y:500}},scaled=synchronizeDrawing({...changed,layouts:[{...layout,items:[v,d]}]},changed),next=paperDimension(scaled);
 expect(next.a).toEqual(modelToPaper(wall.a,v));expect(next.b).toEqual(modelToPaper({x:6000,y:0},v));expect(next.height).toBe(3);expect(dimensionGeometry(next,'m').text).toBe('6 m');
 expect(dimensionGeometry(next).arrows[0][0]).toEqual(dimensionGeometry(next).lines[2][0]);
});
test('two presentations and two windows keep independent paper annotations',()=>{
 const d=dimension(),v2={...viewport,id:'detail',denominator:100},other={...layout,id:'other',items:[v2]};
 const doc=documentOf('x',[wall],[{...layout,items:[viewport,v2,d]},other]);
 const updated=synchronizeDrawing({...doc,layouts:[{...doc.layouts[0],items:[viewport,{...v2,center:zero},d]},other]},doc);
 expect(paperDimension(updated).a).toEqual(d.a);expect(updated.layouts[1].items).toHaveLength(1);expect(updated.shapes).toEqual([wall]);
});
test('all eight tools produce paper geometry and model measurements with fixed printed height',()=>{
 const arc=threePointArc({x:1000,y:0},{x:2000,y:-1000},{x:3000,y:0},{...base,id:'arc'}),part=segments(arc)[0];
 if(part.kind!=='arc')throw new Error('Expected circular arc');
 const cases:[PaperDimensionTool,Point[],Partial<PaperDimensionSession>,Shape[]][]=[
  ['linearDimension',[wall.a,wall.b],{},[wall]],['alignedDimension',[wall.a,{x:4000,y:-3000}],{},[wall]],
  ['angularDimension',[zero,{x:1000,y:0},{x:0,y:-1000}],{},[wall]],
  ['arcDimension',[part.center,part.a,part.b],{sourceId:'arc',sweep:part.sweep},[arc]],
  ['radius',[part.center,part.a,part.b],{sourceId:'arc',sweep:part.sweep},[arc]],
  ['diameter',[part.center,part.a,part.b],{sourceId:'arc',sweep:part.sweep},[arc]],
  ['ordinate',[{x:2000,y:-1000}],{},[wall]],
  ['jogged',[part.center,part.a,part.b,{x:1000,y:1000},{x:2000,y:1000}],{sourceId:'arc',sweep:part.sweep},[arc]]
 ];
 for(const [tool,ps,extra,shapes] of cases){const d=dimension(tool,ps,{x:180,y:80},shapes,extra);expect(d.paperLink).toBeDefined();expect(d.height).toBe(3);expect(dimensionGeometry(d,'m').text).toBe(dimensionGeometry(d.paperLink!.model,'m').text);expect(parseDrawing(JSON.stringify(withDimension(d,shapes))).layouts[0].items).toHaveLength(2);}
});
test('snaps through windows use model endpoints, midpoints and intersections, and ignore outside points',()=>{
 const midpoint=modelToPaper({x:2500,y:0},viewport),snap=paperDimensionSnap(layout,[wall],{x:midpoint.x+.03,y:midpoint.y},.1,null,['Milieu']);
 expect(snap?.point).toEqual(midpoint);expect(snap?.kind).toBe('Milieu');
 const d=dimension('linearDimension',[{x:2500,y:0},wall.b]);expect(d.paperLink?.model.references?.[0].feature).toBe('at');
 const doc=withDimension(d),next=synchronizeDrawing({...doc,shapes:[{...wall,b:{x:6000,y:0}}]},doc);expect(paperDimension(next).paperLink?.model.a.x).toBe(3000);
 expect(paperDimensionSnap(layout,[wall],{x:400,y:400},1,null,['Extrémité'])).toBeNull();
 const vertical:Shape={...wall,id:'vertical',a:{x:2000,y:-1000},b:{x:2000,y:1000}},model={...d.paperLink!.model,a:{x:2000,y:0}},refs=dimensionReferences(model,[wall,vertical]);
 expect(refs[0].feature).toBe('intersection');
 const intersect={...d,paperLink:{viewportId:'view',model:{...model,references:refs}}},changed=synchronizeDrawing(withDimension(intersect,[wall,{...vertical,a:{x:3000,y:-1000},b:{x:3000,y:1000}}]));
 expect(paperDimension(changed).paperLink!.model.a.x).toBe(3000);
});
test('a paper command remains bound to its initial viewport and rejects a second view',()=>{
 const other={...viewport,id:'other',a:{x:230,y:20},b:{x:290,y:100}},l={...layout,items:[viewport,other]};
 const first=paperDimensionClick('linearDimension',null,l,[wall],modelToPaper(wall.a,viewport),1,base,settings);
 expect(dimensionViewport(l,{x:250,y:50},first.session)?.id).toBe('view');
 expect(()=>paperDimensionClick('linearDimension',first.session,l,[wall],{x:250,y:50},1,base,settings)).toThrow('même fenêtre');
 expect(()=>paperDimensionClick('radius',null,layout,[wall],{x:260,y:200},1,base,settings)).toThrow('fenêtre');
});
test('out-of-frame annotations hide and reappear; source and window deletion retain a detached value',()=>{
 const original=withDimension(),d=paperDimension(original),outside={...viewport,center:{x:100000,y:100000}},hidden=synchronizeDrawing({...original,layouts:[{...layout,items:[outside,d]}]},original);
 expect(paperDimension(hidden).paperHidden).toBe(true);expect(dimensionGeometry(paperDimension(hidden),'m').text).toBe('5 m');
 const visible=synchronizeDrawing({...hidden,layouts:[{...layout,items:[viewport,paperDimension(hidden)]}]},hidden);expect(paperDimension(visible).paperHidden).toBe(false);
 const sourceDeleted=synchronizeDrawing({...original,shapes:[]},original);expect(dimensionGeometry(paperDimension(sourceDeleted),'m').text).toBe('5 m');expect(paperDimension(sourceDeleted).associationWarning).toContain('supprimée');expect(()=>parseDrawing(JSON.stringify(sourceDeleted))).not.toThrow();
 const windowDeleted=synchronizeDrawing({...original,layouts:[{...layout,items:[d]}]},original);expect(paperDimension(windowDeleted).paperLink?.viewportId).toBeUndefined();expect(dimensionGeometry(paperDimension(windowDeleted),'m').text).toBe('5 m');expect(()=>parseDrawing(JSON.stringify(windowDeleted))).not.toThrow();
});
test('placement grips edit the paper annotation without moving or detaching the building',()=>{
 const d=dimension(),g=objectGrips(d)[0],edited=moveGrip(d,g.key,{x:g.point.x,y:g.point.y-10}) as Dimension;
 const updated=updatePaperDimensionPlacement(edited,viewport),doc=synchronizeDrawing(withDimension(updated));
 expect(doc.shapes).toEqual([wall]);expect(paperDimension(doc).offset).toBeCloseTo(d.offset-10);expect(paperDimension(doc).paperLink?.model.references).toHaveLength(2);
});
test('native validation checks the viewport, model anchors and nested definition',()=>{
 const d=dimension();expect(parseDrawing(JSON.stringify(withDimension())).version).toBe(9);
 for(const paperLink of [{...d.paperLink,viewportId:'missing'},{...d.paperLink,model:{...d.paperLink!.model,paperLink:d.paperLink}},{...d.paperLink,model:{...d.paperLink!.model,references:[{id:'missing',point:0,segment:0,feature:'a'}]}}])expect(()=>parseDrawing(JSON.stringify(withDimension({...d,paperLink} as Dimension)))).toThrow();
 expect(()=>parseDrawing(JSON.stringify(documentOf('invalid',[d])))).toThrow();
});
test('PDF preserves model values on paper after scale changes and excludes hidden dimensions',()=>{
 const doc=withDimension(),v={...viewport,denominator:100},changed=synchronizeDrawing({...doc,layouts:[{...layout,items:[v,dimension()]}]},doc),pdf=createPdf(changed,changed.layouts,'m');
 expect(pdf.getNumberOfPages()).toBe(1);expect(dimensionGeometry(paperDimension(changed),'m').text).toBe('5 m');expect(paperDimension(changed).height).toBe(3);
 const stream=(raw:string)=>inflateSync(Buffer.from(raw.match(/stream\n([\s\S]*?)\nendstream/)![1],'latin1')).toString('latin1');
 expect(stream(pdf.output())).toContain('(5 m)');expect(stream(pdf.output())).not.toContain('(0,05 m)');
 const hidden=synchronizeDrawing({...doc,layouts:[{...layout,items:[{...viewport,center:{x:100000,y:100000}},dimension()]}]},doc);
 expect(stream(createPdf(hidden,hidden.layouts,'m').output())).not.toContain('(5 m)');
});
test('paper two-line angular dimensions draw the chosen quadrant as well as measuring it',()=>{
 const x:Shape={...wall,id:'x',b:{x:1000,y:0}},y:Shape={...wall,id:'y',b:{x:0,y:-1000}};
 const d=dimension('angularDimension',[zero,x.b,y.b],modelToPaper({x:1000,y:1000},viewport),[x,y],{angleSources:[{id:'x',segment:0,position:1},{id:'y',segment:0,position:1}]});
 expect(dimensionGeometry(d).text).toBe('90°');expect(dimensionGeometry(d).lines.length).toBeLessThan(60);
});
test('paper toolbar, fields and repeat expose dimensions without a manual annotation scale',()=>{
 const toolbar=renderToStaticMarkup(<ArchitectureToolbar paper tool="linearDimension" onTool={()=>{}} shortcut={()=>''}/>);expect(toolbar).toContain('DIMLINEAR');
 const panel=renderToStaticMarkup(<CommandPanel paper tool="linearDimension" settings={initialSettings} setSettings={()=>{}} shortcut={()=>''} onApply={()=>{}} onFinish={()=>{}} points={0} boundaries={0} choosing={false} onBoundaries={()=>{}} hasSource={false}/>);
 expect(panel).not.toContain('Échelle de cote 1 :');expect(panel).toContain('taille imprimée constante');expect(repeatableHistory(['linearDimension','offset'],true,['linearDimension','offset'])).toEqual(['linearDimension']);
});
