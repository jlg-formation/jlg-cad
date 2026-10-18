import {readFileSync} from 'node:fs';
import {expect,test} from 'bun:test';
import {renderToStaticMarkup} from 'react-dom/server';
import {unzipSync,strFromU8} from 'fflate';
import {documentOf,parseDrawing,newLayout,bounds,toDxf,type Drawing} from '../src/model';
import {makeReference,referenceSize,referenceLocal,referencePoint,referenceCorners,validReferenceClip,referenceSnap,orderDrawing,detachReference,replaceReference,type ReferenceSource,type ReferenceShape} from '../src/references';
import {transmitDrawing} from '../src/transmission';
import {mapItem,rotateShape,translateItem,snapPoint,offsetShape} from '../src/geometry';
import {objectGrips,moveGrip} from '../src/grips';
import {scaleSelection} from '../src/scale';
import {encodeClipboard,decodeClipboard,pasteClipboard} from '../src/clipboard';
import {ReferenceGraphic} from '../src/reference-graphic';
import {createPdf} from '../src/pdf';
import {extractPdfSnaps} from '../src/pdf-snaps';
import {beginAttach,attachPreview} from '../src/reference-session';

const png='data:image/png;base64,'+readFileSync(new URL('../public/logo.png',import.meta.url)).toString('base64');
const source:ReferenceSource={id:'source',kind:'image',name:'plan.png',loaded:true,data:png,pages:[{page:1,width:210,height:297,pixelWidth:1000,pixelHeight:1500,preview:png}]};
const image=()=>makeReference(source,source.pages[0],{x:100,y:200},10,0,'0','image');
const drawing=():Drawing=>({...documentOf('Église',[image()]),references:[source]});
function entities(text:string){const pairs=text.trimEnd().split(/\r?\n/),result:{type:string;values:[number,string][]}[]=[];for(let i=0;i<pairs.length;i+=2){const code=Number(pairs[i]),value=pairs[i+1];if(code===0)result.push({type:value,values:[]});else result.at(-1)?.values.push([code,value]);}return result;}
const value=(entity:ReturnType<typeof entities>[number],code:number)=>entity.values.find(p=>p[0]===code)?.[1];

