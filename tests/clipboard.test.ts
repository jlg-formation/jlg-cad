import {expect,test} from 'bun:test';
import {moveSelectionObjects,copySelection,selectedCopyIds,encodeClipboard,decodeClipboard,pasteClipboard} from '../src/clipboard';
import {documentOf,type Shape} from '../src/model';
const shape:Shape={id:'old',type:'bezier',a:{x:10,y:20},b:{x:40,y:50},color:'#abcdef',layerId:'murs',closed:false,nodes:[{p:{x:10,y:20},out:{x:15,y:25}},{p:{x:40,y:50},in:{x:35,y:45}}]};
test('Copier reprend le clic, le lasso à un objet et la sélection multiple',()=>{
 const other:Shape={id:'line',type:'line',a:{x:0,y:0},b:{x:0,y:10000},color:'#ffffff'};
 const doc=documentOf('Plan',[shape,other]);
 expect(selectedCopyIds(doc,[],other.id)).toEqual([other.id]);
 expect(selectedCopyIds(doc,[other.id],null)).toEqual([other.id]);
 expect(selectedCopyIds(doc,[shape.id,other.id],null)).toEqual([shape.id,other.id]);
 expect(selectedCopyIds(doc,[],null)).toEqual([]);
 let n=0;const makeId=()=>`copy-${++n}`,base={x:70,y:90};
 const next=copySelection(doc,selectedCopyIds(doc,[shape.id,other.id],null),base,{x:570,y:90},makeId);
 expect(next.shapes).toHaveLength(4);expect(next.shapes[2].a).toEqual({x:510,y:20});expect(next.shapes[3].a).toEqual({x:500,y:0});
 const again=copySelection(next,[shape.id,other.id],base,{x:1070,y:90},makeId);
 expect(again.shapes[5].a).toEqual({x:1000,y:0});expect(doc.shapes).toEqual([shape,other]);
 doc.layers.find(l=>l.id==='murs')!.locked=true;
 expect(()=>copySelection(doc,[shape.id,other.id],base,{x:570,y:90},makeId)).toThrow('verrouillé');
});
test('échange texte autonome, déplacement des poignées, identifiants et collage répété',()=>{
 const source=documentOf('A',[shape]),data=decodeClipboard(encodeClipboard(source,[shape]));let n=0;const id=()=>`new-${++n}`;
 const target=documentOf('B',[]),next=pasteClipboard(target,data,{x:100,y:200},id);
 const pasted=next.shapes[0];expect(pasted.id).not.toBe(shape.id);expect(pasted.a).toEqual({x:100,y:200});
 if(pasted.type!=='bezier')throw new Error('Type perdu');expect(pasted.nodes[0].out).toEqual({x:105,y:205});expect(pasted.layerId).toBe('murs');
 expect(pasteClipboard(next,data,{x:100,y:200},id).shapes).toHaveLength(2);expect(source.shapes[0]).toEqual(shape);expect(target.shapes).toHaveLength(0);
});
test('conflits de calques : crée un calque visible et déverrouillé sans changer la destination',()=>{
 const source=documentOf('A',[shape]),target=documentOf('B',[]);target.layers[1].locked=true;
 let n=0;const next=pasteClipboard(target,decodeClipboard(encodeClipboard(source,[shape])),{x:0,y:0},()=>`id-${++n}`);
 const layer=next.layers.find(l=>l.id===next.shapes[0].layerId)!;expect(layer.name).toBe('Murs (2)');expect(layer.locked).toBe(false);expect(target.layers[1].locked).toBe(true);
});
test('refuse les versions inconnues, copies invalides et coordonnées hors limites',()=>{
 const doc=documentOf('A',[shape]),text=encodeClipboard(doc,[shape]);expect(()=>decodeClipboard(text.replace('"version":1','"version":99'))).toThrow();
 expect(()=>decodeClipboard('{}')).toThrow();expect(()=>encodeClipboard(doc,[])).toThrow();
 let n=0;expect(()=>pasteClipboard(doc,decodeClipboard(text),{x:1e8,y:0},()=>`id-${++n}`)).toThrow();
});

test('copie avec point de base explicite conserve le décalage des objets',()=>{
 const data=decodeClipboard(encodeClipboard(documentOf('A',[shape]),[shape],{x:0,y:0}));
 expect(data.base).toEqual({x:0,y:0});let n=0;
 const pasted=pasteClipboard(documentOf('B',[]),data,{x:100,y:200},()=>`base-${++n}`).shapes[0];
 expect(pasted.a).toEqual({x:110,y:220});
});

 test('Déplacer une sélection conserve identifiants, calques et objets hors sélection sans modifier le document initial',()=>{
 const other:Shape={id:'other',type:'line',a:{x:0,y:0},b:{x:100,y:0},color:'#fff'};
 const untouched:Shape={...other,id:'untouched'};
 const doc=documentOf('Plan',[shape,other,untouched]);
 const next=moveSelectionObjects(doc,[shape.id,other.id],{x:70,y:90},{x:570,y:-110});
 expect(next.shapes).toHaveLength(3);
 expect(next.shapes[0]).toMatchObject({id:shape.id,layerId:shape.layerId,a:{x:510,y:-180}});
 expect(next.shapes[1].a).toEqual({x:500,y:-200});expect(next.shapes[2]).toBe(untouched);
 if(next.shapes[0].type!=='bezier')throw new Error('Type perdu');
 expect(next.shapes[0].nodes[0].out).toEqual({x:515,y:-175});
 expect(doc.shapes).toEqual([shape,other,untouched]);
 doc.layers.find(l=>l.id==='murs')!.locked=true;
 expect(()=>moveSelectionObjects(doc,[other.id,shape.id],{x:0,y:0},{x:100,y:0})).toThrow('verrouillé');
 expect(doc.shapes[1]).toBe(other);
 expect(()=>moveSelectionObjects(doc,[],{x:0,y:0},{x:100,y:0})).toThrow();
 });
