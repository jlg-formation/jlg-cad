import {expect,test} from 'bun:test';
import {renderToStaticMarkup} from 'react-dom/server';
import {inflateSync} from 'node:zlib';
import {documentOf,newLayout,parseDrawing,bounds,paperSize,toDxf,type BlockShape,type TextItem,type Shape,type Viewport,type Dimension} from '../src/model';
import {importDxf} from '../src/dxf-import';
import {spaceDrawing,replaceSpaceDrawing,duplicateLayout,layoutTemplate} from '../src/paper-space';
import {addTitleBlock} from '../src/title-block';
import {createBlock,insertBlock,redefineBlock,explodeBlocks} from '../src/blocks';
import {synchronizeDrawing} from '../src/associations';
import {copySelection,encodeClipboard,decodeClipboard,pasteClipboard,moveSelectionObjects} from '../src/clipboard';
import {scaleSelection} from '../src/scale';
import {rotateSelection} from '../src/rotation';
import {BlockAttributes} from '../src/block-attributes';
import {createPdf} from '../src/pdf';
import {displayDistance,rectangleEndpoint} from '../src/drafting';
let n=0;const id=()=>`paper-test-${++n}`;
const model:Shape={id:'wall',type:'line',a:{x:0,y:0},b:{x:1000,y:0},color:'#17242a'};
const paperText:TextItem={id:'title',type:'text',a:{x:10,y:20},b:{x:10,y:20},height:3,text:'Titre',attribute:{tag:'TITLE',label:'Titre de la feuille'},color:'#17242a'};
const viewport:Viewport={id:'vp',type:'viewport',a:{x:10,y:10},b:{x:110,y:60},center:{x:500,y:0},denominator:100,locked:true,printBorder:false,color:'#17242a'};
const drawing=()=>documentOf('Maison',[model],[{...newLayout('p','Plan'),items:[viewport,paperText]},newLayout('q','Coupe')]);
const block=(s:Shape)=>s as BlockShape;
const contents=(s:Shape)=>block(s).entities.filter((e):e is TextItem=>e.type==='text').map(e=>e.text);

test('centimetre input is physical mm; changing presentation units preserves the sheet, print geometry and model',()=>{
 const doc=drawing();expect(doc.layouts[0].paperUnit).toBe('cm');
 const end=rectangleEndpoint({x:0,y:0},{x:1,y:1},'10','5','cm');expect(end).toEqual({x:100,y:50});
 const changed=parseDrawing(JSON.stringify({...doc,layouts:doc.layouts.map(l=>l.id==='p'?{...l,paperUnit:'mm'}:l)}));
 expect(changed.layouts[0].items).toEqual(doc.layouts[0].items);expect(changed.shapes).toEqual(doc.shapes);
 expect(paperSize(changed.layouts[0])).toEqual({x:297,y:210});expect(displayDistance(297,'cm')).toBe('29,7');
 expect(parseDrawing(JSON.stringify({...doc,version:12,layouts:doc.layouts.map(({paperUnit,...l})=>l)})).layouts[0].paperUnit).toBeUndefined();
 expect(()=>parseDrawing(JSON.stringify({...doc,layouts:[{...doc.layouts[0],paperUnit:'inch'}]}))).toThrow();
});