test('native v11 roundtrip preserves sources and occurrences in model and paper, old documents migrate',()=>{
 const d=drawing(),layout=newLayout('layout','Feuille');layout.items=[{...image(),id:'paper'}];d.layouts=[layout];
 expect(parseDrawing(JSON.stringify(d))).toEqual(d);
 expect(parseDrawing(JSON.stringify({...documentOf('ancien',[]),version:10})).version).toBe(11);
 expect(()=>parseDrawing(JSON.stringify({...d,references:[]}))).toThrow();
 expect(()=>parseDrawing(JSON.stringify({...d,references:[source,{...source}]}))).toThrow();
 for(const patch of [{c:{x:NaN,y:0}},{fade:101},{clip:[{x:-1,y:0},{x:1,y:0},{x:1,y:1}]},{sourceId:'missing'},{page:2}])expect(()=>parseDrawing(JSON.stringify({...d,shapes:[{...image(),...patch}]}))).toThrow();
 expect(()=>parseDrawing(JSON.stringify({...d,references:[{...source,data:'data:text/html;base64,PHNjcmlwdD4='}]}))).toThrow();
});
test('bottom-left insertion, rotation, basis mapping and proportional grips preserve geometry',()=>{
 const s=image();expect(s.c).toEqual({x:100,y:200});expect(referenceSize(s)).toEqual({width:2100,height:2970});
 for(const p of [{x:0,y:0},{x:1,y:1},{x:.2,y:.6}])expect(referenceLocal(s,referencePoint(s,p))).toEqual(p);
 const moved=translateItem(s,30,40);expect(moved.c).toEqual({x:130,y:240});
 const turned=rotateShape(s,s.c,90) as ReferenceShape;expect(referenceSize(turned).width).toBeCloseTo(2100);expect(turned.c).toEqual(s.c);
 expect(bounds(turned).width).toBeCloseTo(2970);expect(bounds(turned).height).toBeCloseTo(2100);
 const grip=objectGrips(s).find(g=>g.key==='reference-size')!;
 const grown=moveGrip(s,grip.key,{x:s.a.x+(grip.point.x-s.a.x)*2,y:s.a.y+(grip.point.y-s.a.y)*2}) as ReferenceShape;
 expect(referenceSize(grown)).toEqual({width:4200,height:5940});
 const next=scaleSelection(drawing(),['image'],s.c,2);expect(referenceSize(next.shapes[0] as ReferenceShape).width).toBe(4200);
 expect(()=>scaleSelection({...drawing(),layers:drawing().layers.map(l=>({...l,locked:true}))},['image'],s.c,2)).toThrow();
});
test('clipping is normalized and follows transformations; raster boundaries never become object snaps',()=>{
 const s={...image(),clipEnabled:true,clip:[{x:.1,y:.2},{x:.8,y:.2},{x:.8,y:.9},{x:.1,y:.9}]};
 const moved=translateItem(s,10,20);expect(referenceCorners(moved)[0]).toEqual({x:referenceCorners(s)[0].x+10,y:referenceCorners(s)[0].y+20});
 expect(snapPoint(s.a,[s],1)).toBeNull();expect(()=>offsetShape(s,100,s.a)).toThrow();
});
test('copy/paste carries and deduplicates source bytes across drawings',()=>{
 const d=drawing(),clip=decodeClipboard(encodeClipboard(d,d.shapes));let index=0;
 const pasted=pasteClipboard(documentOf('cible',[]),clip,{x:10,y:20},()=>`copy-${++index}`);
 expect(pasted.references).toHaveLength(1);expect(pasted.shapes).toHaveLength(1);
 const again=pasteClipboard(pasted,clip,{x:30,y:40},()=>`copy-${++index}`);expect(again.references).toHaveLength(1);expect(again.shapes).toHaveLength(2);
 expect(parseDrawing(JSON.stringify(again))).toEqual(again);
});
test('detach removes all occurrences in all spaces and replace preserves placements and checks pages',()=>{
 const d=drawing();d.layouts=[{...newLayout('l','L'),items:[{...image(),id:'p'}]}];
 const next=replaceReference(d,'source',{...source,id:'other',name:'nouveau.png'});expect(next.shapes).toEqual(d.shapes);expect(next.references![0].id).toBe('source');
 expect(()=>replaceReference(d,'source',{...source,kind:'pdf'})).toThrow();expect(()=>replaceReference(d,'source',{...source,pages:[{...source.pages[0],page:2}]})).toThrow();
 const detached=detachReference(d,'source');expect(detached.references).toEqual([]);expect(detached.shapes).toEqual([]);expect(detached.layouts[0].items).toEqual([]);
});
test('ZIP includes unchanged sources with safe collision-free relative paths and no duplicate file per occurrence',()=>{
 const d=drawing();d.references!.push({...source,id:'source2',name:'../plan.PNG'});d.shapes.push({...image(),id:'second'},{...image(),id:'third',sourceId:'source2'});
 const result=transmitDrawing(d),files=unzipSync(result.bytes),paths=Object.keys(files);expect(paths.filter(p=>p.startsWith('references/'))).toHaveLength(2);expect(paths.every(p=>!p.includes('..')&&!p.includes('\\'))).toBe(true);
 expect(files['references/plan.png']).toEqual(Uint8Array.from(atob(png.split(',')[1]),c=>c.charCodeAt(0)));
 const dxf=strFromU8(files['Eglise.dxf']),items=entities(dxf);expect(items.filter(e=>e.type==='IMAGE')).toHaveLength(3);expect(items.filter(e=>e.type==='IMAGEDEF')).toHaveLength(2);expect(dxf).toContain('AC1024');expect(strFromU8(files['transmission.txt'])).toContain('Extraire tout le ZIP');
 const handles=items.filter(e=>e.type!=='SECTION'&&e.type!=='ENDSEC').flatMap(e=>e.values.filter(v=>v[0]===5).map(v=>v[1]));expect(new Set(handles).size).toBe(handles.length);
 for(const e of items.filter(e=>e.type==='IMAGE')){expect(items.some(d=>d.type==='IMAGEDEF'&&value(d,5)===value(e,340))).toBe(true);expect(items.some(d=>d.type==='IMAGEDEF_REACTOR'&&value(d,5)===value(e,360))).toBe(true);}
 expect(()=>toDxf(d.shapes)).toThrow();expect(toDxf([])).toContain('AC1018');
});
test('DXF image uses bottom-left insertion, pixel axes, clip and display flags; unloaded sources are still packaged',()=>{
 const d=drawing(),s={...image(),clipEnabled:true,clip:[{x:0,y:0},{x:.5,y:0},{x:.5,y:1},{x:0,y:1}],fade:30};d.shapes=[s];d.references=[{...source,loaded:false}];
 const result=transmitDrawing(d),imageEntity=entities(strFromU8(result.entries['Eglise.dxf'])).find(e=>e.type==='IMAGE')!;
 expect(value(imageEntity,10)).toBe('100');expect(value(imageEntity,20)).toBe('-200');expect(value(imageEntity,11)).toBe('2.1');expect(value(imageEntity,22)).toBe('1.98');expect(value(imageEntity,280)).toBe('1');expect(value(imageEntity,283)).toBe('30');expect(Number(value(imageEntity,70))&1).toBe(0);expect(Object.keys(result.entries)).toContain('references/plan.png');
});
test('PDF remains an original PDF with per-page native definitions, not raster image entities',()=>{
 const pdf:ReferenceSource={...source,id:'pdf',name:'eglise.pdf',kind:'pdf',data:'data:application/pdf;base64,JVBERi0xLjc=',pages:[{...source.pages[0],page:1},{...source.pages[0],page:2}]};
 const d={...documentOf('PDF',pdf.pages.map((p,i)=>makeReference(pdf,p,{x:i*300,y:0},2,30,'0',String(i)))),references:[pdf]};
 const result=transmitDrawing(d),items=entities(strFromU8(result.entries['PDF.dxf']));expect(items.filter(e=>e.type==='PDFUNDERLAY')).toHaveLength(2);expect(items.filter(e=>e.type==='PDFDEFINITION')).toHaveLength(2);expect(items.some(e=>e.type==='IMAGE')).toBe(false);expect(Object.keys(result.entries).filter(p=>p.endsWith('.pdf'))).toEqual(['references/eglise.pdf']);expect(items.filter(e=>e.type==='PDFDEFINITION').map(e=>value(e,2))).toEqual(['1','2']);expect(Number(value(items.find(e=>e.type==='PDFUNDERLAY')!,50))).toBeCloseTo(30);
});
test('rendering has inert image pixels and selectable frame; hidden/unloaded sources have no graphic',()=>{
 const s=image(),html=renderToStaticMarkup(<svg><ReferenceGraphic shape={s} source={source} selected/></svg>);expect(html).toContain('pointer-events="none"');expect(html).toContain('data-id="image"');expect(html).toContain('<image');
 expect(renderToStaticMarkup(<ReferenceGraphic shape={{...s,visible:false}} source={source}/>)).toBe('');expect(renderToStaticMarkup(<ReferenceGraphic shape={s} source={{...source,loaded:false}}/>)).toBe('');
 expect(orderDrawing([s,{...s,id:'front',front:true},{id:'line',type:'line',a:{x:0,y:0},b:{x:1,y:0},color:'#000000'}]).map(s=>s.id)).toEqual(['image','line','front']);
});
test('PDF export places referenced images under model annotations and clips them inside viewports',()=>{
 const d=drawing();d.layouts=[{...newLayout('l','Layout 1'),items:[{id:'v',type:'viewport',a:{x:10,y:10},b:{x:200,y:280},center:{x:1000,y:-1000},denominator:20,locked:false,printBorder:false,color:'#000000'}]}];
 const pdf=createPdf(d,d.layouts);const text=pdf.output();expect(text.includes('/Subtype /Image')).toBe(true);const content=pdf.internal.pages[1].join('\n');expect(content).toContain('/I0 Do');expect(content).toContain('W');
});
test('attachment preview respects numeric rotation, uniform scale and bottom-left pointer',()=>{
 const session=beginAttach(source,{pages:[1],point:{x:0,y:0},factor:10,angle:30,pointOnScreen:true,scaleOnScreen:false,rotationOnScreen:false},'preview');const s=attachPreview(session,{x:5,y:6},'0');expect(s.c).toEqual({x:5,y:6});expect(referenceSize(s).width).toBeCloseTo(2100);expect(Math.atan2(s.b.y-s.a.y,s.b.x-s.a.x)*180/Math.PI).toBeCloseTo(-30);
});
test('PDF vector paths provide transformed endpoints/midpoints, raster operators provide none, clip and toggles apply',()=>{
 const ops={save:10,restore:11,transform:12,constructPath:13,endPath:14,paintFormXObjectBegin:15,paintFormXObjectEnd:16};
 const snaps=extractPdfSnaps({fnArray:[10,12,13,11],argsArray:[[],[1,0,0,1,10,20],[99,[new Float32Array([0,0,0,1,20,0])],[]],[]]},ops,[1,0,0,-1,0,100],100,100);
 expect(snaps).toContainEqual({x:.1,y:.8,kind:'Extrémité'});expect(snaps).toContainEqual({x:.2,y:.8,kind:'Milieu'});
 expect(extractPdfSnaps({fnArray:[100],argsArray:[[]]},ops,[1,0,0,1,0,0],100,100)).toEqual([]);
 const pdf={...source,kind:'pdf' as const,pages:[{...source.pages[0],snaps}]},s={...image(),pdfSnap:true};const d={...drawing(),shapes:[s],references:[pdf]};const point=referencePoint(s,{x:.2,y:.8});expect(referenceSnap(d,point,1,['Milieu'])?.kind).toBe('Milieu');expect(referenceSnap({...d,shapes:[{...s,pdfSnap:false}]},point,1,['Milieu'])).toBeNull();expect(referenceSnap({...d,shapes:[{...s,clipEnabled:true,clip:[{x:0,y:0},{x:.1,y:0},{x:.1,y:.1}]}]},point,1,['Milieu'])).toBeNull();
});

test('clipping rejects zero-area and self-intersecting boundaries',()=>{
 expect(validReferenceClip([{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}])).toBe(true);
 expect(validReferenceClip([{x:0,y:0},{x:1,y:1},{x:1,y:0},{x:0,y:1}])).toBe(false);
 expect(validReferenceClip([{x:0,y:0},{x:.5,y:0},{x:1,y:0}])).toBe(false);
});
