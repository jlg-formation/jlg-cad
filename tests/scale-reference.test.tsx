import {expect,test} from 'bun:test';
import {renderToStaticMarkup} from 'react-dom/server';
import {beginScaleReference,scaleOption,scaleReferencePoint,scaleReferenceInput,scaleReferencePreview,scaleReferencePrompt} from '../src/scale-reference';
import {scaleSelection} from '../src/scale';
import {documentOf,type Shape} from '../src/model';
import {referenceSize,type ReferenceShape} from '../src/references';
import {ScaleEntry,ScaleReferenceGuide} from '../src/scale-reference-ui';
import {toolHelp} from '../src/tool-help';

const base={x:10,y:20};
const picture:ReferenceShape={id:'plan',type:'reference',sourceId:'source',page:1,a:{x:10,y:-80},b:{x:210,y:-80},c:base,color:'#abcdef',layerId:'0',visible:true,frame:2,fade:0,contrast:50,brightness:50,monochrome:false,transparent:true,clipEnabled:false,front:false,pdfSnap:false};

test('SCALE R: first reference point, second reference point, then a point on the target circle',()=>{
 const targetCircle:Shape={id:'circle',type:'circle',a:base,b:{x:510,y:20},color:'#abcdef'};
 const drawing=documentOf('Église',[picture,targetCircle]),original=JSON.stringify(drawing);
 let session=beginScaleReference();
 session=scaleReferencePoint(session,base,base).session;
 expect(session.phase).toBe('referenceEnd');
 session=scaleReferencePoint(session,base,{x:110,y:20}).session;
 expect(session.phase).toBe('length');expect(session.referenceLength).toBe(100);
 expect(scaleReferencePreview(session,base,targetCircle.b,'','mm')).toBe(5);
 expect(JSON.stringify(drawing)).toBe(original);
 const result=scaleReferencePoint(session,base,targetCircle.b);
 expect(result.factor).toBe(5);
 const scaled=scaleSelection(drawing,['plan'],base,result.factor!);
 const next=scaled.shapes[0] as ReferenceShape;
 expect(next.c).toEqual(base);expect(referenceSize(next)).toEqual({width:1000,height:500});expect(scaled.shapes[1]).toBe(targetCircle);
 expect(JSON.stringify(drawing)).toBe(original);
});

test('new-length point uses the fixed scale base even when the reference starts elsewhere',()=>{
 let session=beginScaleReference();
 session=scaleReferencePoint(session,base,{x:1000,y:1000}).session;
 session=scaleReferencePoint(session,base,{x:1030,y:1040}).session;
 expect(session.referenceLength).toBe(50);
 expect(scaleReferencePoint(session,base,{x:10,y:220}).factor).toBe(4);
 expect(scaleReferencePreview(session,base,{x:10,y:220},'','mm')).toBe(4);
});

test('reference and target lengths accept explicit units, current units and French decimals',()=>{
 let session=scaleReferenceInput(beginScaleReference(),'0,5','m').session;
 expect(session.referenceLength).toBe(500);
 expect(scaleReferenceInput(session,'2 m','mm').factor).toBe(4);
 expect(scaleReferencePreview(session,base,base,'2 m','mm')).toBe(4);
 session=scaleReferenceInput(beginScaleReference(),'100 cm','mm').session;
 expect(scaleReferenceInput(session,'0,5 m','cm').factor).toBe(.5);
});

test('P Points measures an independent target segment without moving or rotating the base',()=>{
 let session=scaleReferenceInput(beginScaleReference(),'10 mm','mm').session;
 session=scaleReferenceInput(session,'p','mm').session;expect(session.phase).toBe('targetStart');
 session=scaleReferencePoint(session,base,{x:100,y:300}).session;expect(session.phase).toBe('targetEnd');
 const target={x:160,y:380};
 expect(scaleReferencePreview(session,base,target,'','mm')).toBe(10);
 expect(scaleReferencePoint(session,base,target).factor).toBe(10);
 const line:Shape={id:'line',type:'line',a:base,b:{x:20,y:20},color:'#abcdef'};
 const next=scaleSelection(documentOf('Dessin',[line]),['line'],base,10);
 expect(next.shapes[0].a).toEqual(base);expect(next.shapes[0].b).toEqual({x:110,y:20});
});