test('paper blocks, transformations, copy and explosion never alter model or other presentations',()=>{
 const doc=drawing();let next=replaceSpaceDrawing(doc,createBlock(spaceDrawing(doc,'p'),['title'],'Cartouche',{x:10,y:20},id),'p');
 const first=next.layouts[0].items.find(s=>s.type==='block')! as BlockShape;
 next=replaceSpaceDrawing(next,insertBlock(spaceDrawing(next,'p'),first.definitionId,{x:100,y:100},1,0,id),'p');
 next=replaceSpaceDrawing(next,moveSelectionObjects(spaceDrawing(next,'p'),[first.id],{x:0,y:0},{x:5,y:10}),'p');
 next=replaceSpaceDrawing(next,rotateSelection(spaceDrawing(next,'p'),[first.id],first.a,90),'p');
 next=replaceSpaceDrawing(next,scaleSelection(spaceDrawing(next,'p'),[first.id],first.a,2),'p');
 next=replaceSpaceDrawing(next,copySelection(spaceDrawing(next,'p'),[first.id],{x:0,y:0},{x:10,y:0},id,false),'p');
 next=replaceSpaceDrawing(next,explodeBlocks(spaceDrawing(next,'p'),[first.id],id),'p');
 expect(next.shapes).toEqual(doc.shapes);expect(next.layouts[1]).toEqual(doc.layouts[1]);expect(next.layouts[0].items[0]).toEqual(viewport);
 expect(next.layouts[0].items.filter(s=>s.type==='block')).toHaveLength(2);expect(()=>parseDrawing(JSON.stringify(next))).not.toThrow();
});

test('attributes belong to occurrences; shared graphical edits, clipboard and reload preserve their values',()=>{
 let doc=addTitleBlock(drawing(),'p',id);doc=addTitleBlock(doc,'q',id);
 doc=synchronizeDrawing({...doc,layouts:doc.layouts.map(l=>({...l,items:l.items.map(s=>s.type==='block'?{...s,attributes:{...s.attributes,TITRE:l.id==='p'?'Rez-de-chaussée':'Coupe AA'}}:s)}))});
 const first=doc.layouts[0].items.at(-1)! as BlockShape,second=doc.layouts[1].items.at(-1)!;
 expect(contents(first)).toContain('Rez-de-chaussée');expect(contents(second as Shape)).toContain('Coupe AA');expect(contents(first)).toContain('1:100');
 const definition=doc.blocks!.find(b=>b.id===first.definitionId)!;
 const edited=redefineBlock(doc,definition.id,definition.shapes.map(s=>s.type==='text'?{...s,height:s.height+1}:s));
 expect(contents(edited.layouts[0].items.at(-1)! as Shape)).toContain('Rez-de-chaussée');expect(contents(edited.layouts[1].items.at(-1)! as Shape)).toContain('Coupe AA');
 const pasted=pasteClipboard(documentOf('Autre',[]),decodeClipboard(encodeClipboard(spaceDrawing(doc,'p'),[first])),{x:0,y:0},id);
 expect(contents(pasted.shapes[0])).toContain('Rez-de-chaussée');expect(parseDrawing(JSON.stringify(edited))).toEqual(edited);
 const markup=renderToStaticMarkup(<BlockAttributes block={first} definition={definition} onChange={()=>{}}/>);expect(markup).toContain('Rez-de-chaussée');expect(markup).toContain('Attributs de cette insertion');
});

test('automatic scale fields track the current sheet, deduplicate scales and allow manual override',()=>{
 const doc=addTitleBlock(drawing(),'p',id),withViews={...doc,layouts:doc.layouts.map(l=>l.id==='p'?{...l,items:[...l.items,{...viewport,id:'detail',denominator:20},{...viewport,id:'same'}]}:l)};
 let resolved=synchronizeDrawing(withViews);const instance=resolved.layouts[0].items.find(s=>s.type==='block')!;
 expect(contents(instance as Shape)).toContain('1:20 · 1:100');
 resolved=synchronizeDrawing({...resolved,layouts:resolved.layouts.map(l=>({...l,items:l.items.map(s=>s.type==='block'?{...s,attributes:{...s.attributes,ECHELLES:'Voir chaque vue'}}:s)}))});
 expect(contents(resolved.layouts[0].items.find(s=>s.type==='block')! as Shape)).toContain('Voir chaque vue');
});

