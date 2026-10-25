import {expect,test} from 'bun:test';
import {renderToStaticMarkup} from 'react-dom/server';
import {documentOf,parseDrawing,toDxf,newLayout,defaultLayers,type Shape} from '../src/model';
import {appearance,onLayer,usedLayer,printable} from '../src/layers';
import {importDxf} from '../src/dxf-import';
import {ObjectAppearance,LayerSelect} from '../src/layers-ui';
import {createPdf} from '../src/pdf';
import {encodeClipboard,decodeClipboard,pasteClipboard} from '../src/clipboard';
import {segments,shapeFromSegments} from '../src/geometry';
import {joinItems} from '../src/join';

const line:Shape={id:'l',type:'line',a:{x:10,y:10},b:{x:80,y:30},color:'#abcdef',colorByLayer:true,layerId:'epais'};

test('six presets plus layer 0, with the agreed paper widths and colors',()=>{
 const layers=defaultLayers();expect(layers.map(l=>l.name)).toEqual(['0','Très épais','Épais','Moyen','Fin','Très fin','Ultra fin']);
 expect(layers.slice(1).map(l=>l.color)).toEqual(['#ffffff','#ff0000','#ffff00','#00ff00','#00ffff','#ff00ff']);
 expect(layers.slice(1).map(l=>l.lineweight)).toEqual([.7,.5,.35,.18,.09,.05]);
 expect(layers.every(l=>l.visible&&!l.locked&&l.printable&&l.transparency===0)).toBe(true);
});
test('live inheritance, individual overrides, and changing layers resets every override',()=>{
 const doc=documentOf('x',[line]);doc.layers[2]={...doc.layers[2],linetype:'DASHED',transparency:40};
 expect(appearance(line,doc.layers)).toEqual({color:'#ff0000',lineweight:.5,linetype:'DASHED',transparency:40});
 const custom={...line,colorByLayer:false,lineweight:.09,color:'#112233',linetype:'CENTER' as const,transparency:10};
 expect(appearance(custom,doc.layers).color).toBe('#112233');
 const changed=onLayer(custom,'fin');expect(appearance(changed,doc.layers)).toEqual({color:'#00ff00',lineweight:.18,linetype:'CONTINUOUS',transparency:0});
 doc.layers[4].color='#123456';expect(appearance(changed,doc.layers).color).toBe('#123456');
 expect(appearance({...line,colorByLayer:undefined},doc.layers).color).toBe('#abcdef');
});
test('native roundtrip, old documents and invalid appearance values',()=>{
 const doc=documentOf('x',[{...line,linetype:'CENTER',transparency:25}]);doc.layers[2].description='Murs extérieurs';
 expect(parseDrawing(JSON.stringify(doc))).toEqual(doc);
 const old={...doc,version:11,shapes:[{...line,colorByLayer:undefined}],layers:[{id:'0',name:'Dessin',color:'#ffffff',visible:true,locked:false},{id:'epais',name:'Murs',color:'#ff0000',visible:true,locked:false}]};
 expect(appearance(parseDrawing(JSON.stringify(old)).shapes[0],old.layers).color).toBe('#abcdef');
 expect(parseDrawing(JSON.stringify({...old,version:2})).layers.some(l=>l.id==='murs')).toBe(true);
 for(const patch of [{transparency:101},{lineweight:-1},{linetype:'BAD'},{colorByLayer:'yes'}])expect(()=>parseDrawing(JSON.stringify({...doc,shapes:[{...line,...patch}]}))).toThrow();
 for(const patch of [{printable:'yes'},{transparency:-1},{description:42}])expect(()=>parseDrawing(JSON.stringify({...doc,layers:doc.layers.map(l=>l.id==='epais'?{...l,...patch}:l)}))).toThrow();
});
test('layer deletion protects paper objects and unused block definitions as well as model objects',()=>{
 const doc=documentOf('x',[]),layout=newLayout('p','Feuille');layout.items=[line];doc.layouts=[layout];
 expect(usedLayer(doc,'epais')).toBe(true);doc.layouts=[];doc.blocks=[{id:'b',name:'Bloc',shapes:[line]}];expect(usedLayer(doc,'epais')).toBe(true);
 doc.blocks=[];expect(usedLayer(doc,'epais')).toBe(false);
});
test('DXF preserves layer names, nine properties and object inheritance or exceptions',()=>{
 const doc=documentOf('x',[line,{...line,id:'custom',colorByLayer:false,linetype:'DOTTED',lineweight:.09,transparency:20}]);
 doc.layers[2]={...doc.layers[2],linetype:'CENTER',transparency:50,description:'Façades et murs',printable:false,locked:true};
 const dxf=toDxf(doc.shapes,doc.layers),imported=importDxf(dxf,'x').drawing,layer=imported.layers.find(l=>l.name==='Épais')!;
 expect(layer).toMatchObject({color:'#ff0000',linetype:'CENTER',lineweight:.5,printable:false,locked:true,description:'Façades et murs'});expect(layer.transparency).toBeCloseTo(50,0);
 expect(imported.shapes[0]).toMatchObject({colorByLayer:true});expect(imported.shapes[0].lineweight).toBeUndefined();
 expect(appearance(imported.shapes[0],imported.layers).color).toBe('#ff0000');
 expect(imported.shapes[1]).toMatchObject({colorByLayer:false,color:'#abcdef',linetype:'DOTTED',lineweight:.09,transparency:20});
 expect(dxf).toContain('AcCmTransparency');expect(dxf).toContain('BYLAYER');
});
test('PDF filters non-printing model and paper layers and resolves widths and transparency',()=>{
 const doc=documentOf('x',[line]),layout=newLayout('p','Feuille');layout.monochrome=false;
 layout.items=[{id:'v',type:'viewport',a:{x:0,y:0},b:{x:200,y:150},center:{x:0,y:0},denominator:1,color:'#ffffff',locked:false,printBorder:false},{...line,id:'paper',type:'text',text:'VISIBLE',height:4},{...line,id:'secret',type:'text',text:'SECRET',height:4,layerId:'fin'}];
 doc.layers[4].printable=false;doc.layers[2].transparency=40;doc.layers[2].linetype='DASHED';doc.layouts=[layout];
 expect(printable(layout.items[2],doc.layers)).toBe(false);
 const pdf=createPdf(doc,[layout]),commands=pdf.internal.pages.flat().join('\n');
 expect(commands).toContain('VISIBLE');expect(commands).not.toContain('SECRET');expect(commands).toContain('1.4173228346456694 w');expect(commands).toContain('/GS');
 doc.layers[2].printable=false;expect(createPdf(doc,[layout]).internal.pages.flat().join('\n')).not.toContain('VISIBLE');
});
test('clipboard does not merge identically named layers with different print properties',()=>{
 const source=documentOf('a',[line]),target=documentOf('b',[]);target.layers[2].printable=false;let i=0;
 const pasted=pasteClipboard(target,decodeClipboard(encodeClipboard(source,[line])),{x:0,y:0},()=>String(++i));
 expect(pasted.shapes[0].layerId).not.toBe('epais');expect(pasted.layers.find(l=>l.id===pasted.shapes[0].layerId)?.printable).toBe(true);
});
test('compact layer selector and object editor expose inherited properties',()=>{
 const doc=documentOf('x',[line]);const html=renderToStaticMarkup(<ObjectAppearance doc={doc} shape={line} onChange={()=>{}}/>);
 expect(html).toContain('Calque de l’objet');expect(html).toContain('Du calque');expect(html).toContain('Source de l’épaisseur');
 expect(renderToStaticMarkup(<LayerSelect doc={doc} value="epais" onChange={()=>{}}/>)).toContain('Calque courant');
});
test('geometry reconstruction and joining arcs preserve inheritance and individual exceptions',()=>{
 const source:Shape={...line,type:'arc',bulge:1,linetype:'CENTER',lineweight:.18,transparency:25};
 const rebuilt=shapeFromSegments({...line,type:'circle'},segments(source));
 expect(rebuilt.colorByLayer).toBe(true);
 const joined=joinItems([source],[source.id],source.id,true).items[0];
 expect(joined).toMatchObject({type:'circle',colorByLayer:true,linetype:'CENTER',lineweight:.18,transparency:25});
});