test('invalid lengths and coincident points preserve the current stage and document',()=>{
 const first=beginScaleReference();
 for(const value of ['0','-1','Infinity','NaN','abc'])expect(()=>scaleReferenceInput(first,value,'mm')).toThrow();
 expect(first.phase).toBe('reference');
 const second=scaleReferencePoint(first,base,base).session;
 expect(()=>scaleReferencePoint(second,base,base)).toThrow();expect(second.phase).toBe('referenceEnd');
 const length=scaleReferencePoint(second,base,{x:110,y:20}).session;
 expect(()=>scaleReferencePoint(length,base,base)).toThrow();expect(length.phase).toBe('length');
 expect(()=>scaleReferencePreview(second,base,{x:110,y:20},'','mm')).toThrow();
 const points=scaleReferenceInput(length,'P','mm').session;
 expect(()=>scaleReferenceInput(points,'10','mm')).toThrow();
 const end=scaleReferencePoint(points,base,{x:100,y:100}).session;
 expect(()=>scaleReferencePoint(end,base,{x:100,y:100})).toThrow();
});

test('Enter accepts remembered reference and target lengths and option names are normalized',()=>{
 const session=scaleReferenceInput(beginScaleReference(50,200),'','mm').session;
 expect(session.referenceLength).toBe(50);expect(scaleReferenceInput(session,'','mm').factor).toBe(4);
 for(const name of ['R','r','_Reference','Référence'])expect(['R','REFERENCE']).toContain(scaleOption(name));
 expect(scaleReferenceInput(session,'_Points','mm').session.phase).toBe('targetStart');
});

test('reference scaling works for mixed selections, copy mode and locked layer checks',()=>{
 const line:Shape={id:'line',type:'line',a:base,b:{x:20,y:20},color:'#abcdef',layerId:'0'};
 const doc=documentOf('Plan',[picture,line]);
 const session=scaleReferenceInput(beginScaleReference(),'10','mm').session;
 const factor=scaleReferenceInput(session,'20','mm').factor!;
 let id=0;const next=scaleSelection(doc,['plan','line'],base,factor,()=>String(++id));
 expect(next.shapes).toHaveLength(4);expect(next.shapes[0]).toBe(picture);expect(next.shapes[1]).toBe(line);
 expect(referenceSize(next.shapes[2] as ReferenceShape).width).toBe(400);
 const locked={...doc,layers:doc.layers.map(l=>({...l,locked:true}))};expect(()=>scaleSelection(locked,['plan','line'],base,factor)).toThrow();
});

test('SCALE exposes Reference, Points and a distinct instruction for each stage',()=>{
 const props={value:'',placeholder:'',onValue:()=>{},onSubmit:()=>{},onCancel:()=>{},onReference:()=>{},onPoints:()=>{},style:{},unit:'mm' as const};
 expect(renderToStaticMarkup(<ScaleEntry {...props} session={null}/>)).toContain('R — Référence');
 const length=scaleReferenceInput(beginScaleReference(),'100','mm').session;
 expect(renderToStaticMarkup(<ScaleEntry {...props} session={length}/>)).toContain('P — Points');
 const phases=['reference','referenceEnd','length','targetStart','targetEnd'] as const;
 const prompts=phases.map(phase=>scaleReferencePrompt({...length,phase}));expect(new Set(prompts).size).toBe(5);
 for(const phase of phases){const help=toolHelp({tool:'scale',hasSource:true,points:1,scaleReferencePhase:phase},'fr');expect(help.instruction.length).toBeGreaterThan(20);}
 const markup=renderToStaticMarkup(<svg><ScaleReferenceGuide session={length} base={base} pointer={{x:30,y:40}} scale={1}/></svg>);
 expect(markup).toContain('pointer-events="none"');expect(markup).toContain('<circle');expect(markup).toContain('<line');
});