test('duplication remaps local links, retains model links and keeps attribute values independent',()=>{
 const dimension:Dimension={id:'dim',type:'dimension',a:{x:0,y:0},b:{x:10,y:0},offset:3,height:3,color:'#17242a',paperLink:{viewportId:'vp',model:{id:'model-dim',type:'dimension',a:model.a,b:model.b,offset:10,height:3,color:'#17242a',references:[{id:model.id,segment:0,point:0,feature:'a'},{id:model.id,segment:0,point:1,feature:'b'}]}}};
 let doc=addTitleBlock(drawing(),'p',id);doc=synchronizeDrawing({...doc,layouts:doc.layouts.map(l=>l.id==='p'?{...l,items:[...l.items,dimension]}:l)});
 const next=duplicateLayout(doc,'p',id),copy=next.layouts.at(-1)!,d=copy.items.find(s=>s.type==='dimension') as Dimension;
 expect(copy.id).not.toBe('p');expect(copy.name).toBe('Plan (copie)');expect(copy.paperUnit).toBe('cm');
 expect(d.paperLink!.viewportId).toBe(copy.items.find(s=>s.type==='viewport')!.id);expect(d.paperLink!.model.references![0].id).toBe(model.id);
 const template=layoutTemplate(next);expect(template.shapes).toEqual([]);expect(template.layouts.at(-1)!.items.some(s=>s.type==='dimension')).toBe(false);
 const paper=spaceDrawing(doc,'p'),copied=copySelection(paper,[paper.shapes.find(s=>s.type==='block')!.id],{x:0,y:0},{x:1,y:0},id,false);
 expect(()=>parseDrawing(JSON.stringify(replaceSpaceDrawing(doc,copied,'p')))).not.toThrow();
});

test('PDF retains A4 dimensions and the resolved title/scale values after changing input units',()=>{
 let doc=addTitleBlock(drawing(),'p',id);doc={...doc,layouts:[{...doc.layouts[0],paperUnit:'cm'}]};
 const pdf=createPdf(doc,doc.layouts),raw=pdf.output();
 expect(pdf.internal.pageSize.getWidth()).toBeCloseTo(297);expect(pdf.internal.pageSize.getHeight()).toBeCloseTo(210);
 const stream=inflateSync(Buffer.from(raw.match(/stream\n([\s\S]*?)\nendstream/)![1],'latin1')).toString('latin1');
 expect(stream).toContain('(1:100)');expect(stream).toContain('(Maison)');
 const mm=createPdf({...doc,layouts:doc.layouts.map(l=>({...l,paperUnit:'mm'}))},doc.layouts.map(l=>({...l,paperUnit:'mm'})));
 expect(mm.internal.pageSize.getWidth()).toBeCloseTo(297);expect(bounds(doc.layouts[0].items.at(-1)!)).toEqual(bounds(parseDrawing(JSON.stringify(doc)).layouts[0].items.at(-1)!));
});

test('static DXF export preserves distinct attribute values in repeated block occurrences',()=>{
 let doc=addTitleBlock(drawing(),'p',id);const first=doc.layouts[0].items.find(s=>s.type==='block')! as BlockShape;
 const second={...first,id:'other-title',attributes:{...first.attributes,TITRE:'Coupe AA'}};
 doc=synchronizeDrawing({...doc,shapes:[first,second]});
 const result=importDxf(toDxf(doc.shapes,doc.layers,'mm',doc.blocks),'Cartouches').drawing;
 expect(result.shapes).toHaveLength(2);expect(contents(result.shapes[0])).toContain('Plan');expect(contents(result.shapes[1])).toContain('Coupe AA');
});

test('native input rejects duplicate attribute tags and malformed per-instance values',()=>{
 const doc=addTitleBlock(drawing(),'p',id),definition=doc.blocks![0];
 expect(()=>redefineBlock(doc,definition.id,[paperText,{...paperText,id:'second'}])).toThrow('uniques');
 expect(()=>parseDrawing(JSON.stringify({...doc,layouts:doc.layouts.map(l=>({...l,items:l.items.map(s=>s.type==='block'?{...s,attributes:{TITRE:42}}:s)}))}))).toThrow();
});
